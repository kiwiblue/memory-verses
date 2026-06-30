const KEY = 'mv-verse-text';

// Remove translator notation that shouldn't be displayed, memorised or typed —
// e.g. the asterisks NASB uses to mark the historical present ("Jesus *said" →
// "Jesus said"). api.bible has no option to omit these, so we strip them here.
export function sanitizeVerseText(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
}

export function loadVerseCache() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const cache = JSON.parse(raw);
    // Drop null values from older builds and sanitize any cached marks in place
    let dirty = false;
    for (const ref of Object.keys(cache)) {
      const cleaned = {};
      for (const [k, v] of Object.entries(cache[ref])) {
        if (v == null) { dirty = true; continue; }
        const s = sanitizeVerseText(v);
        if (s !== v) dirty = true;
        cleaned[k] = s;
      }
      cache[ref] = cleaned;
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
  const fresh = Object.fromEntries(
    Object.entries(translations)
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, sanitizeVerseText(v)])
  );
  return { ...cache, [reference]: { ...existing, ...fresh } };
}
