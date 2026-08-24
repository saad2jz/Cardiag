import { initializeI18n } from './i18n/i18n.js?v=20260823-3';
import { initializeLanding } from './landing/landing.js?v=20260821-4';
import { initializePwa } from './pwa.js?v=20260823-3';
import { initializeRouter } from './router/router.js?v=20260824-1';

let appRuntime;
let runtimeModule;

async function ensureRuntime(landing) {
  if (!appRuntime) {
    runtimeModule = await import('./app-runtime.js?v=20260824-2');
    appRuntime = runtimeModule.initializeAppRuntime({ landingActive: landing.active });
  }
  await appRuntime;
}

async function initializeApp() {
  initializeI18n();
  const landing = initializeLanding();
  initializePwa();

  const router = initializeRouter({
    onLandingRoute: () => {
      landing.show?.();
      document.documentElement.scrollTop = 0;
    },
    onAppRoute: async (route) => {
      landing.hide?.();
      await ensureRuntime(landing);
      await runtimeModule.loadRouteFeature(route.name);
      const bridge = window.cardiagDataBridge;

      if (route.name === 'new') {
        window.cardiagWizard?.goToStep?.(1, 'back');
        return;
      }
      if (route.name === 'dashboard') {
        window.cardiagRecords?.open?.();
        return;
      }
      if (route.name === 'compare') {
        bridge?.openComparison?.([]);
        return;
      }
      if (route.name === 'settings') {
        window.cardiagSettings?.open?.();
        return;
      }
      if (!route.id) return;
      const opened = await bridge?.openRecord?.(route.id);
      if (!opened) {
        window.cardiagRouter?.navigate?.('/app', { replace: true });
        return;
      }
      // The existing wizard stays the single source of truth for all seven
      // inspection sections; routing only selects the active local record.
      window.cardiagWizard?.goToStep?.(4, 'forward');
      if (route.name === 'report') {
        document.getElementById('generateBtn')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
  });
  await router.start();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
else initializeApp();
