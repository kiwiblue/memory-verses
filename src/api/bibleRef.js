// Canonical book data — name matches D1 storage, osis is for api.bible
const BOOKS = [
  { name: 'Genesis',          osis: 'GEN',  abbr: ['gen','ge','gn'] },
  { name: 'Exodus',           osis: 'EXO',  abbr: ['ex','exo','exod'] },
  { name: 'Leviticus',        osis: 'LEV',  abbr: ['lev','le','lv'] },
  { name: 'Numbers',          osis: 'NUM',  abbr: ['num','nu','nb'] },
  { name: 'Deuteronomy',      osis: 'DEU',  abbr: ['deut','deu','dt','de'] },
  { name: 'Joshua',           osis: 'JOS',  abbr: ['josh','jos','jsh'] },
  { name: 'Judges',           osis: 'JDG',  abbr: ['judg','jdg','jg','jgs'] },
  { name: 'Ruth',             osis: 'RUT',  abbr: ['ruth','rut','ru'] },
  { name: '1 Samuel',         osis: '1SA',  abbr: ['1sam','1sa','1s'] },
  { name: '2 Samuel',         osis: '2SA',  abbr: ['2sam','2sa','2s'] },
  { name: '1 Kings',          osis: '1KI',  abbr: ['1kgs','1ki','1k','1kings'] },
  { name: '2 Kings',          osis: '2KI',  abbr: ['2kgs','2ki','2k','2kings'] },
  { name: '1 Chronicles',     osis: '1CH',  abbr: ['1chr','1ch','1chron'] },
  { name: '2 Chronicles',     osis: '2CH',  abbr: ['2chr','2ch','2chron'] },
  { name: 'Ezra',             osis: 'EZR',  abbr: ['ezra','ezr'] },
  { name: 'Nehemiah',         osis: 'NEH',  abbr: ['neh','ne'] },
  { name: 'Esther',           osis: 'EST',  abbr: ['esth','est','es'] },
  { name: 'Job',              osis: 'JOB',  abbr: ['job','jb'] },
  { name: 'Psalms',           osis: 'PSA',  abbr: ['ps','psa','pss','psalm','psalms'] },
  { name: 'Proverbs',         osis: 'PRO',  abbr: ['prov','pro','prv','pr'] },
  { name: 'Ecclesiastes',     osis: 'ECC',  abbr: ['eccl','ecc','ec','qoh'] },
  { name: 'Song of Songs',    osis: 'SNG',  abbr: ['song','sos','ss','sol','sng','song of solomon','song of songs','canticles','cant'] },
  { name: 'Isaiah',           osis: 'ISA',  abbr: ['isa','is'] },
  { name: 'Jeremiah',         osis: 'JER',  abbr: ['jer','je','jr'] },
  { name: 'Lamentations',     osis: 'LAM',  abbr: ['lam','la'] },
  { name: 'Ezekiel',          osis: 'EZK',  abbr: ['ezek','eze','ezk','ez'] },
  { name: 'Daniel',           osis: 'DAN',  abbr: ['dan','da','dn'] },
  { name: 'Hosea',            osis: 'HOS',  abbr: ['hos','ho'] },
  { name: 'Joel',             osis: 'JOL',  abbr: ['joel','jl','jol'] },
  { name: 'Amos',             osis: 'AMO',  abbr: ['amos','am'] },
  { name: 'Obadiah',          osis: 'OBA',  abbr: ['obad','ob','oba'] },
  { name: 'Jonah',            osis: 'JON',  abbr: ['jonah','jon','jnh'] },
  { name: 'Micah',            osis: 'MIC',  abbr: ['mic','mc'] },
  { name: 'Nahum',            osis: 'NAM',  abbr: ['nah','na','nam'] },
  { name: 'Habakkuk',         osis: 'HAB',  abbr: ['hab','hb'] },
  { name: 'Zephaniah',        osis: 'ZEP',  abbr: ['zeph','zep','zp'] },
  { name: 'Haggai',           osis: 'HAG',  abbr: ['hag','hg'] },
  { name: 'Zechariah',        osis: 'ZEC',  abbr: ['zech','zec','zc'] },
  { name: 'Malachi',          osis: 'MAL',  abbr: ['mal','ml'] },
  { name: 'Matthew',          osis: 'MAT',  abbr: ['matt','mat','mt'] },
  { name: 'Mark',             osis: 'MRK',  abbr: ['mark','mrk','mk','mr'] },
  { name: 'Luke',             osis: 'LUK',  abbr: ['luke','luk','lk'] },
  { name: 'John',             osis: 'JHN',  abbr: ['john','jhn','jn'] },
  { name: 'Acts',             osis: 'ACT',  abbr: ['acts','act','ac'] },
  { name: 'Romans',           osis: 'ROM',  abbr: ['rom','ro','rm'] },
  { name: '1 Corinthians',    osis: '1CO',  abbr: ['1cor','1co','1corinthians'] },
  { name: '2 Corinthians',    osis: '2CO',  abbr: ['2cor','2co','2corinthians'] },
  { name: 'Galatians',        osis: 'GAL',  abbr: ['gal','ga'] },
  { name: 'Ephesians',        osis: 'EPH',  abbr: ['eph','ephes'] },
  { name: 'Philippians',      osis: 'PHP',  abbr: ['phil','php','pp'] },
  { name: 'Colossians',       osis: 'COL',  abbr: ['col'] },
  { name: '1 Thessalonians',  osis: '1TH',  abbr: ['1thess','1th','1thes'] },
  { name: '2 Thessalonians',  osis: '2TH',  abbr: ['2thess','2th','2thes'] },
  { name: '1 Timothy',        osis: '1TI',  abbr: ['1tim','1ti'] },
  { name: '2 Timothy',        osis: '2TI',  abbr: ['2tim','2ti'] },
  { name: 'Titus',            osis: 'TIT',  abbr: ['titus','tit','ti'] },
  { name: 'Philemon',         osis: 'PHM',  abbr: ['philem','phm','phlm','pm'] },
  { name: 'Hebrews',          osis: 'HEB',  abbr: ['heb','he'] },
  { name: 'James',            osis: 'JAS',  abbr: ['james','jas','jm'] },
  { name: '1 Peter',          osis: '1PE',  abbr: ['1pet','1pe','1pt'] },
  { name: '2 Peter',          osis: '2PE',  abbr: ['2pet','2pe','2pt'] },
  { name: '1 John',           osis: '1JN',  abbr: ['1john','1jn','1jo','1j'] },
  { name: '2 John',           osis: '2JN',  abbr: ['2john','2jn','2jo'] },
  { name: '3 John',           osis: '3JN',  abbr: ['3john','3jn','3jo'] },
  { name: 'Jude',             osis: 'JUD',  abbr: ['jude','jud','jd'] },
  { name: 'Revelation',       osis: 'REV',  abbr: ['rev','re','revelations','rv'] },
];

