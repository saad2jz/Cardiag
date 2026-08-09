const CACHE_NAME = 'cardiag-v11';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/app-icon.svg',
  './icons/app-icon-192.png',
  './icons/app-icon-512.png',
  './css/styles.css?v=20260810-1',
  './build-data.js?v=20260810-1',
  './js/db-loader.js?v=20260810-1',
  './js/app.js?v=20260810-1',
  './js/legacy-features.js?v=20260810-1',
  './js/chat-experience.js?v=20260810-1',
  './js/pwa.js?v=20260810-1',
  './data/vehicles.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
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
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation : réseau d'abord pour récupérer les mises à jour, puis cache hors ligne.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Les données et ressources locales restent utilisables sans réseau.
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then((cached) => cached || fetch(event.request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        return response;
      }))
  );
});
