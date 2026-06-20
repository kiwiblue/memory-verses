const BOOK_MAP = {
  // Genesis - Malachi (OT)
  'genesis': 'GEN', 'gen': 'GEN',
  'exodus': 'EXO', 'exo': 'EXO', 'ex': 'EXO',
  'leviticus': 'LEV', 'lev': 'LEV',
  'numbers': 'NUM', 'num': 'NUM',
  'deuteronomy': 'DEU', 'deut': 'DEU', 'deu': 'DEU',
  'joshua': 'JOS', 'josh': 'JOS', 'jos': 'JOS',
  'judges': 'JDG', 'judg': 'JDG', 'jdg': 'JDG',
  'ruth': 'RUT', 'rut': 'RUT',
  '1 samuel': '1SA', '1samuel': '1SA', '1sa': '1SA', '1 sam': '1SA', '1sam': '1SA',
  '2 samuel': '2SA', '2samuel': '2SA', '2sa': '2SA', '2 sam': '2SA', '2sam': '2SA',
  '1 kings': '1KI', '1kings': '1KI', '1ki': '1KI', '1 kgs': '1KI', '1kgs': '1KI',
  '2 kings': '2KI', '2kings': '2KI', '2ki': '2KI', '2 kgs': '2KI', '2kgs': '2KI',
  '1 chronicles': '1CH', '1chronicles': '1CH', '1ch': '1CH', '1 chr': '1CH', '1chr': '1CH',
  '2 chronicles': '2CH', '2chronicles': '2CH', '2ch': '2CH', '2 chr': '2CH', '2chr': '2CH',
  'ezra': 'EZR', 'ezr': 'EZR',
  'nehemiah': 'NEH', 'neh': 'NEH',
  'esther': 'EST', 'est': 'EST',
  'job': 'JOB',
  'psalm': 'PSA', 'psalms': 'PSA', 'psa': 'PSA', 'ps': 'PSA',
  'proverbs': 'PRO', 'prov': 'PRO', 'pro': 'PRO',
  'ecclesiastes': 'ECC', 'eccl': 'ECC', 'ecc': 'ECC',
  'song of solomon': 'SNG', 'song of songs': 'SNG', 'song': 'SNG', 'sng': 'SNG', 'ss': 'SNG',
  'isaiah': 'ISA', 'isa': 'ISA',
  'jeremiah': 'JER', 'jer': 'JER',
  'lamentations': 'LAM', 'lam': 'LAM',
  'ezekiel': 'EZK', 'ezek': 'EZK', 'ezk': 'EZK',
  'daniel': 'DAN', 'dan': 'DAN',
  'hosea': 'HOS', 'hos': 'HOS',
  'joel': 'JOL', 'jol': 'JOL',
  'amos': 'AMO', 'amo': 'AMO',
  'obadiah': 'OBA', 'obad': 'OBA', 'oba': 'OBA',
  'jonah': 'JON', 'jon': 'JON',
  'micah': 'MIC', 'mic': 'MIC',
  'nahum': 'NAM', 'nah': 'NAM', 'nam': 'NAM',
  'habakkuk': 'HAB', 'hab': 'HAB',
  'zephaniah': 'ZEP', 'zeph': 'ZEP', 'zep': 'ZEP',
  'haggai': 'HAG', 'hag': 'HAG',
  'zechariah': 'ZEC', 'zech': 'ZEC', 'zec': 'ZEC',
  'malachi': 'MAL', 'mal': 'MAL',
  // Matthew - Revelation (NT)
  'matthew': 'MAT', 'matt': 'MAT', 'mat': 'MAT',
  'mark': 'MRK', 'mrk': 'MRK',
  'luke': 'LUK', 'luk': 'LUK',
  'john': 'JHN', 'jhn': 'JHN',
  'acts': 'ACT', 'act': 'ACT',
  'romans': 'ROM', 'rom': 'ROM',
  '1 corinthians': '1CO', '1corinthians': '1CO', '1co': '1CO', '1 cor': '1CO', '1cor': '1CO',
  '2 corinthians': '2CO', '2corinthians': '2CO', '2co': '2CO', '2 cor': '2CO', '2cor': '2CO',
  'galatians': 'GAL', 'gal': 'GAL',
  'ephesians': 'EPH', 'eph': 'EPH',
  'philippians': 'PHP', 'phil': 'PHP', 'php': 'PHP',
  'colossians': 'COL', 'col': 'COL',
  '1 thessalonians': '1TH', '1thessalonians': '1TH', '1th': '1TH', '1 thess': '1TH', '1thess': '1TH',
  '2 thessalonians': '2TH', '2thessalonians': '2TH', '2th': '2TH', '2 thess': '2TH', '2thess': '2TH',
  '1 timothy': '1TI', '1timothy': '1TI', '1ti': '1TI', '1 tim': '1TI', '1tim': '1TI',
  '2 timothy': '2TI', '2timothy': '2TI', '2ti': '2TI', '2 tim': '2TI', '2tim': '2TI',
  'titus': 'TIT', 'tit': 'TIT',
  'philemon': 'PHM', 'phlm': 'PHM', 'phm': 'PHM',
  'hebrews': 'HEB', 'heb': 'HEB',
  'james': 'JAS', 'jas': 'JAS',
  '1 peter': '1PE', '1peter': '1PE', '1pe': '1PE', '1 pet': '1PE', '1pet': '1PE',
  '2 peter': '2PE', '2peter': '2PE', '2pe': '2PE', '2 pet': '2PE', '2pet': '2PE',
  '1 john': '1JN', '1john': '1JN', '1jn': '1JN',
  '2 john': '2JN', '2john': '2JN', '2jn': '2JN',
  '3 john': '3JN', '3john': '3JN', '3jn': '3JN',
  'jude': 'JUD', 'jud': 'JUD',
  'revelation': 'REV', 'rev': 'REV',
};

