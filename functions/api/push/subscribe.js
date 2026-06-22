import { requireAuth, json } from '../_helpers.js';

export async function onRequestPost({ request, env }) {
  const accountId = await requireAuth(request, env);
  if (!accountId) return json({ error: 'Unauthorised' }, 401);

  const { endpoint, keys } = await request.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return json({ error: 'Invalid subscription' }, 400);
  }

  await env.DB.prepare(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id
  `).bind(accountId, endpoint, keys.p256dh, keys.auth).run();

  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  const accountId = await requireAuth(request, env);
  if (!accountId) return json({ error: 'Unauthorised' }, 401);

  const { endpoint } = await request.json();
  if (!endpoint) return json({ error: 'Missing endpoint' }, 400);

  await env.DB.prepare(
    'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?'
  ).bind(accountId, endpoint).run();

  return json({ ok: true });
}
