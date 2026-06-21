const KEY = 'mv-verse-text';

export function loadVerseCache() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const cache = JSON.parse(raw);
    // Strip any null values stored by older builds
    let dirty = false;
    for (const ref of Object.keys(cache)) {
      const cleaned = Object.fromEntries(Object.entries(cache[ref]).filter(([, v]) => v != null));
      if (Object.keys(cleaned).length !== Object.keys(cache[ref]).length) {
        cache[ref] = cleaned;
        dirty = true;
      }
    }
    if (dirty) localStorage.setItem(KEY, JSON.stringify(cache));
    return cache;
  } catch { return {}; }
}

export function saveVerseCache(cache) {
  localStorage.setItem(KEY, JSON.stringify(cache));
}

// Merge a fetched verse result into the cache
export function mergeVerseIntoCache(cache, fetchedVerse) {
  const { reference, ...translations } = fetchedVerse;
  const existing = cache[reference] || {};
  // Only store translations that actually returned text — never cache nulls,
  // otherwise a missing API key permanently blocks that translation from loading
  const fresh = Object.fromEntries(Object.entries(translations).filter(([, v]) => v != null));
  return { ...cache, [reference]: { ...existing, ...fresh } };
}
