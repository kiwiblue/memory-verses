self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Memory.bible';
  const options = {
    body: data.body || 'Time to revise your verses.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
