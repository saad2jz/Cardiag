const CACHE_NAME = 'cardiag-v147';
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
  './assets/landing/empty-state-inspection.webp',
  './assets/demo/rapport-expertise-demo-cardiag.pdf',
  './assets/vehicle-brands/abarth.png',
  './assets/vehicle-brands/acura.png',
  './assets/vehicle-brands/aiways.png',
  './assets/vehicle-brands/alfa-romeo.png',
  './assets/vehicle-brands/alpine.png',
  './assets/vehicle-brands/alpina.png',
  './assets/vehicle-brands/aston-martin.png',
  './assets/vehicle-brands/audi.png',
  './assets/vehicle-brands/bentley.png',
  './assets/vehicle-brands/bmw.png',
  './assets/vehicle-brands/bugatti.png',
  './assets/vehicle-brands/buick.png',
  './assets/vehicle-brands/byd.png',
  './assets/vehicle-brands/cadillac.png',
  './assets/vehicle-brands/chevrolet.png',
  './assets/vehicle-brands/chery.png',
  './assets/vehicle-brands/chrysler.png',
  './assets/vehicle-brands/citroen.png',
  './assets/vehicle-brands/cupra.png',
  './assets/vehicle-brands/dacia.png',
  './assets/vehicle-brands/daihatsu.png',
  './assets/vehicle-brands/de-tomaso.png',
  './assets/vehicle-brands/donkervoort.png',
  './assets/vehicle-brands/dodge.png',
  './assets/vehicle-brands/ds.png',
  './assets/vehicle-brands/faraday-future.png',
  './assets/vehicle-brands/ferrari.png',
  './assets/vehicle-brands/fiat.png',
  './assets/vehicle-brands/fisker.png',
  './assets/vehicle-brands/ford.png',
  './assets/vehicle-brands/geely.png',
  './assets/vehicle-brands/genesis.png',
  './assets/vehicle-brands/gmc.png',
  './assets/vehicle-brands/hennessey.png',
  './assets/vehicle-brands/honda.png',
  './assets/vehicle-brands/hyundai.png',
  './assets/vehicle-brands/infiniti.png',
  './assets/vehicle-brands/isuzu.png',
  './assets/vehicle-brands/iveco.png',
  './assets/vehicle-brands/jaguar.png',
  './assets/vehicle-brands/jeep.png',
  './assets/vehicle-brands/kia.png',
  './assets/vehicle-brands/koenigsegg.png',
  './assets/vehicle-brands/lamborghini.png',
  './assets/vehicle-brands/land-rover.png',
  './assets/vehicle-brands/leapmotor.png',
  './assets/vehicle-brands/lexus.png',
  './assets/vehicle-brands/lincoln.png',
  './assets/vehicle-brands/lotus.png',
  './assets/vehicle-brands/lucid.png',
  './assets/vehicle-brands/mahindra.png',
  './assets/vehicle-brands/maserati.png',
  './assets/vehicle-brands/maybach.png',
  './assets/vehicle-brands/mazda.png',
  './assets/vehicle-brands/mclaren.png',
  './assets/vehicle-brands/mercedes-benz.png',
  './assets/vehicle-brands/mini.png',
  './assets/vehicle-brands/mitsubishi.png',
  './assets/vehicle-brands/morgan.png',
  './assets/vehicle-brands/nissan.png',
  './assets/vehicle-brands/nio.png',
  './assets/vehicle-brands/opel.png',
  './assets/vehicle-brands/pagani.png',
  './assets/vehicle-brands/peugeot.png',
  './assets/vehicle-brands/polestar.png',
  './assets/vehicle-brands/porsche.png',
  './assets/vehicle-brands/ram.png',
  './assets/vehicle-brands/renault.png',
  './assets/vehicle-brands/rimac.png',
  './assets/vehicle-brands/rivian.png',
  './assets/vehicle-brands/rolls-royce.png',
  './assets/vehicle-brands/saleen.png',
  './assets/vehicle-brands/seat.png',
  './assets/vehicle-brands/skoda.png',
  './assets/vehicle-brands/ssangyong.png',
  './assets/vehicle-brands/subaru.png',
  './assets/vehicle-brands/suzuki.png',
  './assets/vehicle-brands/tesla.png',
  './assets/vehicle-brands/toyota.png',
  './assets/vehicle-brands/tvr.png',
  './assets/vehicle-brands/vauxhall.png',
  './assets/vehicle-brands/vinfast.png',
  './assets/vehicle-brands/volkswagen.png',
  './assets/vehicle-brands/volvo.png',
  './assets/vehicle-brands/wiesmann.png',
  './assets/vehicle-brands/xpeng.png',
  './assets/vehicle-brands/zeekr.png',
  './css/styles.css?v=20260826-1',
  './css/app-redesign.css?v=20260823-2',
  './css/app-brand.css?v=20260901-1',
  './css/wizard/premium.css?v=20260813-1',
  './css/theming/themes.css?v=20260820-3',
  './css/landing/landing.css?v=20260901-1',
  './css/media/media.css?v=20260813-1',
  './css/auth/auth.css?v=20260830-1',
  './css/onboarding/profile-onboarding.css?v=20260824-2',
  './css/ux/inspection-enhancements.css?v=20260821-2',
  './css/native/native.css?v=20260813-1',
  './css/settings/settings.css?v=20260820-3',
  './css/score/score.css?v=20260829-1',
  './css/native/obd2.css?v=20260830-1',
  './css/reports/premium-report.css?v=20260814-2',
  './css/shared-report.css?v=20260813-1',
  './build-data.js?v=20260823-5',
  './js/db-loader.js?v=20260811-1',
  './js/app.js?v=20260902-3',
  './js/navigation/home-button.js?v=20260828-1',
  './js/navigation/router.js?v=20260828-2',
  './js/navigation/route-controller.js?v=20260901-2',
  './js/landing/landing.js?v=20260902-1',
  './js/wizard.js?v=20260901-3',
  './js/i18n/i18n.js?v=20260826-1',
  './js/legacy-features.js?v=20260901-1',
  './js/personas.js?v=20260814-1',
  './js/wizard/vehicle-picker.js?v=20260825-2',
  './js/wizard/brand-picker.js?v=20260823-6',
  './js/branding/vehicle-brand-logos.js?v=20260823-5',
  './js/knowledge/model-specific-alerts.js?v=20260823-1',
  './js/wizard/interactions.js?v=20260813-1',
  './js/theming/theme-manager.js?v=20260828-1',
  './js/onboarding/profile-onboarding.js?v=20260828-1',
  './js/auth/firebase-client.js?v=20260902-2',
  './js/media/media-manager.js?v=20260813-2',
  './js/media/engine-audio-analyzer.js?v=20260830-1',
  './js/auth/consent.js?v=20260826-2',
  './js/native/permissions.js?v=20260813-1',
  './js/native/connectivity.js?v=20260813-1',
  './js/native/app-links.js?v=20260826-1',
  './js/native/push.js?v=20260813-1',
  './js/settings/settings.js?v=20260901-1',
  './js/score/score-visuals.js?v=20260813-1',
  './js/records/records-gallery.js?v=20260901-1',
  './js/reports/negotiation.js?v=20260814-1',
  './js/reports/premium-report.js?v=20260901-1',
  './js/reports/report-sharing.js?v=20260827-1',
  './js/reports/shared-report.js?v=20260826-3',
  './js/chat-experience.js?v=20260901-3',
  './js/ux/owner-technical-help.js?v=20260821-1',
  './js/ux/post-report-actions.js?v=20260821-1',
  './js/ux/local-backup-reminder.js?v=20260821-1',
  './js/ux/inspection-enhancements.js?v=20260827-1',
  './assets/reference/section-guides/vehicule.svg',
  './assets/reference/section-guides/moteur.svg',
  './assets/reference/section-guides/chassis.svg',
  './assets/reference/section-guides/carrosserie.svg',
  './assets/reference/section-guides/habitacle.svg',
  './assets/reference/section-guides/essai-routier.svg',
  './assets/reference/section-guides/diagnostic.svg',
  './assets/reference/test-guides.svg',
  './js/pwa.js?v=20260901-1',
  './privacy.html',
  './terms.html',
  './account-deletion.html',
  './shared-report.html',
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

  // Un rechargement forcé (Ctrl+F5 / Ctrl+Shift+R) doit toujours récupérer
  // la version réseau. Cache Storage n'est pas vidé par le navigateur lors
  // de ce geste : sans ce traitement, notre stratégie cache-first le
  // masquerait et l'utilisateur continuerait à voir une ancienne version.
  const forceReload = event.request.cache === 'reload' || event.request.cache === 'no-cache';
  if (forceReload) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Navigation : réseau d'abord pour récupérer les mises à jour, puis cache hors ligne.
  if (event.request.mode === 'navigate') {
    const staticPages = new Set(['/privacy.html','/terms.html','/account-deletion.html','/shared-report.html']);
    const fallbackKey = url.pathname.startsWith('/r/') ? './shared-report.html'
      : staticPages.has(url.pathname) ? `.${url.pathname}` : './index.html';
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // A direct /app/* request on GitHub Pages is served through
          // 404.html before that document restores the route. Never cache
          // this 404 response as index.html or the offline shell would later
          // reopen the error page instead of the application.
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(fallbackKey, copy));
          }
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
