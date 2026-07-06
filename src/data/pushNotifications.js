// Regenerated when the daily-reminder sender was built — the old key was
// never paired with a working sender, so no real subscriber depended on it.
const VAPID_PUBLIC_KEY = 'BE-ksv1ZmPypVm1JfEGQni_PNHYTbcgeY5VRqO6uWtxEeITIpKe5Mstx_TRbZaPy_H8W49vngXUBVk9ETDzSnj0';

export const DEFAULT_REMINDER_HOUR = 8; // 8am, local time

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function getSubscriptionState() {
  if (!isPushSupported()) return 'unsupported';
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!reg) return 'unsubscribed';
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return 'unsubscribed';
  if (Notification.permission === 'denied') return 'denied';
  return 'subscribed';
}

export async function subscribePush(token, reminderHour = DEFAULT_REMINDER_HOUR) {
  if (!isPushSupported()) throw new Error('Push not supported');

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permission denied');

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...sub.toJSON(), reminderHour, timeZone }),
  });

  return sub;
}

// Change the reminder time for an already-subscribed account.
export async function updateReminderHour(token, reminderHour) {
  await fetch('/api/push/subscribe', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reminderHour }),
  });
}

export async function unsubscribePush(token) {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });

  await sub.unsubscribe();
}

// Standalone Worker that actually sends the daily reminder (Pages projects
// can't run Cron Triggers) — also exposes this on-demand test route so a
// subscription can be verified immediately instead of waiting for the
// scheduled hour to come around.
const REMINDERS_WORKER_URL = 'https://memory-verses-reminders.green-bar-511b.workers.dev';

export async function sendTestNotification(token) {
  const res = await fetch(`${REMINDERS_WORKER_URL}/test-send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || 'Could not send test notification.');
  return data;
}
