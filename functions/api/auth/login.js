import { hashPassword, hashToken, json, checkRateLimit, clientIp } from '../_helpers.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const email = (body.email || '').trim().toLowerCase();
  const { password } = body;

  if (!email || !password) return json({ error: 'Email and password are required.' }, 400);

  const allowed = await checkRateLimit(env, `login:${clientIp(request)}`, 10, 60);
  if (!allowed) return json({ error: 'Too many attempts. Please try again in a minute.' }, 429);

  const account = await env.DB.prepare(
    'SELECT id, password_hash, salt FROM accounts WHERE email = ?'
  ).bind(email).first();

  if (!account) return json({ error: 'Incorrect email or password.' }, 401);

  const hash = await hashPassword(password, account.salt);
  if (hash !== account.password_hash) return json({ error: 'Incorrect email or password.' }, 401);

  // Create new session — store only the hash; the raw token is returned to the
  // client and never persisted.
  const token = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;
  await env.DB.prepare(
    'INSERT INTO sessions (token, account_id, expires_at) VALUES (?, ?, ?)'
  ).bind(await hashToken(token), account.id, expiresAt).run();

  // Return all cloud profiles for this account
  const rows = await env.DB.prepare(
    'SELECT id, profile_json, progress_json, trans_json, custom_json, hidden_json, streak_json, order_json, updated_at FROM cloud_profiles WHERE account_id = ?'
  ).bind(account.id).all();

  const profiles = (rows.results || []).map(r => ({
    id: r.id,
    profile_json: r.profile_json,
    progress_json: r.progress_json,
    trans_json: r.trans_json,
    custom_json: r.custom_json,
    hidden_json: r.hidden_json,
    streak_json: r.streak_json || '{}',
    order_json: r.order_json || '[]',
    updated_at: r.updated_at,
  }));

  return json({ token, accountId: account.id, email, profiles });
}
