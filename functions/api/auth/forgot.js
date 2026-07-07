import { json, checkRateLimit, clientIp } from '../_helpers.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const email = (body.email || '').trim().toLowerCase();
  if (!email) return json({ error: 'Email is required.' }, 400);

  const allowed = await checkRateLimit(env, `forgot:${clientIp(request)}`, 5, 300);
  if (!allowed) return json({ error: 'Too many attempts. Please try again in a minute.' }, 429);

  const account = await env.DB.prepare('SELECT id FROM accounts WHERE email = ?').bind(email).first();

  // Always return success to avoid account enumeration
  if (!account) return json({ ok: true });

  // Invalidate any prior unused codes for this account
  await env.DB.prepare('UPDATE password_resets SET used = 1 WHERE account_id = ? AND used = 0')
    .bind(account.id).run();

  // Generate a cryptographically secure 6-digit code
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour

  await env.DB.prepare(
    'INSERT INTO password_resets (token, account_id, expires_at) VALUES (?, ?, ?)'
  ).bind(code, account.id, expiresAt).run();

  // Send via Resend if configured
  if (env.RESEND_API_KEY) {
    const fromEmail = env.RESEND_FROM_EMAIL || 'Memory.bible <noreply@memory.bible>';
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: 'Your Memory.bible reset code',
        html: `
          <p>Hi,</p>
          <p>Your password reset code is:</p>
          <h2 style="letter-spacing:6px;font-family:monospace">${code}</h2>
          <p>Enter this code at <a href="https://memory.bible">memory.bible</a>. It expires in 1 hour.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      }),
    }).catch(() => {}); // fire-and-forget; don't fail the request if Resend is down
  }

  return json({ ok: true });
}
