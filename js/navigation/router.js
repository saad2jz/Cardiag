/**
 * Small History API router for the offline-first application.
 *
 * Routes describe UI state only. Inspection data remains in the existing
 * local store, so opening a route never creates, overwrites or synchronizes
 * a record implicitly.
 */
export const PROFILES = Object.freeze(['acheteur', 'vendeur', 'proprietaire', 'garagiste', 'location']);
export const LEVELS = Object.freeze(['rapide', 'complet']);
export const SECTIONS = Object.freeze(['vehicule', 'moteur', 'chassis', 'carrosserie', 'habitacle', 'essai', 'diagnostic']);

const PROFILE_ALIASES = Object.freeze({
  buyer: 'acheteur', acheteur: 'acheteur',
  seller: 'vendeur', vendeur: 'vendeur',
  owner: 'proprietaire', proprietaire: 'proprietaire', 'propriétaire': 'proprietaire',
  mechanic: 'garagiste', garagiste: 'garagiste', mecanicien: 'garagiste', 'mécanicien': 'garagiste',
  rental: 'location', location: 'location',
});

const DEFAULT_ORIGIN = 'https://cardiag.online';
let activeRoute = null;
let started = false;
let routeListener = null;

function asUrl(input) {
  if (input instanceof URL) return input;
  if (typeof input === 'string') return new URL(input, DEFAULT_ORIGIN);
  return new URL(globalThis.location?.href || DEFAULT_ORIGIN);
}

function cleanPath(pathname) {
  const value = String(pathname || '/').replace(/\/{2,}/g, '/').replace(/\/$/, '');
  return value || '/';
}

function profileSlug(value) {
  return PROFILE_ALIASES[String(value || '').trim().toLowerCase()] || '';
}

function levelSlug(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'quick' || normalized === 'rapide' ? 'rapide'
    : normalized === 'complete' || normalized === 'complet' ? 'complet' : '';
}

function validRecordId(value) {
  return /^[A-Za-z0-9_-]{1,100}$/.test(String(value || ''));
}

function appRoute(kind, values = {}) {
  return Object.freeze({ kind, app: true, ...values });
}

export function newInspectionPath() {
  // A new inspection is stateless until the person explicitly starts it.
  // Profile and level are stored on the record, never in an unfinished URL.
  return '/app/inspection/nouveau';
}

export function comparisonPath(ids = []) {
  const uniqueIds = [...new Set((Array.isArray(ids) ? ids : [])
    .map((id) => String(id || ''))
    .filter(validRecordId))].slice(0, 3);
  return uniqueIds.length ? `/app/comparer?ids=${encodeURIComponent(uniqueIds.join(','))}` : '/app/comparer';
}

function comparisonIds(value) {
  return [...new Set(String(value || '').split(',')
    .map((id) => id.trim())
    .filter(validRecordId))].slice(0, 3);
}

export function inspectionPath(id, view = 'rapport', section = '') {
  if (!validRecordId(id)) return '/app';
  if (view === 'controle' && SECTIONS.includes(section)) return `/app/inspection/${encodeURIComponent(id)}/controle/${section}`;
  if (['identification', 'contexte', 'rapport', 'assistant'].includes(view)) return `/app/inspection/${encodeURIComponent(id)}/${view}`;
  return `/app/inspection/${encodeURIComponent(id)}/rapport`;
}

