const VAPID_PUBLIC_KEY = 'BIaODg6JkcX5HBuBb0vzc4z11Y9-KsEw1nOl9K_tC6mRAoKFL4UR5SXZtYSDK9-q4q23JjojQ0muZwvGxBy7eGU';

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

export async function subscribePush(token) {
  if (!isPushSupported()) throw new Error('Push not supported');

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permission denied');

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(sub.toJSON()),
  });

  return sub;
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
