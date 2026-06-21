/**
 * Parses Memory_Verses_-_Digital_App.csv and writes src/data/verses.js
 * Usage: node scripts/parse-verses-csv.mjs <path-to-csv>
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const csvPath = process.argv[2] || resolve(__dir, '../../Downloads/Memory_Verses_-_Digital_App.csv');

function parseCSVLine(line) {
  const fields = [];
  let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { fields.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  fields.push(cur.trim());
  return fields;
}

// Minimal book-name normalisation matching what bibleRef.js would produce
function normaliseBook(raw) {
  const s = raw.trim()
    .replace(/^Psalm$/i, 'Psalms')
    .replace(/^Psalm\s+/i, 'Psalms ')
    .replace(/^Song of Solomon/i, 'Song of Songs')
    .replace(/^Revelations/i, 'Revelation');
  return s;
}

const csv = readFileSync(csvPath, 'utf8');
const [, ...dataLines] = csv.trim().split('\n');

const verses = dataLines.map(line => {
  const [sortStr, bookRaw, refPart, bracketRaw] = parseCSVLine(line);
  const sort_order = parseInt(sortStr, 10);
  const book = normaliseBook(bookRaw);
  const reference = `${book} ${refPart.trim()}`;
  const bracket = bracketRaw.toLowerCase().trim();
  return { id: sort_order, reference, bracket, sort_order };
});

const outPath = resolve(__dir, '../src/data/verses.js');
writeFileSync(outPath, `// Auto-generated — re-run scripts/parse-verses-csv.mjs to update
export const VERSES = ${JSON.stringify(verses, null, 2)};
`);

console.log(`✓ Written ${verses.length} verses to src/data/verses.js`);
verses.forEach(v => console.log(`  ${v.sort_order}. [${v.bracket}] ${v.reference}`));