export function parseRoute(input) {
  const url = asUrl(input);
  const path = cleanPath(url.pathname);
  const segments = path.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));

  if (path === '/') {
    // GitHub Pages has no server-side SPA rewrite. Its 404 fallback sends
    // application URLs here in a safe query parameter, then this router
    // restores the canonical route without a full-page 404.
    const recoveredPath = String(url.searchParams.get('_r') || '');
    if (/^\/(?:app|fiche)(?:\/|$)/.test(recoveredPath) || /^\/exemple-rapport(?:[/?#]|$)/.test(recoveredPath)) {
      return Object.freeze({ ...parseRoute(new URL(recoveredPath, url.origin)), legacy: true });
    }
    const profile = profileSlug(url.searchParams.get('profil'));
    const level = levelSlug(url.searchParams.get('niveau'));
    const fiche = String(url.searchParams.get('fiche') || '');
    if (validRecordId(fiche)) return appRoute('inspection', { id: fiche, view: 'rapport', legacy: true });
    // Old landing links sometimes contained only `niveau`. They historically
    // opened a buyer inspection, so preserve that useful intent rather than
    // dropping the selected inspection level on the landing page.
    if (profile || level) {
      return appRoute('new-inspection', { profile, level, legacy: true });
    }
    if (url.searchParams.get('action') === 'new' || url.searchParams.get('app') === '1') return appRoute('new-inspection', { profile: '', level: '', stage: '', legacy: true });
    return Object.freeze({ kind: 'landing', app: false });
  }

  if (path === '/exemple-rapport') return Object.freeze({ kind: 'demo-report', app: false });
  if (path === '/app' || path === '/app/fiches') return appRoute('dashboard');
  if (path === '/app/comparer') return appRoute('compare', { ids: comparisonIds(url.searchParams.get('ids')) });
  if (path === '/app/parametres') return appRoute('settings');
  if (path === '/app/inspection/nouveau') return appRoute('new-inspection', { profile: '', level: '' });
  if (path === '/app/nouvelle') return appRoute('new-inspection', { profile: '', level: '', legacy: true });

  if (segments[0] === 'app' && segments[1] === 'nouvelle') {
    const profile = profileSlug(segments[2]);
    const possibleLevel = levelSlug(segments[3]);
    const level = possibleLevel || '';
    const stage = possibleLevel ? (segments[4] || '') : (segments[3] || '');
    if (profile && (!stage || ['identification', 'contexte', 'diagnostic'].includes(stage))) {
      return appRoute('new-inspection', { profile, level, legacy: true });
    }
  }

  const inspectionMatch = path.match(/^\/app\/inspection\/([A-Za-z0-9_-]{1,100})\/(identification|contexte|rapport|assistant)$/);
  if (inspectionMatch) return appRoute('inspection', { id: inspectionMatch[1], view: inspectionMatch[2] });
  const controlMatch = path.match(/^\/app\/inspection\/([A-Za-z0-9_-]{1,100})\/controle\/(vehicule|moteur|chassis|carrosserie|habitacle|essai|diagnostic)$/);
  if (controlMatch) return appRoute('inspection', { id: controlMatch[1], view: 'controle', section: controlMatch[2] });

  // Legacy device links stay available, but no internal control creates them.
  const legacyRecord = path.match(/^\/fiche\/([A-Za-z0-9_-]{1,100})$/);
  if (legacyRecord) return appRoute('inspection', { id: legacyRecord[1], view: 'rapport', legacy: true });

  if (path.startsWith('/r/')) return Object.freeze({ kind: 'shared-report', app: false, token: segments[1] || '' });
  if (['/privacy.html', '/terms.html', '/account-deletion.html', '/shared-report.html'].includes(path)) return Object.freeze({ kind: 'legal', app: false, path });
  return Object.freeze({ kind: 'not-found', app: false, path });
}

export function routePath(route) {
  switch (route?.kind) {
    case 'landing': return '/';
    case 'demo-report': return '/exemple-rapport';
    case 'dashboard': return '/app';
    case 'compare': return comparisonPath(route.ids);
    case 'settings': return '/app/parametres';
    case 'new-inspection': return newInspectionPath();
    case 'inspection': return inspectionPath(route.id, route.view, route.section);
    default: return String(route?.path || '/');
  }
}

function browserPath(route) {
  // Keep the address bar canonical for every route. On GitHub Pages, the
  // 404 document briefly redirects a direct refresh back to the root and
  // parseRoute() restores that same canonical path once the app shell loads.
  // The `_r` value is therefore a recovery transport only, never a user URL.
  return routePath(route);
}

function notify(route, source) {
  activeRoute = route;
  globalThis.dispatchEvent?.(new CustomEvent('cardiag:route-change', { detail: { route, source } }));
  routeListener?.(route, source);
}

export function navigate(route, { replace = false, source = 'navigate' } = {}) {
  const target = typeof route === 'string' ? parseRoute(route) : route;
  const path = routePath(target);
  const publicPath = browserPath(target);
  const currentPath = `${globalThis.location?.pathname || '/'}${globalThis.location?.search || ''}`;
  if (currentPath === publicPath && activeRoute && routePath(activeRoute) === path) return target;
  if (currentPath !== publicPath) {
    globalThis.history?.[replace ? 'replaceState' : 'pushState']?.({ cardiagRoute: path }, '', publicPath);
  }
  notify(target, source);
  return target;
}

export function currentRoute() {
  return activeRoute || parseRoute();
}

export function initializeRouter({ onRouteChange } = {}) {
  routeListener = typeof onRouteChange === 'function' ? onRouteChange : null;
  if (!started) {
    started = true;
    globalThis.addEventListener?.('popstate', () => notify(parseRoute(), 'popstate'));
  }
  const route = parseRoute();
  const canonicalPath = browserPath(route);
  const currentPath = `${globalThis.location?.pathname || '/'}${globalThis.location?.search || ''}`;
  if (route.legacy && currentPath !== canonicalPath) globalThis.history?.replaceState?.({ cardiagRoute: canonicalPath }, '', canonicalPath);
  notify(route, 'initial');
  const api = Object.freeze({
    get current() { return currentRoute(); },
    navigate,
    newInspection: (_profile, _level, _stage, options) => navigate({ kind: 'new-inspection' }, options),
    inspection: (id, view, section, options) => navigate({ kind: 'inspection', id, view, section }, options),
    dashboard: (options) => navigate({ kind: 'dashboard' }, options),
    compare: (ids, options) => navigate({ kind: 'compare', ids: comparisonIds(ids) }, options),
    settings: (options) => navigate({ kind: 'settings' }, options),
  });
  globalThis.cardiagRouter = api;
  return api;
}
