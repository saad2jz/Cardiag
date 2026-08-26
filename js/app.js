import { initializeLegacyFeatures } from './legacy-features.js?v=20260824-2';
import { initializePwa } from './pwa.js?v=20260823-3';
import { initializeWizard } from './wizard.js?v=20260826-1';
import { initializeI18n } from './i18n/i18n.js?v=20260826-1';
import { initializeWizardInteractions } from './wizard/interactions.js?v=20260813-1';
import { initializeVehiclePicker } from './wizard/vehicle-picker.js?v=20260825-2';
import { initializeThemeManager } from './theming/theme-manager.js?v=20260820-3';
import { initializeProfileOnboarding } from './onboarding/profile-onboarding.js?v=20260826-4';
import { initializeMediaManager } from './media/media-manager.js?v=20260813-2';
import { initializePermissions } from './native/permissions.js?v=20260813-1';
import { initializeConnectivity } from './native/connectivity.js?v=20260813-1';
import { initializeAppLinks } from './native/app-links.js?v=20260826-1';
import { initializePush } from './native/push.js?v=20260813-1';
import { initializeSettings } from './settings/settings.js?v=20260825-2';
import { initializeConsent } from './auth/consent.js?v=20260813-1';
import { initializeScoreVisuals } from './score/score-visuals.js?v=20260813-1';
import { initializeRecordsGallery } from './records/records-gallery.js?v=20260826-1';
import { initializeLanding } from './landing/landing.js?v=20260826-1';
import { initializeInspectionEnhancements } from './ux/inspection-enhancements.js?v=20260825-2';
import { initializeOwnerTechnicalHelp } from './ux/owner-technical-help.js?v=20260821-1';
import { initializeHomeButton } from './navigation/home-button.js?v=20260825-2';
import { initializeRouteController } from './navigation/route-controller.js?v=20260826-3';
import { initializeBrandPicker } from './wizard/brand-picker.js?v=20260823-6';
import { initializeModelSpecificAlerts } from './knowledge/model-specific-alerts.js?v=20260823-1';

