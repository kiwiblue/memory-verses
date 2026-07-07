import { requireAuth, json } from '../_helpers.js';

export async function onRequestPost({ request, env }) {
  const accountId = await requireAuth(request, env);
  if (!accountId) return json({ error: 'Unauthorised' }, 401);

  const { endpoint, keys, reminderHour, timeZone } = await request.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return json({ error: 'Invalid subscription' }, 400);
  }
  const hour = Number.isInteger(reminderHour) && reminderHour >= 0 && reminderHour <= 23 ? reminderHour : 8;
  const tz = typeof timeZone === 'string' && timeZone ? timeZone : 'UTC';

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, reminder_hour, timezone)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        user_id = excluded.user_id,
        reminder_hour = excluded.reminder_hour,
        timezone = excluded.timezone,
        last_sent_date = NULL
    `).bind(accountId, endpoint, keys.p256dh, keys.auth, hour, tz),
    // `accounts` is the source of truth the reminders-worker cron reads from
    // (it decides push vs. email per-account) — subscribing to push always
    // selects the push channel.
    env.DB.prepare(
      'UPDATE accounts SET reminder_channel = ?, reminder_hour = ?, reminder_timezone = ?, reminder_last_sent_date = NULL WHERE id = ?'
    ).bind('push', hour, tz, accountId),
  ]);

  return json({ ok: true });
}

// PATCH — update the reminder hour for all of this account's subscriptions
// (a user may have the app installed on more than one device).
export async function onRequestPatch({ request, env }) {
  const accountId = await requireAuth(request, env);
  if (!accountId) return json({ error: 'Unauthorised' }, 401);

  const { reminderHour } = await request.json();
  if (!Number.isInteger(reminderHour) || reminderHour < 0 || reminderHour > 23) {
    return json({ error: 'Invalid hour' }, 400);
  }

  await env.DB.batch([
    env.DB.prepare(
      'UPDATE push_subscriptions SET reminder_hour = ?, last_sent_date = NULL WHERE user_id = ?'
    ).bind(reminderHour, accountId),
    env.DB.prepare(
      'UPDATE accounts SET reminder_hour = ?, reminder_last_sent_date = NULL WHERE id = ?'
    ).bind(reminderHour, accountId),
  ]);

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
