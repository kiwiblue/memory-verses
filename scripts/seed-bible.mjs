import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dir, '../../bible-data');

const TRANSLATIONS = [
  { file: 'KJV.csv', key: 'kjv' },
  { file: 'BSB.csv', key: 'bsb' },
];

const BATCH_SIZE = 500;

function parseCSV(content) {
  const lines = content.split('\n').slice(1); // skip header
  const verses = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Book,Chapter,Verse,Text — text may contain commas so split on first 3
    const firstComma = trimmed.indexOf(',');
    const secondComma = trimmed.indexOf(',', firstComma + 1);
    const thirdComma = trimmed.indexOf(',', secondComma + 1);
    if (firstComma === -1 || secondComma === -1 || thirdComma === -1) continue;
    const book = trimmed.slice(0, firstComma).trim();
    const chapter = trimmed.slice(firstComma + 1, secondComma).trim();
    const verse = trimmed.slice(secondComma + 1, thirdComma).trim();
    let text = trimmed.slice(thirdComma + 1).trim();
    // Remove surrounding quotes if present
    if (text.startsWith('"') && text.endsWith('"')) {
      text = text.slice(1, -1).replace(/""/g, '"');
    }
    text = text.trim();
    if (!book || !chapter || !verse || !text) continue;
    const reference = `${book} ${chapter}:${verse}`;
    verses.push({ reference, text });
  }
  return verses;
}

function escape(str) {
  return str.replace(/'/g, "''");
}

for (const { file, key } of TRANSLATIONS) {
  console.log(`\nSeeding ${key.toUpperCase()}...`);
  const content = readFileSync(join(dataDir, file), 'utf8');
  const verses = parseCSV(content);
  console.log(`  Parsed ${verses.length} verses`);

  let batch = 0;
  for (let i = 0; i < verses.length; i += BATCH_SIZE) {
    const chunk = verses.slice(i, i + BATCH_SIZE);
    const sql = chunk
      .map(v => `INSERT OR REPLACE INTO bible_verses (reference, translation, text) VALUES ('${escape(v.reference)}', '${key}', '${escape(v.text)}');`)
      .join('\n');

    const tmpFile = join(__dir, `_tmp_${key}_${batch}.sql`);
    writeFileSync(tmpFile, sql);

    process.stdout.write(`  Batch ${batch + 1} (${i + 1}-${Math.min(i + BATCH_SIZE, verses.length)})... `);
    execSync(`cd ${join(__dir, '..')} && npx wrangler d1 execute memory-verses-db --remote --file=${tmpFile}`, { stdio: 'pipe' });
    unlinkSync(tmpFile);
    console.log('✓');
    batch++;
  }
  console.log(`  ✅ ${key.toUpperCase()} done — ${verses.length} verses`);
}

console.log('\n✅ All done!');
