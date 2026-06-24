import { parseRef, toDisplayRef, toOSIS } from './bibleRef.js';

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').replace(/¶\s*/g, '').replace(/\s+/g, ' ').trim();
}

export async function fetchESV(reference) {
  const token = import.meta.env.VITE_ESV_TOKEN;
  if (!token) return null;
  try {
    const url = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(reference)}&include-headings=false&include-section-headings=false&include-footnotes=false&include-verse-numbers=false&include-short-copyright=false&include-passage-references=false`;
    const res = await fetch(url, { headers: { Authorization: `Token ${token}` } });
    if (!res.ok) return null;
    const data = await res.json();
    const passages = data.passages;
    if (!passages || passages.length === 0) return null;
    return passages[0].trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim() || null;
  } catch {
    return null;
  }
}

// D1-backed translations (KJV and BSB served from our own database)
async function fetchFromD1(reference, translation) {
  try {
    const url = `/api/verse?ref=${encodeURIComponent(reference)}&translation=${translation}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}

export const fetchKJV = (ref) => fetchFromD1(ref, 'kjv');
export const fetchBSB = (ref) => fetchFromD1(ref, 'bsb');

// api.bible-backed translations
const API_BIBLE_IDS = {
  niv:  '78a9f6124f344018-01',
  nkjv: '63097d2a0a2f7db3-01',
  nasb: 'b8ee27bcd1cae43a-01',
};

async function fetchApiBible(bibleId, osisId) {
  const key = import.meta.env.VITE_API_BIBLE_KEY;
  if (!key) return null;
  try {
    const url = `https://api.scripture.api.bible/v1/bibles/${bibleId}/passages/${osisId}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=false`;
    const res = await fetch(url, { headers: { 'api-key': key } });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.data?.content;
    if (!content) return null;
    return stripHtml(content).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Fetch a single verse in one specific translation.
 * Returns the text string, or null if unavailable.
 */
export async function fetchTranslation(rawInput, translation) {
  const parsed = parseRef(rawInput);
  if (!parsed) return null;
  const reference = toDisplayRef(parsed);
  const osisId = toOSIS(parsed);
  if (translation === 'kjv' || translation === 'bsb') return fetchFromD1(reference, translation);
  if (translation === 'esv') return fetchESV(reference);
  const bibleId = API_BIBLE_IDS[translation];
  if (bibleId) return fetchApiBible(bibleId, osisId);
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
  const osisId = toOSIS(parsed);

  const [esv, kjv, bsb, niv, nkjv, nasb] = await Promise.all([
    fetchESV(reference),
    fetchKJV(reference),
    fetchBSB(reference),
    fetchApiBible(API_BIBLE_IDS.niv,  osisId),
    fetchApiBible(API_BIBLE_IDS.nkjv, osisId),
    fetchApiBible(API_BIBLE_IDS.nasb, osisId),
  ]);

  if (!esv && !kjv && !bsb && !niv && !nkjv && !nasb) {
    throw new Error('Verse not found. Check the reference and try again.');
  }

  return { reference, esv, kjv, bsb, niv, nkjv, nasb };
}
