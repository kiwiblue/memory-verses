import { hashPassword, json, checkRateLimit, clientIp } from '../_helpers.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { email, code, newPassword } = body;
  if (!email || !code || !newPassword) return json({ error: 'All fields are required.' }, 400);
  if (newPassword.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);

  const allowed = await checkRateLimit(env, `reset:${clientIp(request)}`, 15, 300);
  if (!allowed) return json({ error: 'Too many attempts. Please try again in a minute.' }, 429);

  const now = Math.floor(Date.now() / 1000);
  const account = await env.DB.prepare('SELECT id, salt FROM accounts WHERE email = ?')
    .bind(email.trim().toLowerCase()).first();
  if (!account) return json({ error: 'Invalid or expired code.' }, 400);

  const MAX_ATTEMPTS = 5;

  const reset = await env.DB.prepare(
    'SELECT token, attempts FROM password_resets WHERE account_id = ? AND expires_at > ? AND used = 0'
  ).bind(account.id, now).first();

  if (!reset) return json({ error: 'Invalid or expired code.' }, 400);

  if (reset.attempts >= MAX_ATTEMPTS) {
    await env.DB.prepare('UPDATE password_resets SET used = 1 WHERE token = ?').bind(reset.token).run();
    return json({ error: 'Too many attempts. Please request a new code.' }, 429);
  }

  if (code.trim() !== reset.token) {
    await env.DB.prepare('UPDATE password_resets SET attempts = attempts + 1 WHERE token = ?').bind(reset.token).run();
    return json({ error: 'Invalid or expired code.' }, 400);
  }

  // Mark used and update password
  const newSalt = crypto.randomUUID().replace(/-/g, '');
  const newHash = await hashPassword(newPassword, newSalt);

  await env.DB.batch([
    env.DB.prepare('UPDATE password_resets SET used = 1 WHERE token = ?').bind(reset.token),
    env.DB.prepare('UPDATE accounts SET password_hash = ?, salt = ? WHERE id = ?')
      .bind(newHash, newSalt, account.id),
    // Invalidate all sessions so old password can't be reused
    env.DB.prepare('DELETE FROM sessions WHERE account_id = ?').bind(account.id),
  ]);

  return json({ ok: true });
}
