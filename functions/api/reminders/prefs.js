import { requireAuth, json } from '../_helpers.js';

// GET — return this account's current reminder preference.
export async function onRequestGet({ request, env }) {
  const accountId = await requireAuth(request, env);
  if (!accountId) return json({ error: 'Unauthorised' }, 401);

  const row = await env.DB.prepare(
    'SELECT reminder_channel, reminder_hour, reminder_timezone FROM accounts WHERE id = ?'
  ).bind(accountId).first();
  if (!row) return json({ error: 'Account not found' }, 404);

  return json({
    channel: row.reminder_channel,
    hour: row.reminder_hour,
    timezone: row.reminder_timezone,
  });
}

// POST — set the reminder channel (push|email), hour, and timezone. Used by
// the "Mobile | Email" choice in Settings; the push subscribe/patch endpoints
// also write here so `accounts` stays the single source of truth the
// reminders-worker cron reads from.
export async function onRequestPost({ request, env }) {
  const accountId = await requireAuth(request, env);
  if (!accountId) return json({ error: 'Unauthorised' }, 401);

  const { channel, hour, timezone } = await request.json();
  if (channel !== 'push' && channel !== 'email') {
    return json({ error: 'Invalid channel' }, 400);
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return json({ error: 'Invalid hour' }, 400);
  }
  const tz = typeof timezone === 'string' && timezone ? timezone : 'UTC';

  await env.DB.prepare(
    `UPDATE accounts SET reminder_channel = ?, reminder_hour = ?, reminder_timezone = ?, reminder_last_sent_date = NULL WHERE id = ?`
  ).bind(channel, hour, tz, accountId).run();

  return json({ ok: true });
}
