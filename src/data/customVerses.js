const KEY = (userId) => `mv-custom-${userId}`;

export function loadCustomVerses(userId) {
  try {
    const raw = localStorage.getItem(KEY(userId));
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

export function saveCustomVerses(userId, verses) {
  localStorage.setItem(KEY(userId), JSON.stringify(verses));
}

export function addCustomVerse(userId, verse) {
  const verses = loadCustomVerses(userId);
  const newVerse = {
    id: Date.now(),
    reference: verse.reference,
    esv: verse.esv ?? null,
    kjv: verse.kjv ?? null,
    niv: null,
    nlt: null,
    custom: true,
  };
  const updated = [...verses, newVerse];
  saveCustomVerses(userId, updated);
  return updated;
}

export function removeCustomVerse(userId, verseId) {
  const verses = loadCustomVerses(userId);
  const updated = verses.filter(v => v.id !== verseId);
  saveCustomVerses(userId, updated);
  return updated;
}
