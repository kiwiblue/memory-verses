import { json, requireAuth } from './_helpers.js';

const VALID_TYPES = ['bug', 'feature', 'general'];
const TYPE_LABELS = { bug: 'Bug report', feature: 'Feature request', general: 'General feedback' };

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function onRequestPost({ request, env }) {
  const account_id = await requireAuth(request, env);
  if (!account_id) return json({ error: 'Not authenticated.' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const type    = (body.type || '').trim();
  const message = (body.message || '').trim();

  if (!VALID_TYPES.includes(type)) return json({ error: 'Invalid type.' }, 400);
  if (!message || message.length < 5)  return json({ error: 'Message too short.' }, 400);
  if (message.length > 2000)   return json({ error: 'Message too long.' }, 400);

  // Verify account exists
  const account = await env.DB.prepare('SELECT id, email FROM accounts WHERE id = ?')
    .bind(account_id).first();
  if (!account) return json({ error: 'Account not found.' }, 401);

  await env.DB.prepare(
    'INSERT INTO feedback (account_id, type, message) VALUES (?, ?, ?)'
  ).bind(account_id, type, message).run();

  // Email notification via Resend (fire-and-forget)
  if (env.RESEND_API_KEY) {
    const from = env.RESEND_FROM_EMAIL || 'Memory.bible <noreply@memory.bible>';
    const adminEmail = env.ADMIN_EMAIL || 'info@evangelism.com.au';
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: adminEmail,
        subject: `[memory.bible] ${TYPE_LABELS[type]}`,
        html: `
          <p><strong>Type:</strong> ${TYPE_LABELS[type]}</p>
          <p><strong>From:</strong> ${escapeHtml(account.email)} (${escapeHtml(account_id)})</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left:3px solid #ccc;margin:0;padding:0 0 0 12px;color:#444">
            ${escapeHtml(message).replace(/\n/g, '<br>')}
          </blockquote>
        `,
      }),
    }).catch(() => {});
  }

  return json({ ok: true });
}
