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

// Per-bracket tuning: children advance slower and drop quicker; adults advance
// faster and drop a little slower. Tune these to taste.
export const BRACKET_TUNING = {
  child: { moderateAfterSeen: 3, hardMatureDays: 30, hardPerfectRun: 4, demoteAt: { moderate: 1, hard: 0 } },
  youth: { moderateAfterSeen: 2, hardMatureDays: 21, hardPerfectRun: 3, demoteAt: { moderate: 2, hard: 1 } },
  adult: { moderateAfterSeen: 1, hardMatureDays: 14, hardPerfectRun: 3, demoteAt: { moderate: 3, hard: 1 } },
};

const LEVELS = ['easy', 'moderate', 'hard'];
const rankOf   = (l) => Math.max(0, LEVELS.indexOf(l));
const levelAt  = (r) => LEVELS[Math.max(0, Math.min(LEVELS.length - 1, r))];

function tuningFor(bracket) { return BRACKET_TUNING[bracket] || BRACKET_TUNING.adult; }

// How many days since the verse was first learned (its "maturity").
export function verseAgeDays(entry, now = Date.now()) {
  const start = entry?.learned_at || entry?.attempts?.[0]?.ts || entry?.last_seen || now;
  return Math.max(0, (now - start) / DAY);
}

// The highest level a verse may currently *hold*, given maturity + recent history.
// HARD only becomes stable after the verse is weeks old AND recent attempts are
// all perfect — so a freshly-crammed verse that spikes to HARD decays back down.
function stableCeiling(tuning, { ageDays, seenCount, recentAttempts }) {
  const { perfectHintMax } = SKILL_CONFIG;
  const run = recentAttempts.slice(-tuning.hardPerfectRun);
  const sustainedPerfect =
    run.length >= tuning.hardPerfectRun && run.every(a => (a.hintScore ?? 0) <= perfectHintMax);
  if (ageDays >= tuning.hardMatureDays && sustainedPerfect) return 'hard';
  if (seenCount >= tuning.moderateAfterSeen) return 'moderate';
  return 'easy';
}

// Determine the new skill level after a revise attempt.
// opts: { hintScore, ageDays, seenCount, recentAttempts, bracket }
export function computeNextSkillLevel(currentLevel, opts = {}) {
  const {
    hintScore = 0, ageDays = 0, seenCount = 0, recentAttempts = [], bracket = 'adult',
  } = opts;
  const tuning = tuningFor(bracket);
  const { goodHintMax } = SKILL_CONFIG;
  const cur = rankOf(currentLevel);

  // 1) Struggle → drop a level quickly. The bar is stricter the higher the level
  //    (a couple of hints on a HARD exercise drops you), and stricter for children.
  const demoteAt = currentLevel === 'hard' ? tuning.demoteAt.hard
                 : currentLevel === 'moderate' ? tuning.demoteAt.moderate
                 : Infinity; // easy can't struggle-demote below easy
  if (hintScore > demoteAt) return levelAt(cur - 1);

  // 2) Otherwise move toward the level this verse can actually sustain.
  const ceiling = rankOf(stableCeiling(tuning, { ageDays, seenCount, recentAttempts }));
  if (cur > ceiling) return levelAt(cur - 1);                 // above what maturity supports → decay one step
  const recalledWell = hintScore <= goodHintMax;             // good or perfect
  if (cur < ceiling && recalledWell) return levelAt(cur + 1); // earn one step up
  return currentLevel;                                        // hold
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
    learned_at: entry?.learned_at || now, // verse maturity anchor (for skill stability)
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
    // Backfill the maturity anchor for verses that predate learned_at, using the
    // best available estimate so existing mature verses aren't treated as brand new.
    learned_at: entry.learned_at || entry.attempts?.[0]?.ts || entry.last_seen || now,
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

// Learn mode is familiarisation-only: return up to 1 unseen verse per session.
// Verses already in Revise (status learning/mastered) never appear here.
export function buildDailyQueue(verses, progress, userBracket = 'adult') {
  const allowed = BRACKET_ACCESS[userBracket] || BRACKET_ACCESS.adult;
  const eligible = verses.filter(v => allowed.includes(v.bracket || 'child'));

  return eligible
    .filter(v => {
      const e = progress[v.id];
      return !e || e.status === 'unseen';
    })
    .slice(0, 1);
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
