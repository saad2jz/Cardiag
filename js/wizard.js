import { personaRequiresVin } from './personas.js?v=20260814-1';

const PROFILE_STORAGE_KEY = 'cardiag_active_profile';
const STEP_STORAGE_KEY = 'cardiag_wizard_step';
const VALID_PROFILES = new Set(['buyer', 'mechanic', 'rental', 'seller', 'owner']);
const PROFESSIONAL_PROFILES = new Set(['mechanic', 'rental']);
const STEP_COUNT = 4;
const PROFILE_FROM_SLUG = Object.freeze({
  acheteur: 'buyer', buyer: 'buyer', vendeur: 'seller', seller: 'seller',
  proprietaire: 'owner', propriétaire: 'owner', owner: 'owner',
  garagiste: 'mechanic', mecanicien: 'mechanic', mechanic: 'mechanic',
  location: 'rental', rental: 'rental',
});
const PROFILE_TO_SLUG = Object.freeze({ buyer: 'acheteur', seller: 'vendeur', owner: 'proprietaire', mechanic: 'garagiste', rental: 'location' });
const PROFILE_LABEL_KEYS = Object.freeze({ buyer: 'profile.buyer', mechanic: 'profile.mechanic', rental: 'profile.rental', seller: 'profile.seller', owner: 'profile.owner' });
const PROFILE_LABELS = Object.freeze({ buyer: 'Acheteur', mechanic: 'Garagiste', rental: 'Agence de location', seller: 'Vendeur', owner: 'Propriétaire' });

const STEP_TITLES = [
  'Votre objectif',
  'Identification du véhicule',
  'Contexte du dossier',
  'Expertise et synthèse',
];

const PROFILE_CONTEXT = {
  buyer: 'Ajoutez les informations de l’annonce et les déclarations du vendeur pour cadrer l’audit avant achat.',
  mechanic: 'Consignez la plainte client et les données d’entrée avant tout effacement, démontage ou intervention.',
  rental: 'Documentez le véhicule de flotte, le kilométrage et les différences entre l’état de départ et l’état de retour.',
  seller: 'Documentez les entretiens, réparations et défauts connus avec un maximum de transparence.',
  owner: 'Décrivez l’évolution du véhicule pour construire un carnet de santé technique utile dans le temps.',
};

function translate(key, fallback, variables) {
  return window.cardiagI18n?.t?.(key, fallback, variables) || fallback;
}