let reportFeaturePromise;
let chatFeaturePromise;
let accountFeaturePromise;
async function loadAccountFeature(){
  if(!accountFeaturePromise){
    accountFeaturePromise=Promise.all([
      import('./auth/auth-ui.js?v=20260826-5'),
      import('./native/sync-queue.js?v=20260825-1'),
    ]).then(async ([auth,sync])=>{
      await auth.initializeAuthUi();
      await sync.initializeSyncQueue();
      return window.cardiagAuthUi;
    });
  }
  return accountFeaturePromise;
}
async function requireAuthentication() {
  const authUi = await loadAccountFeature();
  if (window.cardiagAuth?.user) return true;
  authUi?.open?.('login');
  return false;
}
function initializeLazyAccountFeature(){
  // One public entry point avoids relying on a custom-event timing race when
  // a landing CTA is the first code path that loads the account module.
  const openAuthentication = async ({ view = 'login', provider = '' } = {}) => {
    const authUi = await loadAccountFeature();
    authUi?.open?.(view, provider);
    return authUi;
  };
  window.cardiagOpenAuthentication = openAuthentication;
  // The route controller uses this guard for every /app route, including a
  // deep link opened directly in a new browser tab.
  window.cardiagRequireAuthentication = requireAuthentication;
  // A lightweight trigger keeps the account discoverable without downloading
  // Firebase/Auth for every anonymous, offline inspection.
  document.addEventListener('click', async (event)=>{
    const trigger=event.target.closest('[data-account-open], .account-trigger, .account-signup-trigger, [data-google-login], [data-profile-google-auth]');
    if(!trigger || window.cardiagAuthUi) return;
    event.preventDefault(); event.stopImmediatePropagation();
    try { await openAuthentication({ view: 'login' }); }
    catch(error){ console.error('Compte indisponible', error); window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback',{detail:{type:'error',message:'Le compte est temporairement indisponible.'}})); }
  }, true);
  window.addEventListener('cardiag:open-auth',(event)=>{
    // Once the feature is loaded, auth-ui owns this event. Keeping this
    // bootstrap listener passive prevents two Google popups for one tap.
    if (window.cardiagAuthUi) return;
    openAuthentication({ view: event.detail?.view || 'login', provider: event.detail?.provider || '' })
      .catch(console.error);
  });
}
async function loadChatFeature(){
  if(!chatFeaturePromise){chatFeaturePromise=import('./chat-experience.js?v=20260825-1').then(({initializeChatExperience})=>{initializeChatExperience();return window.cardiagChat;});}
  return chatFeaturePromise;
}
async function loadReportFeature(){
  if(!reportFeaturePromise){
    reportFeaturePromise=Promise.all([
      import('./reports/premium-report.js?v=20260825-1'),
      import('./reports/report-sharing.js?v=20260814-2'),
      import('./ux/post-report-actions.js?v=20260821-1'),
      import('./ux/local-backup-reminder.js?v=20260821-1'),
    ]).then(([premium,sharing,actions,backup])=>{
      premium.initializePremiumReport();sharing.initializeReportSharing();actions.initializePostReportActions();backup.initializeLocalBackupReminder();
      return window.cardiagPremiumReport;
    });
  }
  return reportFeaturePromise;
}
function initializeLazyReportFeature(){
  document.getElementById('generateBtn')?.addEventListener('click',async(event)=>{
    if(window.cardiagPremiumReport) return;
    event.preventDefault();event.stopImmediatePropagation();
    try{await (await loadReportFeature())?.generate?.();}
    catch(error){console.error('Rapport premium indisponible',error);window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback',{detail:{type:'error',message:'Le rapport est temporairement indisponible.'}}));}
  },{capture:true,once:true});
}
function initializeAuthenticatedActionGate(){
  // Some historic controls mutate the local report directly instead of using
  // the router. Keep them behind the exact same gate as /app/* routes.
  const protectedActions = '#newFicheBtn, #compareBtn, #generateBtn, #shortPrintBtn, #shareReportBtn, [data-records-new], [data-add-vehicle], [data-assistant-new-vehicle], [data-run-vehicle-comparison]';
  document.addEventListener('click', async (event) => {
    const action = event.target.closest(protectedActions);
    if (!action) return;
    if (action.dataset.authGatePassed === 'true') {
      delete action.dataset.authGatePassed;
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      if (!await requireAuthentication()) return;
      action.dataset.authGatePassed = 'true';
      action.click();
    } catch (error) {
      console.error('Authentification requise', error);
    }
  }, true);
}
function initializeLazyChatFeature(){
  document.addEventListener('click',async(event)=>{
    const toggle=event.target.closest('[data-chat-toggle]');
    if(!toggle) return;
    if(toggle.dataset.authGatePassed==='true'){
      delete toggle.dataset.authGatePassed;
      return;
    }
    event.preventDefault();event.stopImmediatePropagation();
    try{
      if(!await requireAuthentication()) return;
      toggle.dataset.authGatePassed='true';
      toggle.click();
    }catch(error){console.error('Assistant indisponible',error);}
  },true);
  window.addEventListener('cardiag:scenario-change',()=>{
    if(document.querySelector('[name="usage_scenario"]:checked')?.value==='owner') loadChatFeature().catch(console.error);
  });
  if(document.querySelector('[name="usage_scenario"]:checked')?.value==='owner') loadChatFeature().catch(console.error);
}

/**
 * Application entry point. Data loading stays separate from the UI controller
 * so the latter never embeds or mutates the unified vehicle database.
 */
async function initializeApp() {
  const status = document.getElementById('result');
  try {
    initializeI18n();
    const landing = initializeLanding();
    // The landing is immediately interactive, while the offline vehicle data
    // may still be loading. Register its account gateway now so an early tap
    // cannot dispatch an authentication event before a listener exists.
    initializeLazyAccountFeature();
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
    await initializeLegacyFeatures(vehicles);
    initializeBrandPicker(vehicles);
    initializeModelSpecificAlerts();
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
    initializeLazyReportFeature();
    initializeLazyChatFeature();
    initializeAuthenticatedActionGate();
    initializePermissions();
    initializeConnectivity();
    initializeAppLinks();
    await initializePush();
    initializeSettings();
    await initializeConsent();
    initializeRouteController({ landing });
    // Firebase stores the result of a Google redirect internally. Loading the
    // account feature on the public page lets Firebase consume it and resume
    // the requested application entry without a second click.
    if (landing.active) loadAccountFeature().catch((error) => console.warn('Authentification en attente', error));
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
