import { hashPassword, hashToken, requireAuth, json } from '../_helpers.js';

export async function onRequestPost({ request, env }) {
  const accountId = await requireAuth(request, env);
  if (!accountId) return json({ error: 'Unauthorised' }, 401);

  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { type, currentPassword } = body;
  if (!currentPassword) return json({ error: 'Current password is required.' }, 400);

  // Verify current password
  const account = await env.DB.prepare('SELECT password_hash, salt, email FROM accounts WHERE id = ?')
    .bind(accountId).first();
  if (!account) return json({ error: 'Account not found.' }, 404);

  const hash = await hashPassword(currentPassword, account.salt);
  if (hash !== account.password_hash) return json({ error: 'Current password is incorrect.' }, 401);

  if (type === 'email') {
    const newEmail = (body.newEmail || '').trim().toLowerCase();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return json({ error: 'A valid email address is required.' }, 400);
    }
    const conflict = await env.DB.prepare('SELECT id FROM accounts WHERE email = ? AND id != ?')
      .bind(newEmail, accountId).first();
    if (conflict) return json({ error: 'That email is already in use.' }, 409);

    await env.DB.prepare('UPDATE accounts SET email = ? WHERE id = ?').bind(newEmail, accountId).run();
    return json({ ok: true, email: newEmail });
  }

  if (type === 'password') {
    const { newPassword } = body;
    if (!newPassword || newPassword.length < 8) {
      return json({ error: 'New password must be at least 8 characters.' }, 400);
    }
    const newSalt = crypto.randomUUID().replace(/-/g, '');
    const newHash = await hashPassword(newPassword, newSalt);
    await env.DB.prepare('UPDATE accounts SET password_hash = ?, salt = ? WHERE id = ?')
      .bind(newHash, newSalt, accountId).run();
    // Revoke every other session (a stolen token stops working after a password
    // change) but keep the caller's own. Tokens are stored hashed; exclude both
    // the hashed and a legacy plaintext form of the current token.
    await env.DB.prepare('DELETE FROM sessions WHERE account_id = ? AND token != ? AND token != ?')
      .bind(accountId, await hashToken(token), token).run();
    return json({ ok: true });
  }

  return json({ error: 'Unknown update type.' }, 400);
}
