import { parseRef, toOSIS } from '../../src/api/bibleRef.js';

// api.bible-backed translations — mirrors src/api/bible.js's API_BIBLE_IDS.
const API_BIBLE_IDS = {
  niv:  '78a9f6124f344018-01',
  nkjv: '63097d2a0a2f7db3-01',
  nasb: 'b8ee27bcd1cae43a-01',
};
const EXTERNAL_TRANSLATIONS = new Set(['esv', 'niv', 'nkjv', 'nasb']);

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').replace(/¶\s*/g, '').replace(/\s+/g, ' ').trim();
}

// ESV and api.bible calls happen server-side so the API keys never ship in
// the client bundle. `ref` here is already the canonical display reference
// (e.g. "Ephesians 4:9-10") produced client-side by toDisplayRef.
async function fetchExternal(ref, translation, env) {
  if (translation === 'esv') {
    const token = env.ESV_TOKEN;
    console.log('DEBUG esv token present:', !!token, 'len', token?.length);
    if (!token) return null;
    const url = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(ref)}&include-headings=false&include-section-headings=false&include-footnotes=false&include-verse-numbers=false&include-short-copyright=false&include-passage-references=false`;
    const res = await fetch(url, { headers: { Authorization: `Token ${token}` } });
    console.log('DEBUG esv fetch status:', res.status);
    if (!res.ok) return null;
    const data = await res.json();
    const passages = data.passages;
    if (!passages || passages.length === 0) return null;
    return passages[0].trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim() || null;
  }

  const bibleId = API_BIBLE_IDS[translation];
  const key = env.API_BIBLE_KEY;
  if (!bibleId || !key) return null;
  const parsed = parseRef(ref);
  const osisId = toOSIS(parsed);
  if (!osisId) return null;
  const url = `https://api.scripture.api.bible/v1/bibles/${bibleId}/passages/${osisId}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=false`;
  const res = await fetch(url, { headers: { 'api-key': key } });
  if (!res.ok) return null;
  const data = await res.json();
  const content = data?.data?.content;
  if (!content) return null;
  return stripHtml(content).trim() || null;
}

// Normalise common book name variants to match D1 storage.
// D1 stores numbered books with Roman-numeral prefixes ("I John", "II
// Corinthians") and Revelation as "Revelation of John", so map the app's
// canonical Arabic-numeral references onto those forms before querying.
function normaliseBook(ref) {
  return ref
    .replace(/^Psalm\s+/i, 'Psalms ')
    .replace(/^Song of Solomon\s+/i, 'Song of Songs ')
    .replace(/^Revelations?\s+/i, 'Revelation of John ')
    .replace(/^3\s+/, 'III ')
    .replace(/^2\s+/, 'II ')
    .replace(/^1\s+/, 'I ');
}

// Expand "Book Chapter:start-end" into individual verse references
function expandRange(ref) {
  const m = ref.match(/^(.+\s+\d+):(\d+)-(\d+)$/);
  if (!m) return null;
  const [, bookChap, start, end] = m;
  const s = parseInt(start, 10), e = parseInt(end, 10);
  if (e <= s || e > s + 50) return null; // sanity check
  const refs = [];
  for (let v = s; v <= e; v++) refs.push(`${bookChap}:${v}`);
  return refs;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const rawRef = url.searchParams.get('ref');
  const translation = url.searchParams.get('translation')?.toLowerCase();

  if (!rawRef) {
    return new Response(JSON.stringify({ error: 'Missing ref parameter' }), { status: 400, headers: CORS });
  }

  if (translation && EXTERNAL_TRANSLATIONS.has(translation)) {
    try {
      const text = await fetchExternal(rawRef, translation, env);
      if (!text) return new Response(JSON.stringify({ error: 'Verse not found' }), { status: 404, headers: CORS });
      return new Response(JSON.stringify({ reference: rawRef, translation, text }), { headers: CORS });
    } catch {
      return new Response(JSON.stringify({ error: 'Upstream error' }), { status: 502, headers: CORS });
    }
  }

  const ref = normaliseBook(rawRef);
  const rangeRefs = expandRange(ref);

  try {
    if (rangeRefs) {
      // Verse range query — fetch all verses and concatenate
      const placeholders = rangeRefs.map(() => '?').join(',');
      let rows;

      if (translation) {
        const { results } = await env.DB.prepare(
          `SELECT reference, text FROM bible_verses WHERE reference IN (${placeholders}) AND translation = ?
           ORDER BY CAST(SUBSTR(reference, INSTR(reference, ':') + 1) AS INTEGER)`
        ).bind(...rangeRefs, translation).all();
        rows = results;

        if (!rows.length) {
          return new Response(JSON.stringify({ error: 'Verse not found' }), { status: 404, headers: CORS });
        }
        const text = rows.map(r => r.text.trim()).join(' ');
        return new Response(JSON.stringify({ reference: ref, translation, text }), { headers: CORS });

      } else {
        const { results } = await env.DB.prepare(
          `SELECT reference, translation, text FROM bible_verses WHERE reference IN (${placeholders})
           ORDER BY CAST(SUBSTR(reference, INSTR(reference, ':') + 1) AS INTEGER), translation`
        ).bind(...rangeRefs).all();

        if (!results.length) {
          return new Response(JSON.stringify({ error: 'Verse not found' }), { status: 404, headers: CORS });
        }

        // Group by translation, concatenate verse text
        const byTrans = {};
        for (const row of results) {
          if (!byTrans[row.translation]) byTrans[row.translation] = [];
          byTrans[row.translation].push(row.text.trim());
        }
        const verse = { reference: ref };
        for (const [trans, texts] of Object.entries(byTrans)) {
          verse[trans] = texts.join(' ');
        }
        return new Response(JSON.stringify(verse), { headers: CORS });
      }

    } else {
      // Single verse query
      if (translation) {
        const row = await env.DB.prepare(
          'SELECT text FROM bible_verses WHERE reference = ? AND translation = ?'
        ).bind(ref, translation).first();

        if (!row) {
          return new Response(JSON.stringify({ error: 'Verse not found' }), { status: 404, headers: CORS });
        }
        return new Response(JSON.stringify({ reference: ref, translation, text: row.text }), { headers: CORS });

      } else {
        const { results } = await env.DB.prepare(
          'SELECT translation, text FROM bible_verses WHERE reference = ?'
        ).bind(ref).all();

        if (!results.length) {
          return new Response(JSON.stringify({ error: 'Verse not found' }), { status: 404, headers: CORS });
        }
        const verse = { reference: ref };
        for (const row of results) verse[row.translation] = row.text;
        return new Response(JSON.stringify(verse), { headers: CORS });
      }
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
