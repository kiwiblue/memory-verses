const KEY = 'mv-verse-text';

export function loadVerseCache() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveVerseCache(cache) {
  localStorage.setItem(KEY, JSON.stringify(cache));
}

// Merge a fetched verse result into the cache
export function mergeVerseIntoCache(cache, fetchedVerse) {
  const { reference, ...translations } = fetchedVerse;
  const existing = cache[reference] || {};
  return { ...cache, [reference]: { ...existing, ...translations } };
}
