const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 365; // keep 1 year for calendar
const FREEZE_EVERY = 6;   // earn 1 freeze every N consecutive days

function todayStr() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

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

// Call this when the user completes at least one exercise in a session.
// Returns the updated streak object (plus usedFreeze / awardedFreezes for UI feedback).
export function touchStreak(userId) {
  const today = todayStr();
  const current = loadStreak(userId);

  if (current.lastDate === today) return current; // already touched today

  const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);
  const dayBefore  = new Date(Date.now() - 2 * DAY_MS).toISOString().slice(0, 10);

  // Consecutive if practiced yesterday, or exactly 1 day missed + freeze available
  let isConsecutive = current.lastDate === yesterday;
  let usedFreeze = false;
  if (!isConsecutive && current.lastDate === dayBefore && current.freezes > 0) {
    isConsecutive = true;
    usedFreeze = true;
  }

  const cutoff = new Date(Date.now() - HISTORY_DAYS * DAY_MS).toISOString().slice(0, 10);

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
