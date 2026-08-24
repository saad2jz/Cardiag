import { initializeLegacyFeatures } from './legacy-features.js?v=20260824-1';
import { initializeWizard } from './wizard.js?v=20260823-3';
import { initializeWizardInteractions } from './wizard/interactions.js?v=20260813-1';
import { initializeVehiclePicker } from './wizard/vehicle-picker.js?v=20260821-1';
import { initializeThemeManager } from './theming/theme-manager.js?v=20260820-3';
import { initializeProfileOnboarding } from './onboarding/profile-onboarding.js?v=20260824-3';
import { initializeMediaManager } from './media/media-manager.js?v=20260813-2';
import { initializeAuthUi } from './auth/auth-ui.js?v=20260824-4';
import { initializePermissions } from './native/permissions.js?v=20260813-1';
import { initializeConnectivity } from './native/connectivity.js?v=20260813-1';
import { initializeSyncQueue } from './native/sync-queue.js?v=20260824-1';
import { initializeAppLinks } from './native/app-links.js?v=20260813-1';
import { initializePush } from './native/push.js?v=20260813-1';
import { initializeConsent } from './auth/consent.js?v=20260813-1';
import { initializeScoreVisuals } from './score/score-visuals.js?v=20260813-1';
import { initializeReportSharing } from './reports/report-sharing.js?v=20260814-2';
import { initializeInspectionEnhancements } from './ux/inspection-enhancements.js?v=20260821-3';
import { initializeOwnerTechnicalHelp } from './ux/owner-technical-help.js?v=20260821-1';
import { initializeHomeButton } from './navigation/home-button.js?v=20260820-1';
import { initializeBrandPicker } from './wizard/brand-picker.js?v=20260823-6';
import { initializeModelSpecificAlerts } from './knowledge/model-specific-alerts.js?v=20260823-1';

let runtimePromise;
const routeFeatures = new Set();

async function loadOnce(name, loader) {
  if (routeFeatures.has(name)) return;
  await loader();
  routeFeatures.add(name);
}

/** Route-level chunks keep the landing and lightweight app routes free from PDF/chat UI. */
export async function loadRouteFeature(routeName) {
  if (routeName === 'dashboard') {
    await loadOnce('dashboard', async () => {
      const { initializeRecordsGallery } = await import('./records/records-gallery.js?v=20260821-1');
      initializeRecordsGallery();
    });
  }
  if (routeName === 'settings') {
    await loadOnce('settings', async () => {
      const { initializeSettings } = await import('./settings/settings.js?v=20260820-4');
      initializeSettings();
    });
  }
  if (routeName === 'inspection' || routeName === 'report') {
    await loadOnce('inspection-tools', async () => {
      const [chat, premium, postReport, backup] = await Promise.all([
        import('./chat-experience.js?v=20260821-1'),
        import('./reports/premium-report.js?v=20260823-14'),
        import('./ux/post-report-actions.js?v=20260821-1'),
        import('./ux/local-backup-reminder.js?v=20260821-1'),
      ]);
      chat.initializeChatExperience();
      premium.initializePremiumReport();
      postReport.initializePostReportActions();
      backup.initializeLocalBackupReminder();
    });
  }
}

/** Loads the inspection-only code on demand, never from the marketing landing. */
export function initializeAppRuntime({ landingActive = false } = {}) {
  if (runtimePromise) return runtimePromise;
  runtimePromise = (async () => {
    const status = document.getElementById('result');
    try {
      if (!window.dbLoader?.loadAppData || !window.buildData) throw new Error('Le chargeur de données n’est pas disponible.');
      const vehicleDatabaseStatus = document.getElementById('vehicleDatabaseStatus');
      let payload;
      try {
        payload = await window.dbLoader.loadAppData();
        if (vehicleDatabaseStatus) { vehicleDatabaseStatus.hidden = true; vehicleDatabaseStatus.classList.remove('is-loading'); }
      } catch (error) {
        console.warn('Base véhicule indisponible, saisie manuelle activée :', error);
        payload = { marques: [], modelesByMarque: {} };
        if (vehicleDatabaseStatus) {
          vehicleDatabaseStatus.hidden = false;
          vehicleDatabaseStatus.className = 'vehicle-db-status is-error';
          vehicleDatabaseStatus.textContent = navigator.onLine ? 'Base véhicule temporairement indisponible. Utilisez la saisie libre.' : 'Base véhicule indisponible hors-ligne sans cache. Utilisez la saisie libre.';
        }
        ['marqueManualWrap', 'modeleManualWrap', 'motorisationManualWrap'].forEach((id) => { const node = document.getElementById(id); if (node) node.style.display = 'block'; });
        ['marqueManualInput', 'modeleManualInput', 'motorisationManualInput'].forEach((id) => { const node = document.getElementById(id); if (node) node.disabled = false; });
      }
      const vehicles = window.buildData(payload);
      const brandCount = document.getElementById('vehicleBrandCount');
      const modelsCount = document.getElementById('vehicleModelCount');
      if (brandCount) brandCount.textContent = String(vehicles.length);
      if (modelsCount) modelsCount.textContent = String(vehicles.reduce((count, brand) => count + brand.modeles.length, 0));

      initializeLegacyFeatures(vehicles);
      initializeBrandPicker(vehicles);
      initializeModelSpecificAlerts();
      initializeWizard();
      initializeVehiclePicker();
      initializeWizardInteractions();
      initializeInspectionEnhancements();
      initializeOwnerTechnicalHelp();
      await initializeThemeManager();
      await initializeProfileOnboarding({ deferProfile: landingActive });
      initializeMediaManager();
      initializeScoreVisuals();
      initializeHomeButton();
      initializePermissions();
      initializeConnectivity();
      await initializeAuthUi();
      initializeReportSharing();
      await initializeSyncQueue();
      initializeAppLinks();
      await initializePush();
      await initializeConsent();
      return true;
    } catch (error) {
      console.error('Erreur app runtime:', error);
      if (status) status.textContent = `Le chargement a échoué : ${error.message}`;
      throw error;
    }
  })();
  return runtimePromise;
}
