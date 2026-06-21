const KEY = (userId) => `mv-hidden-${userId}`;

export function loadHiddenVerseIds(userId) {
  try {
    const raw = localStorage.getItem(KEY(userId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

export function saveHiddenVerseIds(userId, idSet) {
  localStorage.setItem(KEY(userId), JSON.stringify([...idSet]));
}

export function hideVerseId(userId, verseId) {
  const ids = loadHiddenVerseIds(userId);
  ids.add(verseId);
  saveHiddenVerseIds(userId, ids);
  return ids;
}
