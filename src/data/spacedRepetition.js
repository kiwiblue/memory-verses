const DAY = 24 * 60 * 60 * 1000;

// Interval in days per consecutive-correct streak
const INTERVALS = [1, 3, 7, 14, 30];

function correctStreak(scores) {
  let streak = 0;
  for (let i = scores.length - 1; i >= 0; i--) {
    if (scores[i] === 1) streak++;
    else break;
  }
  return streak;
}

// score: 1 = Know it, 0 = Still learning
export function recordAttempt(entry, score) {
  const scores = [...(entry.scores || []), score].slice(-10);
  const seen_count = (entry.seen_count || 0) + 1;
  const last_seen = Date.now();

  let intervalDays;
  if (score === 0) {
    intervalDays = 1; // failed: try again tomorrow
  } else {
    const streak = correctStreak(scores);
    intervalDays = INTERVALS[Math.min(streak - 1, INTERVALS.length - 1)];
  }

  const next_review = last_seen + intervalDays * DAY;

  // Status: mastered = 3+ correct in a row and seen at least 3 times
  const streak = correctStreak(scores);
  const status = streak >= 3 && seen_count >= 3 ? 'mastered'
               : seen_count > 0                 ? 'learning'
               :                                  'unseen';

  return { status, seen_count, last_seen, scores, next_review };
}

// Which verse brackets a user can see
const BRACKET_ACCESS = {
  child: ['child'],
  youth: ['child', 'youth'],
  adult: ['child', 'youth', 'adult'],
};

export function buildDailyQueue(verses, progress, userBracket = 'adult') {
  const allowed = BRACKET_ACCESS[userBracket] || BRACKET_ACCESS.adult;
  const now = Date.now();

  const eligible = verses.filter(v => allowed.includes(v.bracket || 'child'));

  // Due for review (seen before, next_review is in the past)
  const due = eligible
    .filter(v => {
      const e = progress[v.id];
      return e && e.status !== 'unseen' && e.next_review && e.next_review <= now;
    })
    .sort((a, b) => (progress[a.id].next_review || 0) - (progress[b.id].next_review || 0))
    .slice(0, 15);

  // New verses (never seen), ordered by sort_order
  const seen = new Set(due.map(v => v.id));
  const newVerses = eligible
    .filter(v => {
      if (seen.has(v.id)) return false;
      const e = progress[v.id];
      return !e || e.status === 'unseen';
    })
    .slice(0, 5);

  return [...due, ...newVerses];
}

// Skill level for a verse based on attempt history and recency.
//
// Base level (from recent scores):
//   0–1 correct of last 5  → beginner
//   2–3 correct of last 5  → intermediate
//   4–5 correct of last 5  → advanced
//
// Recency adjustments:
//   Practiced within 5 min → bump up one level (harder exercise on immediate repeat)
//   Gap > 30 days          → drop to beginner (ease them back in)
//   Gap 8–30 days          → drop advanced → intermediate
export function getSkillLevel(entry) {
  if (!entry || (entry.seen_count || 0) < 3) return 'beginner';

  const recent = (entry.scores || []).slice(-5);
  const correct = recent.filter(s => s === 1).length;
  const msSinceLast = entry.last_seen ? Date.now() - entry.last_seen : Infinity;
  const daysSinceLast = msSinceLast / DAY;

  let level;
  if (correct >= 4) level = 'advanced';
  else if (correct >= 2) level = 'intermediate';
  else level = 'beginner';

  // Just practiced — bump up so repeating immediately gives a harder exercise
  if (msSinceLast < 5 * 60 * 1000) {
    if (level === 'beginner') level = 'intermediate';
    else if (level === 'intermediate') level = 'advanced';
  }
  // Long gap — ease back in
  else if (daysSinceLast > 30) {
    level = 'beginner';
  } else if (daysSinceLast > 7 && level === 'advanced') {
    level = 'intermediate';
  }

  return level;
}

// Up to `limit` most-urgent verses due for revision (learning or mastered, most overdue first)
export function buildReviseQueue(verses, progress, userBracket = 'adult', limit = 5) {
  const allowed = BRACKET_ACCESS[userBracket] || BRACKET_ACCESS.adult;
  return verses
    .filter(v => {
      if (!allowed.includes(v.bracket || 'child')) return false;
      const s = progress[v.id]?.status;
      return s === 'learning' || s === 'mastered';
    })
    .sort((a, b) => (progress[a.id]?.next_review || 0) - (progress[b.id]?.next_review || 0))
    .slice(0, limit);
}

// Summary stats for the progress pills
export function progressStats(verses, progress, userBracket = 'adult') {
  const allowed = BRACKET_ACCESS[userBracket] || BRACKET_ACCESS.adult;
  const eligible = verses.filter(v => allowed.includes(v.bracket || 'child'));

  let unseen = 0, learning = 0, mastered = 0;
  for (const v of eligible) {
    const status = progress[v.id]?.status || 'unseen';
    if (status === 'mastered') mastered++;
    else if (status === 'learning') learning++;
    else unseen++;
  }
  return { unseen, learning, mastered };
}