// Build fast lookup map
const LOOKUP = new Map();
for (const book of BOOKS) {
  LOOKUP.set(book.name.toLowerCase(), book);
  LOOKUP.set(book.osis.toLowerCase(), book);
  for (const a of book.abbr) LOOKUP.set(a.toLowerCase(), book);
}

// Normalize prefixes: "1st John" / "I John" / "First John" → "1 John"
function normalizePrefix(s) {
  return s.trim()
    .replace(/^III\s+/i,     '3 ')
    .replace(/^II\s+/i,      '2 ')
    .replace(/^I\s+(?=\S)/i, '1 ')  // "I " before any char, avoids "Isaiah"
    .replace(/^1st\s+/i,     '1 ')
    .replace(/^2nd\s+/i,     '2 ')
    .replace(/^3rd\s+/i,     '3 ')
    .replace(/^first\s+/i,   '1 ')
    .replace(/^second\s+/i,  '2 ')
    .replace(/^third\s+/i,   '3 ');
}

function lookupBook(raw) {
  const s = normalizePrefix(raw.trim()).toLowerCase().replace(/\s+/g, ' ');
  return LOOKUP.get(s) || null;
}

/**
 * Parse a human reference string into its components.
 * Handles abbreviations, misspellings, prefix variants, period/colon separators,
 * em/en dashes, missing spaces, and verse ranges.
 *
 * Returns { book, chapter, verseStart, verseEnd } or null if unrecognizable.
 * book is the full BOOKS entry (has .name and .osis).
 */
export function parseRef(input) {
  if (!input) return null;
  const s = input.trim()
    .replace(/\s+/g, ' ')
    .replace(/[–—]/g, '-');   // normalize dashes

  // Match: <book> <chapter>[:.] <verseStart> [-<verseEnd>]
  // Zero or more spaces allowed between book and chapter (e.g. "john3:16")
  const m = s.match(/^(.+?)\s*(\d+)\s*[:.]\s*(\d+)\s*(?:-\s*(\d+))?\s*$/i);
  if (!m) return null;

  const [, bookRaw, chapter, verseStart, verseEnd] = m;
  const book = lookupBook(bookRaw);
  if (!book) return null;

  const ch = parseInt(chapter, 10);
  const vs = parseInt(verseStart, 10);
  const ve = verseEnd != null ? parseInt(verseEnd, 10) : null;

  if (ve !== null && (ve < vs || ve > vs + 50)) return null; // sanity cap at 50

  return { book, chapter: ch, verseStart: vs, verseEnd: ve };
}

/** Canonical display string: "Ephesians 4:9-10" */
export function toDisplayRef(parsed) {
  if (!parsed) return null;
  const { book, chapter, verseStart, verseEnd } = parsed;
  return verseEnd
    ? `${book.name} ${chapter}:${verseStart}-${verseEnd}`
    : `${book.name} ${chapter}:${verseStart}`;
}

/** OSIS passage id for api.bible: "EPH.4.9-EPH.4.10" */
export function toOSIS(parsed) {
  if (!parsed) return null;
  const { book, chapter, verseStart, verseEnd } = parsed;
  const o = book.osis;
  const start = `${o}.${chapter}.${verseStart}`;
  return verseEnd ? `${start}-${o}.${chapter}.${verseEnd}` : start;
}

/** Normalize any input string to canonical display format, or null if invalid. */
export function normalizeRef(input) {
  return toDisplayRef(parseRef(input));
}
