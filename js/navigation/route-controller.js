import { initializeRouter, navigate } from './router.js?v=20260826-3';

const INTERNAL_PROFILE = Object.freeze({
  acheteur: 'buyer', vendeur: 'seller', proprietaire: 'owner', garagiste: 'mechanic', location: 'rental',
});
const URL_PROFILE = Object.freeze(Object.fromEntries(Object.entries(INTERNAL_PROFILE).map(([url, internal]) => [internal, url])));
const SECTION_TO_STEP = Object.freeze({ vehicule: 'info', moteur: 'moteur', chassis: 'chassis', carrosserie: 'carrosserie', habitacle: 'habitacle', essai: 'essai', diagnostic: 'diagnostic' });

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

  const hideLanding = () => landing?.hide?.() || window.cardiagLanding?.hide?.();
  const showLanding = () => landing?.show?.() || window.cardiagLanding?.show?.();

  async function applyRoute(route) {
    applying = true;
    try {
      if (route.kind === 'landing') {
        showLanding();
        return;
      }
      if (route.kind === 'demo-report') {
        showLanding();
        document.getElementById('landingReport')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (!route.app) return;
      if (window.cardiagRequireAuthentication && !await window.cardiagRequireAuthentication()) {
        showLanding();
        return;
      }
      hideLanding();

      if (route.kind === 'dashboard') {
        window.cardiagRecords?.open?.();
        return;
      }
      if (route.kind === 'compare') {
        window.cardiagDataBridge?.openComparison?.([]);
        return;
      }
      if (route.kind === 'settings') {
        window.cardiagSettings?.open?.();
        return;
      }
      if (route.kind === 'new-inspection') {
        if (!route.profile) {
          window.cardiagWizard?.goToStep?.(1, 'back');
          return;
        }
        chooseProfile(route.profile, route.level);
        const step = route.stage === 'contexte' ? 3
          : route.stage === 'diagnostic' && route.profile === 'proprietaire' ? 4
            : 2;
        window.cardiagWizard?.goToStep?.(step, 'forward');
        return;
      }
      if (route.kind === 'inspection') {
        const opened = await window.cardiagDataBridge?.openRecord?.(route.id);
        if (!opened) {
          feedback('Cette fiche n’est pas disponible sur cet appareil. Ouvrez-la depuis Mes fiches ou utilisez un lien de partage privé.');
          navigate({ kind: 'dashboard' }, { replace: true, source: 'missing-record' });
          return;
        }
        const step = route.view === 'identification' ? 2 : route.view === 'contexte' ? 3 : 4;
        window.cardiagWizard?.goToStep?.(step, 'forward');
        if (route.view === 'controle') {
          window.dispatchEvent(new CustomEvent('cardiag:inspection-section-request', { detail: { key: SECTION_TO_STEP[route.section] || 'diagnostic' } }));
        }
        if (route.view === 'assistant') {
          document.querySelector('[data-chat-toggle]')?.click();
        }
      }
    } finally {
      applying = false;
    }
  }

  const router = initializeRouter({ onRouteChange: applyRoute });

  window.addEventListener('cardiag:authentication-complete', () => {
    if (router.current?.app) applyRoute(router.current);
  });

  window.addEventListener('cardiag:wizard-step', (event) => {
    if (applying) return;
    const step = Number(event.detail?.step || 0);
    const record = window.cardiagDataBridge?.getCurrentRecord?.();
    if (step === 1) {
      navigate({ kind: 'new-inspection', profile: '', level: '', stage: '' }, { source: 'wizard-step' });
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
    if (route.kind === 'dashboard' || route.kind === 'compare') return;
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
