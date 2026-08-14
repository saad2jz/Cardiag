import { initializeLegacyFeatures } from './legacy-features.js?v=20260814-11';
import { initializeChatExperience } from './chat-experience.js?v=20260814-6';
import { initializePwa } from './pwa.js?v=20260808-3';
import { initializeWizard } from './wizard.js?v=20260814-4';
import { initializeI18n } from './i18n/i18n.js?v=20260814-6';
import { initializeWizardInteractions } from './wizard/interactions.js?v=20260813-1';
import { initializeVehiclePicker } from './wizard/vehicle-picker.js?v=20260814-2';
import { initializeThemeManager } from './theming/theme-manager.js?v=20260814-1';
import { initializeProfileOnboarding } from './onboarding/profile-onboarding.js?v=20260814-2';
import { initializeMediaManager } from './media/media-manager.js?v=20260813-2';
import { initializeAuthUi } from './auth/auth-ui.js?v=20260814-2';
import { initializePermissions } from './native/permissions.js?v=20260813-1';
import { initializeConnectivity } from './native/connectivity.js?v=20260813-1';
import { initializeSyncQueue } from './native/sync-queue.js?v=20260814-1';
import { initializeAppLinks } from './native/app-links.js?v=20260813-1';
import { initializePush } from './native/push.js?v=20260813-1';
import { initializeSettings } from './settings/settings.js?v=20260814-2';
import { initializeConsent } from './auth/consent.js?v=20260813-1';
import { initializeScoreVisuals } from './score/score-visuals.js?v=20260813-1';
import { initializeRecordsGallery } from './records/records-gallery.js?v=20260814-4';
import { initializePremiumReport } from './reports/premium-report.js?v=20260814-5';
import { initializeReportSharing } from './reports/report-sharing.js?v=20260814-2';

/**
 * Application entry point. Data loading stays separate from the UI controller
 * so the latter never embeds or mutates the unified vehicle database.
 */
async function initializeApp() {
  const status = document.getElementById('result');
  try {
    if (!window.dbLoader?.loadAppData || !window.buildData) {
      throw new Error('Le chargeur de donnees n’est pas disponible.');
    }
    const payload = await window.dbLoader.loadAppData();
    const vehicles = window.buildData(payload);
    const modelCount = vehicles.reduce((count, brand) => count + brand.modeles.length, 0);
    const brandCount = document.getElementById('vehicleBrandCount');
    const modelsCount = document.getElementById('vehicleModelCount');
    if (brandCount) brandCount.textContent = String(vehicles.length);
    if (modelsCount) modelsCount.textContent = String(modelCount);
    initializeI18n();
    initializeLegacyFeatures(vehicles);
    initializeChatExperience();
    initializeWizard();
    initializeVehiclePicker();
    initializeWizardInteractions();
    await initializeThemeManager();
    await initializeProfileOnboarding();
    initializeMediaManager();
    initializeScoreVisuals();
    initializeRecordsGallery();
    initializePremiumReport();
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
