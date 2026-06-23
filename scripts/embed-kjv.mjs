// Fetches KJV text for every verse in verses.js from the live API
// and writes it back into the file as a `kjv` field.
// Run from the app/ directory: node scripts/embed-kjv.mjs

import { readFileSync, writeFileSync } from 'fs';

const src = readFileSync('./src/data/verses.js', 'utf8');
const match = src.match(/export const VERSES = (\[[\s\S]*?\]);/);
if (!match) { console.error('Could not parse VERSES'); process.exit(1); }

const verses = JSON.parse(match[1]);
const BASE = 'https://memory.bible';

// D1 stores books with Roman numerals and expanded names
const BOOK_MAP = {
  '1 Corinthians': 'I Corinthians',
  '2 Corinthians': 'II Corinthians',
  '1 Thessalonians': 'I Thessalonians',
  '2 Thessalonians': 'II Thessalonians',
  '1 Timothy': 'I Timothy',
  '2 Timothy': 'II Timothy',
  '1 Peter': 'I Peter',
  '2 Peter': 'II Peter',
  '1 John': 'I John',
  '2 John': 'II John',
  '3 John': 'III John',
  'Revelation': 'Revelation of John',
};

function toD1Ref(ref) {
  for (const [from, to] of Object.entries(BOOK_MAP)) {
    if (ref.startsWith(from + ' ') || ref.startsWith(from + ':')) {
      return to + ref.slice(from.length);
    }
  }
  return ref;
}

let ok = 0, fail = 0;

for (const v of verses) {
  try {
    const url = `${BASE}/api/verse?ref=${encodeURIComponent(toD1Ref(v.reference))}&translation=kjv`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.text) {
      v.kjv = data.text.trim();
      ok++;
      console.log(`✓ ${v.reference}`);
    } else {
      fail++;
      console.warn(`✗ ${v.reference} — no text`);
    }
  } catch (e) {
    fail++;
    console.warn(`✗ ${v.reference} — ${e.message}`);
  }
  // Small delay to avoid hammering the API
  await new Promise(r => setTimeout(r, 80));
}

const newSrc = src.replace(
  /export const VERSES = \[[\s\S]*?\];/,
  `// Auto-generated — re-run scripts/parse-verses-csv.mjs to update\nexport const VERSES = ${JSON.stringify(verses, null, 2)};`
);

writeFileSync('./src/data/verses.js', newSrc);
console.log(`\nDone: ${ok} ok, ${fail} failed`);
