const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 365; // keep 1 year for calendar
const FREEZE_EVERY = 6;   // earn 1 freeze every N consecutive days

// A "day" runs 4am → 4am in the user's LOCAL timezone, not UTC. Two reasons:
// (1) plain toISOString() is UTC, so evening practice in e.g. Australia landed
//     on the wrong calendar day and could double-count or shift the streak;
// (2) the 4am cutoff means a late-night session (say 1–2am) still counts
//     toward the day that just ended, so staying up late to do it doesn't
//     break the streak.
const DAY_CUTOFF_HOURS = 4;

// Logical local calendar date (YYYY-MM-DD) for a given instant. en-CA gives
// ISO-style YYYY-MM-DD in the runtime's local timezone.
export function logicalDateStr(ms = Date.now()) {
  return new Date(ms - DAY_CUTOFF_HOURS * 60 * 60 * 1000).toLocaleDateString('en-CA');
}

// Exposed so UI ("practiced today?", streak-at-risk, calendar) uses the exact
// same day boundary as the streak engine.
export function todayStr() { return logicalDateStr(); }
export function yesterdayStr() { return logicalDateStr(Date.now() - DAY_MS); }

function key(userId) {
  return `mv-streak-${userId}`;
}

export function loadStreak(userId) {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return { days: 0, lastDate: null, history: [], freezes: 0, freezeHistory: [], nextFreezeAt: FREEZE_EVERY };
    const parsed = JSON.parse(raw);
    return { history: [], freezes: 0, freezeHistory: [], nextFreezeAt: FREEZE_EVERY, ...parsed };
  } catch { return { days: 0, lastDate: null, history: [], freezes: 0, freezeHistory: [], nextFreezeAt: FREEZE_EVERY }; }
}

export function saveStreak(userId, streak) {
  localStorage.setItem(key(userId), JSON.stringify(streak));
}

// Merge two streak objects from different devices.
// Takes the higher day count as authoritative, unions both history arrays,
// and keeps the higher freeze count so neither device loses earned freezes.
export function mergeStreaks(local, cloud) {
  const localDays = local?.days || 0;
  const cloudDays = cloud?.days || 0;

  let winner, other;
  if (cloudDays > localDays) { winner = cloud; other = local; }
  else if (localDays > cloudDays) { winner = local; other = cloud; }
  else {
    // Same day count — prefer the more recently touched device
    winner = (cloud?.lastDate || '') >= (local?.lastDate || '') ? cloud : local;
    other  = winner === cloud ? local : cloud;
  }

  const history = [...new Set([...(local?.history || []), ...(cloud?.history || [])])].sort();
  const freezeHistory = [...new Set([...(local?.freezeHistory || []), ...(cloud?.freezeHistory || [])])].sort();
  const freezes = Math.max(local?.freezes || 0, cloud?.freezes || 0);

  return {
    days:          winner.days      || 0,
    lastDate:      winner.lastDate  || null,
    history,
    freezes,
    freezeHistory,
    nextFreezeAt:  winner.nextFreezeAt || FREEZE_EVERY,
  };
}

// Call this when the user completes at least one exercise in a session.
// Returns the updated streak object (plus usedFreeze / awardedFreezes for UI feedback).
export function touchStreak(userId) {
  const today = todayStr();
  const current = loadStreak(userId);

  if (current.lastDate === today) return current; // already touched today

  const yesterday = logicalDateStr(Date.now() - DAY_MS);
  const dayBefore  = logicalDateStr(Date.now() - 2 * DAY_MS);

  // Consecutive if practiced yesterday, or exactly 1 day missed + freeze available
  let isConsecutive = current.lastDate === yesterday;
  let usedFreeze = false;
  if (!isConsecutive && current.lastDate === dayBefore && current.freezes > 0) {
    isConsecutive = true;
    usedFreeze = true;
  }

  const cutoff = logicalDateStr(Date.now() - HISTORY_DAYS * DAY_MS);

  const history = [...(current.history || []).filter(d => d >= cutoff)];
  if (!history.includes(today)) history.push(today);

  const freezeHistory = [...(current.freezeHistory || []).filter(d => d >= cutoff)];
  if (usedFreeze && !freezeHistory.includes(yesterday)) freezeHistory.push(yesterday);

  const newDays   = isConsecutive ? current.days + 1 : 1;
  let freezes     = (current.freezes - (usedFreeze ? 1 : 0));

  // Reset nextFreezeAt when streak breaks; otherwise carry forward.
  let nextFreezeAt = isConsecutive ? current.nextFreezeAt : FREEZE_EVERY;
  let awardedFreezes = 0;
  while (newDays >= nextFreezeAt) {
    freezes++;
    awardedFreezes++;
    nextFreezeAt += FREEZE_EVERY;
  }

  const updated = {
    days: newDays,
    lastDate: today,
    history,
    freezes,
    freezeHistory,
    nextFreezeAt,
  };
  saveStreak(userId, updated);
  return { ...updated, usedFreeze, awardedFreezes };
}