export function referenceToOSIS(reference) {
  // e.g. "John 3:16" → "JHN.3.16"
  const match = reference.trim().match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!match) return null;
  const [, bookRaw, chapter, verse] = match;
  const key = bookRaw.toLowerCase().trim();
  const osis = BOOK_MAP[key];
  if (!osis) return null;
  return `${osis}.${chapter}.${verse}`;
}

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').replace(/¶\s*/g, '').replace(/\s+/g, ' ').trim();
}

export async function fetchESV(reference) {
  const token = import.meta.env.VITE_ESV_TOKEN;
  if (!token) return null;
  try {
    const url = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(reference)}&include-headings=false&include-footnotes=false&include-verse-numbers=false&include-short-copyright=false&include-passage-references=false`;
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

const API_BIBLE_IDS = {
  kjv:  'de4e12af7f28f599-01',
  niv:  '78a9f6124f344018-01',
  nkjv: '63097d2a0a2f7db3-01',
  nasb: 'b8ee27bcd1cae43a-01',
};

async function fetchApiBible(bibleId, reference) {
  const key = import.meta.env.VITE_API_BIBLE_KEY;
  if (!key) return null;
  const osisId = referenceToOSIS(reference);
  if (!osisId) return null;
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

export const fetchKJV  = (ref) => fetchApiBible(API_BIBLE_IDS.kjv,  ref);
export const fetchNIV  = (ref) => fetchApiBible(API_BIBLE_IDS.niv,  ref);
export const fetchNKJV = (ref) => fetchApiBible(API_BIBLE_IDS.nkjv, ref);
export const fetchNASB = (ref) => fetchApiBible(API_BIBLE_IDS.nasb, ref);

export async function fetchVerse(reference) {
  const [esv, kjv, niv, nkjv, nasb] = await Promise.all([
    fetchESV(reference),
    fetchKJV(reference),
    fetchNIV(reference),
    fetchNKJV(reference),
    fetchNASB(reference),
  ]);
  if (!esv && !kjv && !niv && !nkjv && !nasb) {
    throw new Error('Verse not found. Check the reference and try again.');
  }
  return { reference, esv, kjv, niv, nkjv, nasb };
}
