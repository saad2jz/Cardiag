const CACHE_NAME = 'fiche-expert-auto-v4';
const APP_SHELL = [
  './',
  'index.html',
  'manifest.json',
  'icons/app-icon.svg',
  'css/styles.css?v=20260807-2',
  'build-data.js?v=20260807-2',
  'js/db-loader.js?v=20260807-2',
  'js/app.js?v=20260807-2',
  'js/legacy-features.js?v=20260807-2',
  'js/chat-experience.js?v=20260807-2',
  'js/pwa.js?v=20260807-2',
  'data/vehicles.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      });
      return cached || network.catch(() => caches.match('index.html'));
    })
  );
});
