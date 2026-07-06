import { hashPassword, json } from '../_helpers.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const email = (body.email || '').trim().toLowerCase();
  const { password, profiles } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'A valid email address is required.' }, 400);
  }
  if (!password || password.length < 8) {
    return json({ error: 'Password must be at least 8 characters.' }, 400);
  }

  const existing = await env.DB.prepare('SELECT id FROM accounts WHERE email = ?').bind(email).first();
  if (existing) return json({ error: 'An account with that email already exists.' }, 409);

  const salt = crypto.randomUUID().replace(/-/g, '');
  const passwordHash = await hashPassword(password, salt);
  const accountId = crypto.randomUUID();

  await env.DB.prepare(
    'INSERT INTO accounts (id, email, password_hash, salt) VALUES (?, ?, ?, ?)'
  ).bind(accountId, email, passwordHash, salt).run();

  // Persist any local profiles the client sent
  if (Array.isArray(profiles) && profiles.length > 0) {
    const now = Math.floor(Date.now() / 1000);
    const stmts = profiles.map(p =>
      env.DB.prepare(
        `INSERT INTO cloud_profiles (id, account_id, profile_json, progress_json, trans_json, custom_json, hidden_json, streak_json, order_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET profile_json=excluded.profile_json, progress_json=excluded.progress_json,
           trans_json=excluded.trans_json, custom_json=excluded.custom_json, hidden_json=excluded.hidden_json,
           streak_json=excluded.streak_json, order_json=excluded.order_json, updated_at=excluded.updated_at`
      ).bind(
        p.id, accountId,
        p.profile_json || '{}',
        p.progress_json || '{}',
        p.trans_json || '{}',
        p.custom_json || '[]',
        p.hidden_json || '[]',
        p.streak_json || '{}',
        p.order_json || '[]',
        now
      )
    );
    await env.DB.batch(stmts);
  }

  // Create session (90-day expiry stored as unix seconds)
  const token = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;
  await env.DB.prepare(
    'INSERT INTO sessions (token, account_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, accountId, expiresAt).run();

  return json({ token, accountId, email });
}
