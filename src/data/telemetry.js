import { loadAuth } from './auth.js';

function getSessionId() {
  try {
    let id = sessionStorage.getItem('mv-session-id');
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('mv-session-id', id); }
    return id;
  } catch { return 'unknown'; }
}

export function logEvent(eventType, payload = {}) {
  try {
    const auth = loadAuth();
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        session_id: getSessionId(),
        account_id: auth?.accountId || null,
        payload,
      }),
    }).catch(() => {});
  } catch { /* never throw from telemetry */ }
}
