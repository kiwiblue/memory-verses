// Normalise common book name variants to match D1 storage
function normaliseBook(ref) {
  return ref
    .replace(/^Psalm\s+/i, 'Psalms ')
    .replace(/^Song of Solomon\s+/i, 'Song of Songs ')
    .replace(/^Revelations\s+/i, 'Revelation ');
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
