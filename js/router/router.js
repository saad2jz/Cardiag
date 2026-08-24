/**
 * Minimal History API router for the vanilla-JS application.
 *
 * App routes deliberately remain accessible to guests: authentication only
 * changes the sync adapter, never the ability to use an inspection locally.
 */
const APP_PREFIX = '/app';

function asUrl(target) {
  return target instanceof URL ? target : new URL(target, window.location.origin);
}

export function matchRoute(target = window.location.href) {
  const url = asUrl(target);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const inspection = path.match(/^\/app\/inspection\/([^/]+)(\/rapport)?$/);

  if (inspection) return {
    name: inspection[2] ? 'report' : 'inspection',
    id: decodeURIComponent(inspection[1]), path, url,
  };
  if (path === '/app' || path === '/app/') return { name: 'dashboard', path: '/app', url };
  if (path === '/app/nouvelle') return { name: 'new', path, url };
  if (path === '/app/comparer') return { name: 'compare', path, url };
  if (path === '/app/parametres') return { name: 'settings', path, url };
  if (path === '/exemple-rapport') return { name: 'example-report', path, url };
  if (/^\/fiche\/[^/]+$/.test(path)) return {
    name: 'legacy-inspection', id: decodeURIComponent(path.split('/').pop()), path, url,
  };
  return { name: 'landing', path, url };
}

export function initializeRouter({ onAppRoute, onLandingRoute } = {}) {
  let started = false;

  async function dispatch(target = window.location.href) {
    const route = matchRoute(target);
    document.documentElement.dataset.route = route.name;
    document.body.dataset.route = route.name;
    window.dispatchEvent(new CustomEvent('cardiag:route-change', { detail: route }));

    if (route.name === 'legacy-inspection') {
      return navigate(`/app/inspection/${encodeURIComponent(route.id)}`, { replace: true });
    }
    if (route.name === 'landing') return onLandingRoute?.(route);
    if (route.name === 'example-report') return;
    return onAppRoute?.(route);
  }

  function navigate(target, { replace = false } = {}) {
    const url = asUrl(target);
    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) window.history[replace ? 'replaceState' : 'pushState']({ cardiag: true }, '', next);
    return dispatch(url);
  }

  function start() {
    if (started) return dispatch();
    started = true;
    window.addEventListener('popstate', () => dispatch());
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[data-route]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const url = asUrl(link.href);
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      navigate(url);
    });
    return dispatch();
  }

  window.cardiagRouter = { navigate, dispatch, matchRoute, get current() { return matchRoute(); } };
  return { start, navigate, dispatch };
}
