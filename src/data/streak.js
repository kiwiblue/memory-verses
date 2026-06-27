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
    if (!raw) return { days: 0, lastDate: null };
    return JSON.parse(raw);
  } catch { return { days: 0, lastDate: null }; }
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

  const updated = {
    days: isConsecutive ? current.days + 1 : 1,
    lastDate: today,
  };
  saveStreak(userId, updated);
  return updated;
}
