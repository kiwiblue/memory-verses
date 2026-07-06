import { json } from './_helpers.js';

// Keep in sync with every logEvent(...) call site in src/.
const VALID_EVENT_TYPES = ['session_start', 'exercise_complete', 'onboarding_step_complete', 'verse_added'];
const MAX_PAYLOAD_BYTES = 4096;

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { event_type, session_id, account_id, payload } = body ?? {};

  if (!event_type || typeof event_type !== 'string' || !VALID_EVENT_TYPES.includes(event_type.trim())) {
    return json({ error: 'Invalid event_type' }, 400);
  }
  if (!session_id || typeof session_id !== 'string' || session_id.trim() === '') {
    return json({ error: 'session_id is required' }, 400);
  }

  const payloadStr = payload != null
    ? (typeof payload === 'string' ? payload : JSON.stringify(payload))
    : '{}';
  if (payloadStr.length > MAX_PAYLOAD_BYTES) {
    return json({ error: 'payload too large' }, 400);
  }

  try {
    await env.DB.prepare(
      'INSERT INTO events (event_type, session_id, account_id, payload) VALUES (?, ?, ?, ?)'
    ).bind(
      event_type.trim(),
      session_id.trim(),
      account_id ?? null,
      payloadStr
    ).run();
  } catch {
    return json({ error: 'Failed to record event' }, 400);
  }

  return json({ ok: true });
}
