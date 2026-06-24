const DAY = 24 * 60 * 60 * 1000;

// ── Tunable algorithm config ──────────────────────────────────────────────────
// Adjust these numbers to tune skill progression and revise ordering.

export const SKILL_CONFIG = {
  errorsPerHint:   3,   // N wrong answers counts as 1 hint equivalent
  perfectHintMax:  0,   // hintScore ≤ this = perfect attempt
  goodHintMax:     2,   // hintScore ≤ this (and > perfectHintMax) = good attempt
  gapDays:         7,   // good recall after this many days away → promote
  historyLookback: 3,   // consecutive perfect attempts → auto-promote regardless of gap
};

export const REVISE_CONFIG = {
  coolOffMinutes: 30,   // verse practiced within this window → deprioritized
  coolOffDays:     7,   // days added to effective next_review during coolOff
  maxQueueSize:   10,   // max verses in Today's Exercises queue
};

// Next-review schedule (days out) by skill level × quality of attempt
const REVIEW_DAYS = {
  easy:     { perfect: 3,  good: 1,  poor: 1 },
  moderate: { perfect: 7,  good: 3,  poor: 1 },
  hard:     { perfect: 14, good: 7,  poor: 2 },
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function promoteLevel(level) {
  if (level === 'easy')     return 'moderate';
  if (level === 'moderate') return 'hard';
  return 'hard';
}

function demoteLevel(level) {
  if (level === 'hard')     return 'moderate';
  if (level === 'moderate') return 'easy';
  return 'easy';
}

function correctStreak(scores) {
  let streak = 0;
  for (let i = scores.length - 1; i >= 0; i--) {
    if (scores[i] === 1) streak++;
    else break;
  }
  return streak;
}

// ── Public skill helpers ──────────────────────────────────────────────────────

// Convert raw hint button presses + wrong answers into a single struggle score
export function computeHintScore(hints, errors) {
  return (hints || 0) + Math.floor((errors || 0) / SKILL_CONFIG.errorsPerHint);
}

// Determine the new skill level after a revise attempt.
// recentAttempts: array of { hintScore } objects from prior attempts (oldest first)
export function computeNextSkillLevel(currentLevel, hintScore, daysSinceLast, recentAttempts) {
  const { perfectHintMax, goodHintMax, gapDays, historyLookback } = SKILL_CONFIG;

  // History override: last N attempts all perfect → auto-promote
  if (recentAttempts.length >= historyLookback) {
    const recent = recentAttempts.slice(-historyLookback);
    if (recent.every(a => (a.hintScore ?? 0) <= perfectHintMax)) {
      return promoteLevel(currentLevel);
    }
  }

  if (hintScore <= perfectHintMax) {
    return promoteLevel(currentLevel);         // perfect → always promote
  }

  if (hintScore <= goodHintMax) {
    return daysSinceLast >= gapDays
      ? promoteLevel(currentLevel)             // remembered after a week → promote
      : currentLevel;                          // good but too recent → stay
  }

  // Struggling (hintScore > goodHintMax)
  if (daysSinceLast < 1 && currentLevel !== 'easy') {
    return demoteLevel(currentLevel);          // same-day struggle → drop one level
  }
  return currentLevel;                         // struggling but not same-day → stay
}

// Read the stored skill level; falls back to 'easy' for legacy entries
export function getSkillLevel(entry) {
  return entry?.skill_level || 'easy';
}

// ── Progress record helpers ───────────────────────────────────────────────────

// "I've got it for now" — move verse to Revise at easy level, due immediately
export function startRevising(entry) {
  const now = Date.now();
  return {
    ...entry,
    status: 'learning',
    skill_level: 'easy',
    next_review: now,
    last_seen: now,
  };
}

// Record a completed revise attempt: update skill level and schedule next review
export function recordReviseAttempt(entry, newSkillLevel, hintScore) {
  const now = Date.now();
  const { perfectHintMax, goodHintMax } = SKILL_CONFIG;
  const quality = hintScore <= perfectHintMax ? 'perfect'
                : hintScore <= goodHintMax    ? 'good'
                :                              'poor';
  const days = REVIEW_DAYS[newSkillLevel]?.[quality] ?? 1;
  const attempts = [...(entry.attempts || []), { hintScore, ts: now }].slice(-10);

  return {
    ...entry,
    status: 'learning',
    skill_level: newSkillLevel,
    seen_count: (entry.seen_count || 0) + 1,
    last_seen: now,
    next_review: now + days * DAY,
    attempts,
    // Keep scores for backwards-compat with stats rings
    scores: [...(entry.scores || []), hintScore <= goodHintMax ? 1 : 0].slice(-10),
  };
}

// Legacy: kept for backwards compat, no longer used by the main flows
export function recordAttempt(entry, score) {
  const scores = [...(entry.scores || []), score].slice(-10);
  const seen_count = (entry.seen_count || 0) + 1;
  const last_seen = Date.now();
  const intervalDays = score === 0 ? 1 : [1, 3, 7, 14, 30][Math.min(correctStreak(scores) - 1, 4)];
  const next_review = last_seen + intervalDays * DAY;
  const streak = correctStreak(scores);
  const status = streak >= 3 && seen_count >= 3 ? 'mastered'
               : seen_count > 0                 ? 'learning'
               :                                  'unseen';
  return { status, seen_count, last_seen, scores, next_review };
}

// ── Queue builders ────────────────────────────────────────────────────────────

const BRACKET_ACCESS = {
  child: ['child'],
  youth: ['child', 'youth'],
  adult: ['child', 'youth', 'adult'],
};

export function buildDailyQueue(verses, progress, userBracket = 'adult') {
  const allowed = BRACKET_ACCESS[userBracket] || BRACKET_ACCESS.adult;
  const now = Date.now();
  const eligible = verses.filter(v => allowed.includes(v.bracket || 'child'));

  const due = eligible
    .filter(v => {
      const e = progress[v.id];
      return e && e.status !== 'unseen' && e.next_review && e.next_review <= now;
    })
    .sort((a, b) => (progress[a.id].next_review || 0) - (progress[b.id].next_review || 0))
    .slice(0, 15);

  const seen = new Set(due.map(v => v.id));
  const newVerses = eligible
    .filter(v => {
      if (seen.has(v.id)) return false;
      const e = progress[v.id];
      return !e || e.status === 'unseen';
    })
    .slice(0, 1);

  return [...due, ...newVerses];
}

// Up to limit most-urgent revise verses. Recently-practiced verses are deprioritized
// via a coolOff penalty so the same verse doesn't dominate back-to-back sessions.
export function buildReviseQueue(verses, progress, userBracket = 'adult', limit = 5) {
  const allowed = BRACKET_ACCESS[userBracket] || BRACKET_ACCESS.adult;
  const now = Date.now();
  const coolOffMs = REVISE_CONFIG.coolOffMinutes * 60 * 1000;
  const penaltyMs = REVISE_CONFIG.coolOffDays * DAY;

  return verses
    .filter(v => {
      if (!allowed.includes(v.bracket || 'child')) return false;
      const s = progress[v.id]?.status;
      return s === 'learning' || s === 'mastered';
    })
    .map(v => {
      const entry = progress[v.id];
      const recentlyPracticed = entry?.last_seen && (now - entry.last_seen) < coolOffMs;
      const effectiveNextReview = recentlyPracticed
        ? now + penaltyMs
        : (entry?.next_review || 0);
      return { verse: v, effectiveNextReview };
    })
    .sort((a, b) => a.effectiveNextReview - b.effectiveNextReview)
    .slice(0, limit)
    .map(x => x.verse);
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
