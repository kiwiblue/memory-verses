import { json } from '../_helpers.js';

// Truncate an email server-side so full addresses never leave the server —
// keeps them private even if the admin page/token is compromised, while still
// showing enough (first 3 chars + TLD) to tell testers from real users.
// e.g. info@evangelism.com.au -> "inf•••@•••.au"
function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '—';
  const [local, domain] = email.split('@');
  const localMask = local.slice(0, 3) + '•••';
  const dot = domain.lastIndexOf('.');
  const tld = dot >= 0 ? domain.slice(dot) : '';
  return `${localMask}@•••${tld}`;
}

function groupBy(rows) {
  const out = {};
  for (const row of rows ?? []) {
    out[row.v ?? 'null'] = row.c;
  }
  return out;
}

function avgErrors(rows) {
  let totalErrors = 0;
  let totalExercises = 0;
  for (const row of rows ?? []) {
    const errors = parseInt(row.errors, 10);
    const count = row.c ?? 0;
    if (!isNaN(errors)) {
      totalErrors += errors * count;
      totalExercises += count;
    }
  }
  return totalExercises > 0
    ? Math.round((totalErrors / totalExercises) * 100) / 100
    : 0;
}

export async function onRequestGet({ request, env }) {
  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!env.ADMIN_PASSWORD || token !== env.ADMIN_PASSWORD) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const cutoffs = {
    today: now - 86400,
    week:  now - 604800,
    month: now - 2592000,
    year:  now - 31536000,
  };

  // Batch 1: simple aggregate queries (no progress_json rows needed here)
  const [
    batchResults,
    progressRows,
    feedbackRows,
    feedbackCount,
    feedbackByType,
    activeToday,
    activeWeek,
    activeMonth,
    activeYear,
    emailRows,
  ] = await Promise.all([
    env.DB.batch([
      env.DB.prepare('SELECT COUNT(*) as count FROM accounts'),
      env.DB.prepare('SELECT COUNT(*) as count FROM cloud_profiles'),
      env.DB.prepare("SELECT json_extract(profile_json,'$.bracket') as v, COUNT(*) as c FROM cloud_profiles GROUP BY v"),
      env.DB.prepare("SELECT json_extract(profile_json,'$.translation') as v, COUNT(*) as c FROM cloud_profiles GROUP BY v"),
      env.DB.prepare("SELECT json_extract(profile_json,'$.colour') as v, COUNT(*) as c FROM cloud_profiles GROUP BY v"),
      env.DB.prepare("SELECT json_extract(profile_json,'$.pattern') as v, COUNT(*) as c FROM cloud_profiles GROUP BY v"),
      env.DB.prepare('SELECT SUM(json_array_length(custom_json)) as total FROM cloud_profiles'),
      env.DB.prepare('SELECT event_type, COUNT(*) as c FROM events GROUP BY event_type'),
      env.DB.prepare('SELECT COUNT(*) as c FROM events WHERE event_type=\'exercise_complete\''),
      env.DB.prepare("SELECT json_extract(payload,'$.type') as t, COUNT(*) as c FROM events WHERE event_type='exercise_complete' GROUP BY t"),
      env.DB.prepare("SELECT json_extract(payload,'$.errors') as errors, COUNT(*) as c FROM events WHERE event_type='exercise_complete' GROUP BY errors"),
      env.DB.prepare("SELECT json_extract(payload,'$.step') as step, COUNT(*) as c FROM events WHERE event_type='onboarding_step_complete' GROUP BY step"),
    ]),
    env.DB.prepare('SELECT progress_json FROM cloud_profiles').all(),
    env.DB.prepare('SELECT f.id, f.type, f.message, f.ts, a.email FROM feedback f LEFT JOIN accounts a ON a.id = f.account_id ORDER BY f.ts DESC LIMIT 50').all(),
    env.DB.prepare('SELECT COUNT(*) as c FROM feedback').first(),
    env.DB.prepare('SELECT type as v, COUNT(*) as c FROM feedback GROUP BY type').all(),
    env.DB.prepare("SELECT COUNT(DISTINCT session_id) as c FROM events WHERE event_type='session_start' AND ts > ?").bind(cutoffs.today).first(),
    env.DB.prepare("SELECT COUNT(DISTINCT session_id) as c FROM events WHERE event_type='session_start' AND ts > ?").bind(cutoffs.week).first(),
    env.DB.prepare("SELECT COUNT(DISTINCT session_id) as c FROM events WHERE event_type='session_start' AND ts > ?").bind(cutoffs.month).first(),
    env.DB.prepare("SELECT COUNT(DISTINCT session_id) as c FROM events WHERE event_type='session_start' AND ts > ?").bind(cutoffs.year).first(),
    env.DB.prepare('SELECT email, created_at FROM accounts ORDER BY created_at DESC LIMIT 200').all(),
  ]);

  // Destructure batch results
  const [
    accountsResult,
    profilesResult,
    byBracketResult,
    byTranslationResult,
    byColourResult,
    byPatternResult,
    customVersesResult,
    eventsByTypeResult,
    exercisesCompletedResult,
    exercisesByTypeResult,
    errorDistResult,
    onboardingFunnelResult,
  ] = batchResults;

  // Parse progress_json rows in JS
  let totalLearning = 0;
  let totalMastered = 0;
  const profileCount = progressRows.results?.length ?? 0;

  for (const row of progressRows.results ?? []) {
    try {
      const progress = JSON.parse(row.progress_json ?? '{}');
      // progress_json is expected to be an object keyed by verse id,
      // each entry having a 'status' field: 'learning', 'mastered', or 'unseen'
      for (const entry of Object.values(progress)) {
        const status = entry?.status ?? entry;
        if (status === 'learning')  totalLearning++;
        if (status === 'mastered')  totalMastered++;
      }
    } catch {
      // skip malformed rows
    }
  }

  // events.by_type — keyed by event_type (different shape from groupBy)
  const byType = {};
  for (const row of eventsByTypeResult.results ?? []) {
    byType[row.event_type] = row.c;
  }

  // exercises by type keyed by t
  const exercisesByType = {};
  for (const row of exercisesByTypeResult.results ?? []) {
    exercisesByType[row.t ?? 'null'] = row.c;
  }

  // onboarding funnel keyed by step
  const onboardingFunnel = {};
  for (const row of onboardingFunnelResult.results ?? []) {
    onboardingFunnel[row.step ?? 'null'] = row.c;
  }

  return json({
    generated_at: now,
    users: {
      registered:      accountsResult.results?.[0]?.count ?? 0,
      synced_profiles: profilesResult.results?.[0]?.count ?? 0,
      by_bracket:      groupBy(byBracketResult.results),
      by_translation:  groupBy(byTranslationResult.results),
      by_colour:       groupBy(byColourResult.results),
      by_pattern:      groupBy(byPatternResult.results),
      registered_emails: (emailRows.results ?? []).map(r => ({
        email: maskEmail(r.email),
        created_at: r.created_at,
      })),
    },
    progress: {
      total_learning:           totalLearning,
      total_mastered:           totalMastered,
      total_custom_verses:      customVersesResult.results?.[0]?.total ?? 0,
      avg_learning_per_profile: profileCount > 0
        ? Math.round((totalLearning / profileCount) * 100) / 100
        : 0,
      avg_mastered_per_profile: profileCount > 0
        ? Math.round((totalMastered / profileCount) * 100) / 100
        : 0,
    },
    events: {
      by_type:               byType,
      active_today:          activeToday?.c  ?? 0,
      active_week:           activeWeek?.c   ?? 0,
      active_month:          activeMonth?.c  ?? 0,
      active_year:           activeYear?.c   ?? 0,
      exercises_completed:   exercisesCompletedResult.results?.[0]?.c ?? 0,
      exercises_by_type:     exercisesByType,
      avg_errors_per_exercise: avgErrors(errorDistResult.results),
      onboarding_funnel:     onboardingFunnel,
    },
    feedback: {
      total:    feedbackCount?.c ?? 0,
      by_type:  groupBy(feedbackByType?.results),
      // Mask submitter emails server-side too (was exposing full addresses).
      recent:   (feedbackRows?.results ?? []).map(r => ({ ...r, email: maskEmail(r.email) })),
    },
  });
}
