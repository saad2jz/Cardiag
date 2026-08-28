import { initializeRouter, navigate, parseRoute, routePath } from './router.js?v=20260828-2';

const INTERNAL_PROFILE = Object.freeze({
  acheteur: 'buyer', vendeur: 'seller', proprietaire: 'owner', garagiste: 'mechanic', location: 'rental',
});
const URL_PROFILE = Object.freeze(Object.fromEntries(Object.entries(INTERNAL_PROFILE).map(([url, internal]) => [internal, url])));
const SECTION_TO_STEP = Object.freeze({ vehicule: 'info', moteur: 'moteur', chassis: 'chassis', carrosserie: 'carrosserie', habitacle: 'habitacle', essai: 'essai', diagnostic: 'diagnostic' });
const AUTH_RETURN_KEY = 'cardiag_auth_return_v1';

function currentBrowserPath() {
  return `${window.location.pathname || '/'}${window.location.search || ''}`;
}

function continueInApplicationShell(route, pending) {
  const target = routePath(route);
  if (!/^\/app(?:\/|$)/.test(target) || currentBrowserPath() === target) return false;
  try {
    // Keep the intent for the fresh document.  The app shell consumes it only
    // after Firebase has restored its persisted session.
    sessionStorage.setItem(AUTH_RETURN_KEY, JSON.stringify({
      ...(pending || {}), path: target, requestedAt: Date.now(),
    }));
  } catch { /* Navigation still works when session storage is unavailable. */ }
  window.location.assign(target);
  return true;
}

function rememberProtectedRoute(route) {
  const path = routePath(route);
  if (!/^\/app(?:\/|$)/.test(path)) return;
  try {
    const previous = JSON.parse(sessionStorage.getItem(AUTH_RETURN_KEY) || '{}');
    sessionStorage.setItem(AUTH_RETURN_KEY, JSON.stringify({ ...previous, path, requestedAt: Date.now() }));
  } catch { /* The current in-memory route remains a safe fallback. */ }
}

function consumeProtectedRoute() {
  try {
    const pending = JSON.parse(sessionStorage.getItem(AUTH_RETURN_KEY) || 'null');
    sessionStorage.removeItem(AUTH_RETURN_KEY);
    if (!pending?.path || Date.now() - Number(pending.requestedAt || 0) > 30 * 60 * 1000) return null;
    const route = parseRoute(pending.path);
    // Keep the companion intent. A route alone cannot express a first-time
    // profile opening or the role selected from the public landing.
    return route.app ? {
      route,
      openProfile: Boolean(pending.openProfile),
      role: String(pending.role || ''),
      level: String(pending.level || ''),
    } : null;
  } catch { return null; }
}

function selectedProfile() {
  return document.querySelector('[name="usage_scenario"]:checked')?.value || 'buyer';
}

function selectedLevel() {
  return document.querySelector('[name="inspection_mode"]:checked')?.value === 'quick' ? 'rapide' : 'complet';
}

