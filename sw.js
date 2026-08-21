const CACHE_NAME = 'cardiag-v61';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/app-icon.svg',
  './icons/app-icon-192.png',
  './icons/app-icon-512.png',
  './icons/nav-vehicle.svg',
  './icons/nav-engine.svg',
  './icons/nav-chassis.svg',
  './icons/nav-body.svg',
  './icons/nav-cabin.svg',
  './icons/nav-road.svg',
  './icons/nav-report.svg',
  './assets/landing/cardiag-inspection.webp',
  './assets/demo/rapport-expertise-demo-cardiag.pdf',
  './assets/vehicle-brands/renault.svg',
  './assets/vehicle-brands/peugeot.svg',
  './assets/vehicle-brands/citroen.svg',
  './assets/vehicle-brands/dacia.svg',
  './assets/vehicle-brands/volkswagen.svg',
  './assets/vehicle-brands/toyota.svg',
  './assets/vehicle-brands/bmw.svg',
  './assets/vehicle-brands/audi.svg',
  './assets/vehicle-brands/ford.svg',
  './assets/vehicle-brands/opel.svg',
  './assets/vehicle-brands/fiat.svg',
  './assets/vehicle-brands/nissan.svg',
  './assets/vehicle-brands/hyundai.svg',
  './assets/vehicle-brands/kia.svg',
  './css/styles.css?v=20260821-3',
  './css/wizard/premium.css?v=20260813-1',
  './css/theming/themes.css?v=20260820-3',
  './css/landing/landing.css?v=20260820-3',
  './css/media/media.css?v=20260813-1',
  './css/auth/auth.css?v=20260821-1',
  './css/onboarding/profile-onboarding.css?v=20260820-1',
  './css/ux/inspection-enhancements.css?v=20260821-2',
  './css/native/native.css?v=20260813-1',
  './css/settings/settings.css?v=20260820-3',
  './css/score/score.css?v=20260821-1',
  './css/reports/premium-report.css?v=20260814-2',
  './css/shared-report.css?v=20260813-1',
  './build-data.js?v=20260810-3',
  './js/db-loader.js?v=20260811-1',
  './js/app.js?v=20260821-7',
  './js/navigation/home-button.js?v=20260820-1',
  './js/landing/landing.js?v=20260821-1',
  './js/wizard.js?v=20260821-2',
  './js/i18n/i18n.js?v=20260821-4',
  './js/legacy-features.js?v=20260821-3',
  './js/personas.js?v=20260814-1',
  './js/wizard/vehicle-picker.js?v=20260821-1',
  './js/wizard/brand-picker.js?v=20260821-3',
  './js/wizard/interactions.js?v=20260813-1',
  './js/theming/theme-manager.js?v=20260820-3',
  './js/onboarding/profile-onboarding.js?v=20260820-1',
  './js/media/media-manager.js?v=20260813-2',
  './js/auth/firebase-client.js?v=20260820-4',
  './js/auth/auth-ui.js?v=20260820-4',
  './js/auth/consent.js?v=20260813-1',
  './js/native/permissions.js?v=20260813-1',
  './js/native/connectivity.js?v=20260813-1',
  './js/native/sync-queue.js?v=20260814-1',
  './js/native/app-links.js?v=20260813-1',
  './js/native/push.js?v=20260813-1',
  './js/settings/settings.js?v=20260820-4',
  './js/score/score-visuals.js?v=20260813-1',
  './js/records/records-gallery.js?v=20260821-1',
  './js/reports/negotiation.js?v=20260814-1',
  './js/reports/premium-report.js?v=20260814-7',
  './js/reports/report-sharing.js?v=20260814-2',
  './js/reports/shared-report.js?v=20260813-1',
  './js/chat-experience.js?v=20260820-1',
  './js/ux/inspection-enhancements.js?v=20260821-3',
  './assets/reference/section-guides/vehicule.svg',
  './assets/reference/section-guides/moteur.svg',
  './assets/reference/section-guides/chassis.svg',
  './assets/reference/section-guides/carrosserie.svg',
  './assets/reference/section-guides/habitacle.svg',
  './assets/reference/section-guides/essai-routier.svg',
  './assets/reference/section-guides/diagnostic.svg',
  './assets/reference/test-guides.svg',
  './js/pwa.js?v=20260820-2',
  './data/vehicles.json',
  './privacy.html',
  './terms.html',
  './account-deletion.html',
  './shared-report.html',
  './vendor/jspdf.umd.min.js',
  './vendor/qrcode.js',
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
  // Les réponses API peuvent contenir un diagnostic ou un rapport partagé :
  // elles ne doivent jamais être placées dans le Cache Storage du PWA.
  if (url.pathname.startsWith('/api/')) return;

  // Navigation : réseau d'abord pour récupérer les mises à jour, puis cache hors ligne.
  if (event.request.mode === 'navigate') {
    const staticPages = new Set(['/privacy.html','/terms.html','/account-deletion.html','/shared-report.html']);
    const fallbackKey = url.pathname.startsWith('/r/') ? './shared-report.html'
      : staticPages.has(url.pathname) ? `.${url.pathname}` : './index.html';
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(fallbackKey, copy));
          return response;
        })
        .catch(() => caches.match(fallbackKey))
    );
    return;
  }

  // Les données et ressources locales restent utilisables sans réseau.
  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        return response;
      }))
  );
});
