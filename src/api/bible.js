import { parseRef, toDisplayRef } from './bibleRef.js';

// All translations (D1-backed KJV/BSB and the external ESV/api.bible ones)
// are fetched via our own /api/verse — external API keys live server-side
// only and are never shipped in the client bundle.
async function fetchFromProxy(reference, translation) {
  try {
    const url = `/api/verse?ref=${encodeURIComponent(reference)}&translation=${translation}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.text?.trim() || null;
  } catch (err) {
    // A genuine network/fetch exception (offline, DNS, aborted, etc) — rethrow
    // so callers can distinguish "request failed" from "translation unavailable"
    // (a real HTTP response with no text, handled above by returning null).
    throw err;
  }
}

export const fetchESV = (ref) => fetchFromProxy(ref, 'esv');
export const fetchKJV = (ref) => fetchFromProxy(ref, 'kjv');
export const fetchBSB = (ref) => fetchFromProxy(ref, 'bsb');

const API_BIBLE_TRANSLATIONS = new Set(['niv', 'nkjv', 'nasb']);

/**
 * Fetch a single verse in one specific translation.
 * Returns the text string, or null if unavailable.
 */
export async function fetchTranslation(rawInput, translation) {
  const parsed = parseRef(rawInput);
  if (!parsed) return null;
  const reference = toDisplayRef(parsed);
  if (translation === 'esv' || translation === 'kjv' || translation === 'bsb' || API_BIBLE_TRANSLATIONS.has(translation)) {
    return fetchFromProxy(reference, translation);
  }
  return null;
}

/**
 * Fetch a verse or verse range from all translations.
 * Input can be in any common format: "Eph 4:9-10", "1john 3:16", "Ps. 23:1", etc.
 * Returns { reference, esv, kjv, bsb, niv, nkjv, nasb } with canonical reference.
 */
export async function fetchVerse(rawInput) {
  const parsed = parseRef(rawInput);
  if (!parsed) {
    throw new Error('Reference not recognised. Try a format like "John 3:16" or "Eph 4:9-10".');
  }

  const reference = toDisplayRef(parsed);

  const [esv, kjv, bsb, niv, nkjv, nasb] = await Promise.all([
    fetchESV(reference),
    fetchKJV(reference),
    fetchBSB(reference),
    fetchFromProxy(reference, 'niv'),
    fetchFromProxy(reference, 'nkjv'),
    fetchFromProxy(reference, 'nasb'),
  ]);

  if (!esv && !kjv && !bsb && !niv && !nkjv && !nasb) {
    throw new Error('Verse not found. Check the reference and try again.');
  }

  return { reference, esv, kjv, bsb, niv, nkjv, nasb };
}
