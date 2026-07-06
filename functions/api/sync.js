import { requireAuth, json } from './_helpers.js';

// GET /api/sync — pull all cloud profiles for the authenticated account
export async function onRequestGet({ request, env }) {
  const accountId = await requireAuth(request, env);
  if (!accountId) return json({ error: 'Unauthorised' }, 401);

  const rows = await env.DB.prepare(
    'SELECT id, profile_json, progress_json, trans_json, custom_json, hidden_json, streak_json, order_json, updated_at FROM cloud_profiles WHERE account_id = ?'
  ).bind(accountId).all();

  return json({ profiles: rows.results || [] });
}

// DELETE /api/sync — remove a single cloud profile by id
export async function onRequestDelete({ request, env }) {
  const accountId = await requireAuth(request, env);
  if (!accountId) return json({ error: 'Unauthorised' }, 401);

  const url = new URL(request.url);
  const profileId = url.searchParams.get('id');
  if (!profileId) return json({ error: 'Missing id' }, 400);

  // Only allow deleting profiles that belong to this account
  await env.DB.prepare(
    'DELETE FROM cloud_profiles WHERE id = ? AND account_id = ?'
  ).bind(profileId, accountId).run();

  return json({ ok: true });
}

// POST /api/sync — push/upsert all profiles for the authenticated account
export async function onRequestPost({ request, env }) {
  const accountId = await requireAuth(request, env);
  if (!accountId) return json({ error: 'Unauthorised' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { profiles } = body;
  if (!Array.isArray(profiles) || profiles.length === 0) return json({ ok: true });

  const now = Math.floor(Date.now() / 1000);
  const stmts = profiles.map(p =>
    env.DB.prepare(
      `INSERT INTO cloud_profiles (id, account_id, profile_json, progress_json, trans_json, custom_json, hidden_json, streak_json, order_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         profile_json  = excluded.profile_json,
         progress_json = excluded.progress_json,
         trans_json    = excluded.trans_json,
         custom_json   = excluded.custom_json,
         hidden_json   = excluded.hidden_json,
         streak_json   = excluded.streak_json,
         order_json    = excluded.order_json,
         updated_at    = excluded.updated_at`
    ).bind(
      p.id, accountId,
      p.profile_json  || '{}',
      p.progress_json || '{}',
      p.trans_json    || '{}',
      p.custom_json   || '[]',
      p.hidden_json   || '[]',
      p.streak_json   || '{}',
      p.order_json    || '[]',
      now
    )
  );

  await env.DB.batch(stmts);
  return json({ ok: true, synced_at: now });
}