function chooseProfile(profile, level) {
  const input = document.querySelector(`[name="usage_scenario"][value="${INTERNAL_PROFILE[profile] || 'buyer'}"]`);
  if (input && !input.checked) {
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (level) {
    const mode = document.querySelector(`[name="inspection_mode"][value="${level === 'rapide' ? 'quick' : 'complete'}"]`);
    if (mode && !mode.checked) {
      mode.checked = true;
      mode.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

function feedback(message) {
  window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', { detail: { type: 'error', message } }));
}

/**
 * Connects declarative URLs to the pre-existing wizard. The controller does
 * not own record state: it only opens a local record by id then selects a
 * visible wizard area, preserving the established autosave behaviour.
 */
export function initializeRouteController({ landing } = {}) {
  let applying = false;
  // Route handlers may overlap while Firebase restores a session after an
  // OAuth/email-link return.  Only the newest handler is allowed to mutate
  // the UI; otherwise a late unauthenticated handler can re-open the landing
  // after the authenticated destination has already rendered.
  let routeEpoch = 0;

  const hideLanding = () => landing?.hide?.() || window.cardiagLanding?.hide?.();
  const showLanding = () => {
    // A stale asynchronous guard must never take over an active application
    // route.  This is deliberately checked against the browser URL rather
    // than the route argument, which may already be outdated.
    if (/^\/app(?:\/|$)/.test(window.location.pathname) || document.body.classList.contains('app-shell')) {
      hideLanding();
      return false;
    }
    return landing?.show?.() || window.cardiagLanding?.show?.();
  };

  async function applyRoute(route) {
    const epoch = ++routeEpoch;
    const isCurrentRoute = () => epoch === routeEpoch;
    applying = true;
    try {
      if (route.kind === 'landing') {
        if (isCurrentRoute()) showLanding();
        return;
      }
      if (route.kind === 'demo-report') {
        if (!isCurrentRoute()) return;
        showLanding();
        document.getElementById('landingReport')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (!route.app) return;
      if (window.cardiagRequireAuthentication) {
        // Wait for the first Firebase/native restoration before deciding that
        // this protected route needs a login panel.
        await window.cardiagAuthReady?.();
        // Persist the canonical route *before* opening the login panel. A
        // Google popup or redirect can complete before the async guard returns.
        // Keeping the route first makes every auth method resume the exact
        // action the user originally chose.
        rememberProtectedRoute(route);
        if (!await window.cardiagRequireAuthentication()) {
          if (isCurrentRoute()) showLanding();
          return;
        }
        // An existing Firebase session did not need a resume token; discard
        // it so it cannot interfere with a future sign-in.
        consumeProtectedRoute();
      }
      if (!isCurrentRoute()) return;
      hideLanding();

      if (route.kind === 'dashboard') {
        window.cardiagRecords?.open?.();
        return;
      }
      if (route.kind === 'compare') {
        window.cardiagDataBridge?.openComparison?.(route.ids || []);
        return;
      }
      if (route.kind === 'settings') {
        window.cardiagSettings?.open?.();
        return;
      }
      if (route.kind === 'new-inspection') {
        // Old URLs can prefill the chooser, but never skip it or create a
        // record before the explicit Start action.
        if (route.profile) chooseProfile(route.profile, route.level);
        window.cardiagWizard?.goToStep?.(1, 'back');
        return;
      }
      if (route.kind === 'inspection') {
        const opened = await window.cardiagDataBridge?.openRecord?.(route.id);
        if (!isCurrentRoute()) return;
        if (!opened) {
          feedback('Cette fiche n’est pas disponible sur cet appareil. Ouvrez-la depuis Mes fiches ou utilisez un lien de partage privé.');
          navigate({ kind: 'dashboard' }, { replace: true, source: 'missing-record' });
          return;
        }
        const step = route.view === 'identification' ? 2 : route.view === 'contexte' ? 3 : 4;
        window.cardiagWizard?.goToStep?.(step, 'forward');
        const currentStage = route.view === 'controle' ? `controle/${route.section}` : route.view;
        const existingStatus = window.cardiagDataBridge?.getCurrentRecord?.()?.statut;
        const status = route.view === 'identification' && existingStatus === 'brouillon' ? 'brouillon' : 'en_cours';
        window.cardiagDataBridge?.setInspectionStep?.(currentStage, status);
        if (route.view === 'controle') {
          window.dispatchEvent(new CustomEvent('cardiag:inspection-section-request', { detail: { key: SECTION_TO_STEP[route.section] || 'diagnostic' } }));
        }
        if (route.view === 'assistant') {
          document.querySelector('[data-chat-toggle]')?.click();
        }
      }
    } finally {
      if (isCurrentRoute()) applying = false;
    }
  }

  const router = initializeRouter({ onRouteChange: applyRoute });

  // Firebase can restore a Google or email-link session before this controller
  // has finished initialising.  The requested destination is persisted in
  // sessionStorage by the authentication guard, so consume it both when the
  // event arrives and once at startup.  This prevents a successful sign-in
  // from leaving the visitor on the public landing page with no navigation.
  const resumeAuthenticationDestination = () => {
    const pending = consumeProtectedRoute();
    if (pending) {
      // A landing CTA can select a role before a record exists. Preserve that
      // choice for the chooser while keeping the public URL canonical.
      const route = pending.route.kind === 'new-inspection' && pending.role
        ? {
          ...pending.route,
          profile: routeProfileForScenario(pending.role),
          level: pending.level === 'quick' ? 'rapide' : pending.level === 'complete' ? 'complet' : pending.route.level,
        }
        : pending.route;
      // Crossing the public/auth shell boundary is deliberately a document
      // navigation. This prevents landing event handlers from surviving an
      // OAuth or email-link completion and masking the application afterwards.
      if (continueInApplicationShell(route, pending)) return true;
      navigate(route, { replace: true, source: 'authentication-return' });
      // OAuth and magic-link completion may happen after a full page reload.
      // Open the connected profile only after the destination has rendered.
      if (pending.openProfile) window.setTimeout(() => window.cardiagAuthUi?.open?.('profile'), 0);
      return true;
    }
    return false;
  };

  window.addEventListener('cardiag:authentication-complete', () => {
    if (resumeAuthenticationDestination()) return;
    if (router.current?.app) applyRoute(router.current);
  });

  // Replay a destination that was saved before the authentication feature or
  // this route controller became ready (notably after OAuth page reloads).
  window.cardiagAuthReady?.().then(() => {
    if (window.cardiagAuth?.user) resumeAuthenticationDestination();
  }).catch(() => { /* The normal route guard displays a recoverable login UI. */ });

  window.addEventListener('cardiag:wizard-step', (event) => {
    if (applying) return;
    const step = Number(event.detail?.step || 0);
    const record = window.cardiagDataBridge?.getCurrentRecord?.();
    if (step === 1) {
      navigate({ kind: 'new-inspection' }, { source: 'wizard-step' });
      return;
    }
    if (!record?.id) return;
    const view = step === 2 ? 'identification' : step === 3 ? 'contexte' : 'rapport';
    navigate({ kind: 'inspection', id: record.id, view }, { source: 'wizard-step' });
  });

  window.addEventListener('cardiag:inspection-section-change', (event) => {
    if (applying) return;
    const record = window.cardiagDataBridge?.getCurrentRecord?.();
    const reverse = Object.fromEntries(Object.entries(SECTION_TO_STEP).map(([url, internal]) => [internal, url]));
    const section = reverse[event.detail?.key];
    if (record?.id && section) navigate({ kind: 'inspection', id: record.id, view: 'controle', section }, { source: 'inspection-section' });
  });

  window.addEventListener('cardiag:record-open', (event) => {
    if (applying || !event.detail?.id) return;
    const route = router.current;
    // Record creation is followed by an explicit replace to its first route.
    // Do not guess a report route during this short handoff.
    if (route.kind !== 'inspection') return;
    const view = window.cardiagWizard?.currentStep === 2 ? 'identification'
      : window.cardiagWizard?.currentStep === 3 ? 'contexte' : 'rapport';
    navigate({ kind: 'inspection', id: event.detail.id, view }, { source: 'record-open' });
  });

  window.cardiagRouteController = { applyRoute };
  return router;
}

export function routeProfileForScenario(scenario) {
  return URL_PROFILE[scenario] || 'acheteur';
}
