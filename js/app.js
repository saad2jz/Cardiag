import { initializeLegacyFeatures } from './legacy-features.js?v=20260823-6';
import { initializeChatExperience } from './chat-experience.js?v=20260821-1';
import { initializePwa } from './pwa.js?v=20260820-2';
import { initializeWizard } from './wizard.js?v=20260823-3';
import { initializeI18n } from './i18n/i18n.js?v=20260823-3';
import { initializeWizardInteractions } from './wizard/interactions.js?v=20260813-1';
import { initializeVehiclePicker } from './wizard/vehicle-picker.js?v=20260821-1';
import { initializeThemeManager } from './theming/theme-manager.js?v=20260820-3';
import { initializeProfileOnboarding } from './onboarding/profile-onboarding.js?v=20260820-1';
import { initializeMediaManager } from './media/media-manager.js?v=20260813-2';
import { initializeAuthUi } from './auth/auth-ui.js?v=20260820-4';
import { initializePermissions } from './native/permissions.js?v=20260813-1';
import { initializeConnectivity } from './native/connectivity.js?v=20260813-1';
import { initializeSyncQueue } from './native/sync-queue.js?v=20260814-1';
import { initializeAppLinks } from './native/app-links.js?v=20260813-1';
import { initializePush } from './native/push.js?v=20260813-1';
import { initializeSettings } from './settings/settings.js?v=20260820-4';
import { initializeConsent } from './auth/consent.js?v=20260813-1';
import { initializeScoreVisuals } from './score/score-visuals.js?v=20260813-1';
import { initializeRecordsGallery } from './records/records-gallery.js?v=20260821-1';
import { initializePremiumReport } from './reports/premium-report.js?v=20260823-11';
import { initializeReportSharing } from './reports/report-sharing.js?v=20260814-2';
import { initializeLanding } from './landing/landing.js?v=20260821-4';
import { initializeInspectionEnhancements } from './ux/inspection-enhancements.js?v=20260821-3';
import { initializeOwnerTechnicalHelp } from './ux/owner-technical-help.js?v=20260821-1';
import { initializePostReportActions } from './ux/post-report-actions.js?v=20260821-1';
import { initializeLocalBackupReminder } from './ux/local-backup-reminder.js?v=20260821-1';
import { initializeHomeButton } from './navigation/home-button.js?v=20260820-1';
import { initializeBrandPicker } from './wizard/brand-picker.js?v=20260823-4';
import { initializeModelSpecificAlerts } from './knowledge/model-specific-alerts.js?v=20260823-1';

/**
 * Application entry point. Data loading stays separate from the UI controller
 * so the latter never embeds or mutates the unified vehicle database.
 */
async function initializeApp() {
  const status = document.getElementById('result');
  try {
    initializeI18n();
    const landing = initializeLanding();
    if (!window.dbLoader?.loadAppData || !window.buildData) {
      throw new Error('Le chargeur de donnees n’est pas disponible.');
    }
    const vehicleDatabaseStatus = document.getElementById('vehicleDatabaseStatus');
    let payload;
    try {
      payload = await window.dbLoader.loadAppData();
      if (vehicleDatabaseStatus) {
        vehicleDatabaseStatus.hidden = true;
        vehicleDatabaseStatus.classList.remove('is-loading');
      }
    } catch (databaseError) {
      console.warn('Base véhicule indisponible, saisie manuelle activée :', databaseError);
      payload = { marques: [], modelesByMarque: {} };
      if (vehicleDatabaseStatus) {
        vehicleDatabaseStatus.hidden = false;
        vehicleDatabaseStatus.className = 'vehicle-db-status is-error';
        const english = window.cardiagI18n?.language === 'en';
        vehicleDatabaseStatus.textContent = navigator.onLine
          ? (english ? 'Vehicle database temporarily unavailable. Use the free-text fields below or try again later.' : 'Base véhicule temporairement indisponible. Complétez les champs libres ci-dessous ou réessayez plus tard.')
          : (english ? 'Vehicle database unavailable offline without a cache. Use the free-text fields below.' : 'Base véhicule indisponible hors-ligne sans cache. Complétez immédiatement les champs libres ci-dessous.');
      }
      ['marqueManualWrap', 'modeleManualWrap', 'motorisationManualWrap'].forEach((id) => {
        const wrap = document.getElementById(id);
        if (wrap) wrap.style.display = 'block';
      });
      ['marqueManualInput', 'modeleManualInput', 'motorisationManualInput'].forEach((id) => {
        const input = document.getElementById(id);
        if (input) input.disabled = false;
      });
    }
    const vehicles = window.buildData(payload);
    const modelCount = vehicles.reduce((count, brand) => count + brand.modeles.length, 0);
    const brandCount = document.getElementById('vehicleBrandCount');
    const modelsCount = document.getElementById('vehicleModelCount');
    if (brandCount) brandCount.textContent = String(vehicles.length);
    if (modelsCount) modelsCount.textContent = String(modelCount);
    initializeLegacyFeatures(vehicles);
    initializeBrandPicker(vehicles);
    initializeModelSpecificAlerts();
    initializeChatExperience();
    initializeWizard();
    initializeVehiclePicker();
    initializeWizardInteractions();
    initializeInspectionEnhancements();
    initializeOwnerTechnicalHelp();
    await initializeThemeManager();
    await initializeProfileOnboarding({ deferProfile: landing.active });
    initializeMediaManager();
    initializeScoreVisuals();
    initializeRecordsGallery();
    initializeHomeButton();
    initializePremiumReport();
    initializePostReportActions();
    initializeLocalBackupReminder();
    initializePermissions();
    initializeConnectivity();
    await initializeAuthUi();
    initializeReportSharing();
    await initializeSyncQueue();
    initializeAppLinks();
    await initializePush();
    initializeSettings();
    await initializeConsent();
    initializePwa();
  } catch (error) {
    console.error('Erreur app.js:', error);
    if (status) status.textContent = `Le chargement a echoue : ${error.message}`;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
} else {
  initializeApp();
}