function safeStorageGet(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function safeStorageSet(key, value) {
  try { window.localStorage.setItem(key, value); } catch { /* Mode privé : état conservé en mémoire. */ }
}

function activeProfile() {
  const selected = document.querySelector('[name="usage_scenario"]:checked')?.value;
  return VALID_PROFILES.has(selected) ? selected : 'buyer';
}

function entrySelection() {
  const params = new URLSearchParams(location.search);
  const rawProfile = (params.get('profil') || '').trim().toLowerCase();
  const profile = PROFILE_FROM_SLUG[rawProfile] || '';
  const rawLevel = (params.get('niveau') || '').trim().toLowerCase();
  const level = ['rapide', 'quick'].includes(rawLevel) ? 'quick' : ['complet', 'complete'].includes(rawLevel) ? 'complete' : '';
  return { profile, level };
}

function updateEntryUrl(profile, level = '') {
  const url = new URL(location.href);
  if (VALID_PROFILES.has(profile)) url.searchParams.set('profil', PROFILE_TO_SLUG[profile]);
  if (level === 'quick' || level === 'complete') url.searchParams.set('niveau', level === 'quick' ? 'rapide' : 'complet');
  history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function createView(step, title) {
  const view = document.createElement('section');
  view.className = 'wizard-view';
  view.dataset.wizardStep = String(step);
  view.setAttribute('aria-labelledby', `wizardViewTitle${step}`);
  view.hidden = true;

  const heading = document.createElement('div');
  heading.className = 'wizard-view-heading';
  heading.innerHTML = `<p>ÉTAPE ${step} / ${STEP_COUNT}</p><h1 id="wizardViewTitle${step}">${title}</h1>`;
  view.append(heading);
  return view;
}

function buildWizardViews() {
  const main = document.querySelector('main');
  const scenarioPanel = document.querySelector('.usage-scenario-panel');
  const contextPanel = document.getElementById('profileContextPanel');
  const infoSection = document.querySelector('details.section[data-section="info"]');
  const chatPanel = document.getElementById('chatPanel');
  if (!main || !scenarioPanel || !contextPanel || !infoSection || !chatPanel) return null;

  const root = document.createElement('div');
  root.className = 'wizard-root';
  root.id = 'wizardRoot';
  const views = STEP_TITLES.map((title, index) => createView(index + 1, title));

  views[0].append(scenarioPanel);
  infoSection.open = true;
  views[1].append(infoSection);
  views[2].append(contextPanel);

  const workspaceIntro = document.createElement('section');
  workspaceIntro.className = 'wizard-expertise-intro';
  views[3].append(workspaceIntro);

  const checklist = document.createElement('section');
  checklist.className = 'wizard-checklist';
  checklist.innerHTML = '<div class="wizard-checklist-heading"><p class="panel-kicker">CONTRÔLES TERRAIN</p><h2>Expertise détaillée</h2></div>';
  const quickBanner = document.querySelector('.quick-mode-banner');
  if (quickBanner) checklist.append(quickBanner);
  document.querySelectorAll('details.section:not([data-section="info"])').forEach((section) => checklist.append(section));

  const assistantGate = document.createElement('section');
  assistantGate.className = 'assistant-after-report';
  assistantGate.hidden = true;
  assistantGate.innerHTML = '<div><p class="panel-kicker">ASSISTANT FACULTATIF</p><h2>Vous avez des questions ?</h2><p>Votre fiche est prête. Ouvrez l’assistant uniquement si vous souhaitez comprendre ou approfondir un résultat.</p></div><button type="button" data-open-post-report-chat>Ouvrir l’assistant</button>';

  views[3].append(checklist, assistantGate, chatPanel);
  chatPanel.hidden = true;

  root.append(...views);
  main.replaceChildren(root);
  return { root, views, workspaceIntro, checklist, assistantGate };
}

export function initializeWizard() {
  const structure = buildWizardViews();
  if (!structure) return;

  const { views, workspaceIntro, checklist, assistantGate } = structure;
  const header = document.getElementById('wizardHeader');
  const professionalJourneyButton = document.getElementById('professionalJourneyBtn');
  const personalJourneyButton = document.getElementById('personalJourneyBtn');
  const bottomBar = document.getElementById('wizardBottomBar');
  const back = document.getElementById('wizardBack');
  const bottomBack = document.getElementById('wizardBottomBack');
  const next = document.getElementById('wizardNext');
  const generate = document.getElementById('wizardGenerate');
  const stepLabel = document.getElementById('wizardStepLabel');
  const progress = document.getElementById('wizardProgressBar');
  const contextPanel = document.getElementById('profileContextPanel');
  const dots = [...document.querySelectorAll('.wizard-dots span')];
  const contextIntro = document.getElementById('profileContextIntro');
  const profileChipText = document.getElementById('activeProfileChipText');
  const changeProfileButton = document.getElementById('changeProfileBtn');
  const chatPanel = document.getElementById('chatPanel');
  let currentStep = 1;
  let assistantOpened = false;
  let profileConfirmed = false;
  let profileReturnStep = 0;
  let transitionTimer;

  function profileFamily(profile = activeProfile()) {
    return PROFESSIONAL_PROFILES.has(profile) ? 'professional' : 'personal';
  }

  function renderProfileFamily(family = profileFamily()) {
    const activeFamily = family === 'professional' ? 'professional' : 'personal';
    document.querySelectorAll('[data-profile-family-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.profileFamilyPanel !== activeFamily;
    });
    professionalJourneyButton?.setAttribute('aria-pressed', String(activeFamily === 'professional'));
  }

  document.body.classList.add('wizard-active');
  header.hidden = false;
  bottomBar.hidden = false;

  function updateProfileContext() {
    const profile = activeProfile();
    document.body.dataset.usageScenario = profile;
    document.body.dataset.scenarioConfirmed = String(profileConfirmed);
    contextPanel.hidden = !profileConfirmed;
    contextPanel.setAttribute('aria-hidden', String(!profileConfirmed));
    if (contextIntro) contextIntro.textContent = translate(`context.${profile}`, PROFILE_CONTEXT[profile]);
    if (profileChipText) {
      const label = translate(PROFILE_LABEL_KEYS[profile], PROFILE_LABELS[profile]);
      profileChipText.textContent = translate('profile.active', `Profil : ${label}`, { profile: label });
    }
    document.querySelectorAll('[data-context-profile]').forEach((panel) => {
      const active = profileConfirmed && panel.dataset.contextProfile === profile;
      panel.hidden = !active;
      panel.setAttribute('aria-hidden', String(!active));
      panel.querySelectorAll('input, textarea, select, button').forEach((control) => {
        control.disabled = !active;
      });
    });
    const vin = document.querySelector('[name="vin"]');
    const vinRequired = personaRequiresVin(profile);
    if (vin) {
      vin.required = vinRequired;
      vin.setAttribute('aria-required', String(vinRequired));
      const label = vin.closest('.field')?.querySelector('label');
      label?.querySelector('[data-persona-required]')?.remove();
      if (vinRequired && label) label.insertAdjacentHTML('beforeend', ' <span class="req-star" data-persona-required>*</span>');
    }
    renderExpertiseLayout();
  }

  function hasGeneratedReport() {
    return Boolean(window.cardiagDataBridge?.getCurrentRecord?.()?.data?._report_generated_at);
  }

  function renderExpertiseLayout() {
    const ownerFirst = activeProfile() === 'owner';
    const generated = hasGeneratedReport();
    if (ownerFirst) {
      workspaceIntro.innerHTML = `<p class="panel-kicker">${translate('assistant.kicker', 'ASSISTANT PERSONNEL')}</p><h2>${translate('chat.title', "Console d'investigation")}</h2><p>${translate('context.owner', PROFILE_CONTEXT.owner)}</p>`;
      views[3].append(workspaceIntro, chatPanel, checklist, assistantGate);
      assistantGate.hidden = true;
      chatPanel.hidden = currentStep !== STEP_COUNT;
      return;
    }

    workspaceIntro.innerHTML = `<p class="panel-kicker">${translate('expertise.kicker', 'CONTRÔLES TERRAIN')}</p><h2>${translate('expertise.title', 'Complétez la fiche du véhicule')}</h2><p>${translate('expertise.description', 'Renseignez chaque point vérifié. Le rapport final peut être généré sans utiliser l’assistant.')}</p>`;
    assistantGate.querySelector('.panel-kicker').textContent = translate('assistant.kicker', 'ASSISTANT FACULTATIF');
    assistantGate.querySelector('h2').textContent = translate('assistant.question', 'Vous avez des questions ?');
    assistantGate.querySelector('p:last-child').textContent = translate('assistant.description', 'La fiche est prête. Posez une question uniquement si vous souhaitez approfondir un résultat.');
    assistantGate.querySelector('button').textContent = translate('assistant.open', 'Ouvrir l’assistant');
    views[3].append(workspaceIntro, checklist, assistantGate, chatPanel);
    assistantGate.hidden = !generated || assistantOpened;
    chatPanel.hidden = currentStep !== STEP_COUNT || !generated || !assistantOpened;
  }

  function validateIdentification() {
    const selectOrManual = (selectId, manualId) => (
      document.getElementById(manualId)?.value.trim()
      || document.getElementById(selectId)?.value
      || ''
    );
    const nonNegativeValue = (name) => {
      const value = document.querySelector(`[name="${name}"]`)?.value ?? '';
      return value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? value : '';
    };
    const required = [
      [selectOrManual('marqueSelect', 'marqueManualInput'), 'la marque'],
      [selectOrManual('modeleSelect', 'modeleManualInput'), 'le modèle'],
      [document.getElementById('anneeSelect')?.value || '', 'l’année'],
      [selectOrManual('motorisationSelect', 'motorisationManualInput'), 'la motorisation'],
      [nonNegativeValue('kilometrage'), 'le kilométrage'],
      [nonNegativeValue('valeur'), 'la valeur'],
    ];
    const missing = required.filter(([value]) => !value).map(([, label]) => label);
    const status = document.getElementById('result');
    const vin = document.querySelector('[name="vin"]');
    if (personaRequiresVin(activeProfile()) && !vin?.value.trim()) {
      const vinMessage = activeProfile() === 'rental'
        ? translate('validation.vin.rental', 'Le VIN est requis pour assurer la traçabilité du véhicule de flotte.')
        : translate('validation.vin.mechanic', 'Le VIN est requis pour documenter la prise en charge atelier.');
      if (status) status.textContent = vinMessage;
      window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', { detail: { type: 'error', message: vinMessage } }));
      vin?.focus();
      vin?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    if (missing.length) {
      if (status) status.textContent = `Complétez ${missing.join(', ')} avant de continuer.`;
      window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', { detail: { type: 'error', message: `Champs requis : ${missing.join(', ')}` } }));
      document.querySelector('#wizardViewTitle2')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return false;
    }
    window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', { detail: { type: 'success', message: 'Véhicule identifié' } }));
    return true;
  }

  function renderStep(direction = 'forward') {
    window.clearTimeout(transitionTimer);
    views.forEach((view, index) => {
      const step = index + 1;
      const active = step === currentStep;
      view.hidden = !active;
      view.classList.remove('is-active', 'slide-in-forward', 'slide-in-back');
      if (active) {
        view.classList.add('is-active', direction === 'back' ? 'slide-in-back' : 'slide-in-forward');
      }
    });
    transitionTimer = window.setTimeout(() => {
      views[currentStep - 1]?.classList.remove('slide-in-forward', 'slide-in-back');
    }, 320);

    const titleKeys = ['wizard.profile', 'wizard.vehicle', 'wizard.context', 'wizard.expertise'];
    const label = translate(titleKeys[currentStep - 1], STEP_TITLES[currentStep - 1]);
    stepLabel.textContent = translate('wizard.step', `Étape ${currentStep} sur ${STEP_COUNT} · ${label}`, { step: currentStep, total: STEP_COUNT, title: label });
    progress.style.width = `${(currentStep / STEP_COUNT) * 100}%`;
    dots.forEach((dot, index) => dot.classList.toggle('active', index < currentStep));
    back.hidden = currentStep === 1;
    bottomBack.hidden = currentStep === 1;
    next.hidden = currentStep === STEP_COUNT;
    generate.hidden = currentStep !== STEP_COUNT;
    document.body.classList.toggle('inspection-step-active', currentStep === STEP_COUNT);
    next.textContent = currentStep === 1
      ? translate('wizard.start', 'Commencer')
      : currentStep === 3
        ? translate('wizard.inspect', 'Commencer l’inspection')
        : translate('wizard.next', 'Suivant');
    generate.textContent = translate('wizard.generate', 'Générer le rapport');
    bottomBack.textContent = translate('wizard.back', 'Retour');
    if (currentStep === 2) {
      const infoSection = document.querySelector('details.section[data-section="info"]');
      if (infoSection) infoSection.open = true;
    }
    renderExpertiseLayout();
    safeStorageSet(STEP_STORAGE_KEY, String(currentStep));
    window.dispatchEvent(new CustomEvent('cardiag:wizard-step', { detail: { step: currentStep, direction } }));
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function goToStep(step, direction) {
    const target = Math.min(STEP_COUNT, Math.max(1, Number(step) || 1));
    if (target === currentStep) return;
    const resolvedDirection = direction || (target > currentStep ? 'forward' : 'back');
    currentStep = target;
    renderStep(resolvedDirection);
  }

  function advance() {
    if (currentStep === 1) {
      profileConfirmed = true;
      safeStorageSet(PROFILE_STORAGE_KEY, activeProfile());
      updateEntryUrl(activeProfile(), document.querySelector('[name="inspection_mode"]:checked')?.value || '');
      updateProfileContext();
      if (profileReturnStep) {
        const target = profileReturnStep;
        profileReturnStep = 0;
        goToStep(target, 'forward');
        return;
      }
    }
    if (currentStep === 2 && !validateIdentification()) return;
    goToStep(currentStep + 1, 'forward');
  }

  function retreat() {
    if (currentStep > 1) goToStep(currentStep - 1, 'back');
  }

  next.addEventListener('click', advance);
  back.addEventListener('click', retreat);
  bottomBack.addEventListener('click', retreat);
  generate.addEventListener('click', () => document.getElementById('generateBtn')?.click());

  document.querySelectorAll('[name="usage_scenario"]').forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      profileConfirmed = true;
      safeStorageSet(PROFILE_STORAGE_KEY, input.value);
      updateEntryUrl(input.value, document.querySelector('[name="inspection_mode"]:checked')?.value || '');
      assistantOpened = false;
      renderProfileFamily(profileFamily(input.value));
      updateProfileContext();
      window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', { detail: { type: 'selection', message: 'Parcours personnalisé' } }));
    });
  });

  document.querySelectorAll('[name="inspection_mode"]').forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked && profileConfirmed) updateEntryUrl(activeProfile(), input.value);
    });
  });

  changeProfileButton?.addEventListener('click', () => {
    profileReturnStep = 3;
    goToStep(1, 'back');
  });

  professionalJourneyButton?.addEventListener('click', () => {
    const mechanic = document.querySelector('[name="usage_scenario"][value="mechanic"]');
    if (mechanic && !mechanic.checked) {
      mechanic.checked = true;
      mechanic.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      renderProfileFamily('professional');
    }
    goToStep(1, 'back');
  });

  personalJourneyButton?.addEventListener('click', () => {
    const buyer = document.querySelector('[name="usage_scenario"][value="buyer"]');
    if (buyer && !buyer.checked) {
      buyer.checked = true;
      buyer.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      renderProfileFamily('personal');
    }
  });

  document.querySelectorAll('[data-chat-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      goToStep(4, 'forward');
      if (activeProfile() === 'owner') return;
      if (!hasGeneratedReport()) {
        window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', { detail: { type: 'selection', message: 'Terminez et générez d’abord la fiche. L’assistant restera ensuite facultatif.' } }));
        return;
      }
      assistantOpened = true;
      renderExpertiseLayout();
    });
  });
  document.getElementById('chatClose')?.addEventListener('click', (event) => {
    event.stopImmediatePropagation();
    if (activeProfile() !== 'owner' && hasGeneratedReport()) {
      assistantOpened = false;
      renderExpertiseLayout();
      assistantGate.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      goToStep(3, 'back');
    }
  }, true);

  assistantGate.querySelector('[data-open-post-report-chat]')?.addEventListener('click', () => {
    assistantOpened = true;
    renderExpertiseLayout();
    chatPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  window.addEventListener('cardiag:report-generated', (event) => {
    const currentRecordId = window.cardiagDataBridge?.getCurrentRecord?.()?.id;
    if (event.detail?.id && currentRecordId && event.detail.id !== currentRecordId) return;
    assistantOpened = false;
    renderExpertiseLayout();
    if (activeProfile() !== 'owner') assistantGate.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  window.addEventListener('cardiag:scenario-change', updateProfileContext);
  window.addEventListener('cardiag:record-open', () => {
    assistantOpened = false;
    safeStorageSet(PROFILE_STORAGE_KEY, activeProfile());
    updateProfileContext();
  });
  window.addEventListener('cardiag:language-change', () => {
    updateProfileContext();
    renderStep('forward');
  });

  // Les claviers mobiles réduisent le viewport : le champ actif est replacé
  // dans la zone visible après l’ouverture du clavier.
  document.addEventListener('focusin', (event) => {
    if (!event.target.matches('input, textarea, select')) return;
    window.setTimeout(() => event.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 280);
  });

  // Capacitor expose App dans le conteneur natif. Le listener reste optionnel
  // dans le navigateur et empêche Android de fermer l’application en plein tunnel.
  const nativeApp = window.Capacitor?.Plugins?.App;
  nativeApp?.addListener?.('backButton', () => {
    const topLayer = document.querySelector('.account-sheet.is-open,.design-panel.is-open,.settings-sheet.is-open,.records-sheet.is-open');
    if (topLayer) {
      topLayer.querySelector('[data-account-close],[data-design-close],[data-settings-close],[data-records-close]')?.click();
      return;
    }
    if (currentStep > 1) retreat();
  });
  document.addEventListener('backbutton', (event) => {
    if (currentStep > 1) {
      event.preventDefault();
      retreat();
    }
  });

  const entry = entrySelection();
  // L’accueil ouvre toujours les deux parcours personnels. Les liens partagés
  // restent compatibles et ouvrent directement le profil demandé.
  const initialProfile = VALID_PROFILES.has(entry.profile) ? entry.profile : 'buyer';
  if (VALID_PROFILES.has(initialProfile)) {
    profileConfirmed = Boolean(entry.profile);
    const profileInput = document.querySelector(`[name="usage_scenario"][value="${initialProfile}"]`);
    if (profileInput) profileInput.checked = true;
  }
  if (entry.level) {
    const modeInput = document.querySelector(`[name="inspection_mode"][value="${entry.level}"]`);
    if (modeInput) {
      modeInput.checked = true;
      modeInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  renderProfileFamily(entry.profile ? profileFamily(initialProfile) : 'personal');
  updateProfileContext();

  const savedStep = Number.parseInt(safeStorageGet(STEP_STORAGE_KEY) || '', 10);
  currentStep = VALID_PROFILES.has(entry.profile)
    ? (savedStep >= 2 && savedStep <= STEP_COUNT ? savedStep : 2)
    : 1;
  renderStep('forward');

  window.cardiagWizard = {
    get currentStep() { return currentStep; },
    next: advance,
    back: retreat,
    goToStep,
  };
}
