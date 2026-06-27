const DAY_MS = 24 * 60 * 60 * 1000;

function todayStr() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function key(userId) {
  return `mv-streak-${userId}`;
}

export function loadStreak(userId) {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return { days: 0, lastDate: null, history: [] };
    const parsed = JSON.parse(raw);
    return { history: [], ...parsed };
  } catch { return { days: 0, lastDate: null, history: [] }; }
}

export function saveStreak(userId, streak) {
  localStorage.setItem(key(userId), JSON.stringify(streak));
}

// Call this when the user completes at least one exercise in a session.
// Returns the updated streak object.
export function touchStreak(userId) {
  const today = todayStr();
  const current = loadStreak(userId);

  if (current.lastDate === today) return current; // already touched today

  const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);
  const isConsecutive = current.lastDate === yesterday;

  const cutoff = new Date(Date.now() - 30 * DAY_MS).toISOString().slice(0, 10);
  const history = [...(current.history || []).filter(d => d >= cutoff)];
  if (!history.includes(today)) history.push(today);

  const updated = {
    days: isConsecutive ? current.days + 1 : 1,
    lastDate: today,
    history,
  };
  saveStreak(userId, updated);
  return updated;
}
