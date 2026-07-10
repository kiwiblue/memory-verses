// ── Push notifications ──────────────────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Memory.bible';
  const options = {
    body: data.body || 'Time to revise your verses.',
    icon: '/icons/icon-192.png',
    badge: '/icons/favicon-48.png',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});

// ── Offline app shell ───────────────────────────────────────────────────────
// Runtime caching (no build-time manifest needed): the app shell and hashed
// JS/CSS/icons are cached as they're first fetched online, so the installed PWA
// opens offline instead of showing a blank page. Deliberately does NOT cache
// /api/* (network-only) or /version.json (the in-app update checker must always
// hit the network), and navigations are network-first so a new deploy is picked
// up immediately online while still falling back to the cached shell offline.
const CACHE = 'mv-shell-v1';
const APP_SHELL = [
  '/', '/index.html', '/manifest.json',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(APP_SHELL).catch(() => {})) // don't fail install if one asset 404s
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // leave cross-origin (Bible APIs, etc) to the network
  if (url.pathname.startsWith('/api/')) return;       // API: network-only, never cache
  if (url.pathname === '/version.json') return;       // update checker fetches this fresh itself

  // Navigations / HTML: network-first (fresh build online), cached shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('/index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets (content-hashed JS/CSS, icons, images): cache-first, filling
  // the cache on first fetch so they're available on the next offline load.
  event.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request).then(res => {
        if (res.ok && (res.type === 'basic' || res.type === 'default')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached)
    )
  );
});
