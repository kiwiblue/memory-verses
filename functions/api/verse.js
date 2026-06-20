// Normalise reference to match how the CSV data was stored
function normaliseRef(ref) {
  return ref
    .replace(/^Psalm\s+/i, 'Psalms ')
    .replace(/^Song of Solomon\s+/i, 'Song of Songs ')
    .replace(/^Song of Songs\s+/i, 'Song of Songs ');
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const rawRef = url.searchParams.get('ref');
  const ref = rawRef ? normaliseRef(rawRef) : null;
  const translation = url.searchParams.get('translation')?.toLowerCase();

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (!ref) {
    return new Response(JSON.stringify({ error: 'Missing ref parameter' }), { status: 400, headers: corsHeaders });
  }

  try {
    if (translation) {
      // Single translation lookup
      const row = await env.DB.prepare(
        'SELECT text FROM bible_verses WHERE reference = ? AND translation = ?'
      ).bind(ref, translation).first();

      if (!row) {
        return new Response(JSON.stringify({ error: 'Verse not found' }), { status: 404, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ reference: ref, translation, text: row.text }), { headers: corsHeaders });
    } else {
      // All available translations for this reference
      const { results } = await env.DB.prepare(
        'SELECT translation, text FROM bible_verses WHERE reference = ?'
      ).bind(ref).all();

      if (!results.length) {
        return new Response(JSON.stringify({ error: 'Verse not found' }), { status: 404, headers: corsHeaders });
      }

      const verse = { reference: ref };
      for (const row of results) {
        verse[row.translation] = row.text;
      }
      return new Response(JSON.stringify(verse), { headers: corsHeaders });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500, headers: corsHeaders });
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
