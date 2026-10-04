const CACHE_NAME = 'my-overtime-v2';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/hadi-icon.png',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_ASSETS.map((url) =>
          fetch(url, { cache: 'reload' })
            .then((response) => response.ok ? cache.put(url, response) : null)
            .catch(() => null)
        )
      )
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.pathname === '/sw.js' || url.pathname.startsWith('/api/')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || caches.match('/');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const focused = clientList.find((client) => client.focused) || clientList[0];
      if (focused) return focused.focus();
      return clients.openWindow('/');
    })
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'My Overtime', body: 'আপনার কাজ সেভ করুন!' };
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/hadi-icon.png',
    badge: '/icon.svg',
    vibrate: [300, 100, 300],
    tag: 'daily-reminder',
    renotify: true,
    data: { url: '/' },
    actions: [{ action: 'open', title: 'Open App', icon: '/icon.svg' }],
  }));
});
