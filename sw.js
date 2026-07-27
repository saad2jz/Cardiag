// sw.js
// Service Worker — Fiche d'Expertise Véhicule d'Occasion
//
// IMPORTANT (GitHub Pages) : ce fichier doit être servi à la RACINE du site
// (ou du sous-dossier du projet) pour pouvoir contrôler toutes les requêtes.
// Toutes les URLs ci-dessous sont RELATIVES à l'emplacement de ce fichier
// (résolues via `new URL(path, self.registration.scope)`), ce qui permet à
// l'app de fonctionner aussi bien sur :
//   - https://<user>.github.io/                (repo "user.github.io")
//   - https://<user>.github.io/<repo>/         (project page classique)
//
// Objectif : fonctionnement 100% hors-ligne après une première visite.
//   1. Précache l'app shell (HTML/CSS/JS) ET tous les fichiers data/*.json
//      (la liste exacte est lue depuis data/precache-manifest.json, généré
//      par generate-data.js — jamais codée en dur ici, donc toujours
//      synchronisée avec les données réellement produites).
//   2. Stratégie "cache d'abord, réseau en secours" pour tout le reste
//      (CDN html2canvas/jsPDF, polices Google Fonts, etc.).
//   3. Bascule automatique vers le cache si le réseau échoue (mode avion,
//      zone blanche pendant une visite de véhicule).

const CACHE_VERSION = 'fev-cache-v1';

function resolve(path) {
  return new URL(path, self.registration.scope).toString();
}

const APP_SHELL = [
  '',
  'index.html',
  'css/styles.css',
  'js/app.js',
  'js/db-loader.js',
  'js/pdf-exporter.js',
  'manifest.json'
].map(resolve);

async function precacheAll(cache) {
  await cache.addAll(APP_SHELL).catch(err => {
    console.warn('[sw] Certains fichiers de l\u2019app shell n\u2019ont pas pu être précachés :', err);
  });

  try {
    const manifestUrl = resolve('data/precache-manifest.json');
    const manifestRes = await fetch(manifestUrl, { cache: 'no-store' });
    if (manifestRes.ok) {
      const files = await manifestRes.json();
      const urls = files.map(f => resolve(f));
      urls.push(manifestUrl);
      await Promise.allSettled(
        urls.map(url =>
          cache.add(url).catch(err => console.warn('[sw] Échec précache', url, err))
        )
      );
    } else {
      console.warn('[sw] Manifeste de précache introuvable (HTTP ' + manifestRes.status + ').');
    }
  } catch (err) {
    console.warn('[sw] Impossible de charger le manifeste de précache (hors-ligne à l\u2019installation ?).', err);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => precacheAll(cache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isDataRequest(url) {
  return url.pathname.includes('/data/');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (isDataRequest(url) && url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => {
        const networkFetch = fetch(req).then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
          }
          return res;
        }).catch(() => null);
        return cached || networkFetch || new Response('[]', { headers: { 'Content-Type': 'application/json' } });
      })
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => {
        const networkFetch = fetch(req).then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
          }
          return res;
        }).catch(() => cached || caches.match(resolve('index.html')));
        return cached || networkFetch;
      })
    );
    return;
  }

  // Ressources tierces (CDN html2canvas/jsPDF, Google Fonts) : cache d'abord,
  // secours réseau.
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
