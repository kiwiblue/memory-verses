import { hashToken, json } from '../_helpers.js';

export async function onRequestPost({ request, env }) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (token) {
    // Sessions are stored hashed; also match a legacy plaintext row.
    await env.DB.prepare('DELETE FROM sessions WHERE token = ? OR token = ?')
      .bind(await hashToken(token), token).run();
  }
  return json({ ok: true });
}
