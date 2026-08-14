const PROFILE_STORAGE_KEY = 'cardiag_active_profile';
const STEP_STORAGE_KEY = 'cardiag_wizard_step';
const VALID_PROFILES = new Set(['buyer', 'mechanic', 'seller', 'owner']);
const STEP_COUNT = 4;

const STEP_TITLES = [
  'Votre objectif',
  'Identification du véhicule',
  'Contexte du dossier',
  'Expertise et synthèse',
];

const PROFILE_CONTEXT = {
  buyer: 'Ajoutez les informations de l’annonce et les déclarations du vendeur pour cadrer l’audit avant achat.',
  mechanic: 'Consignez la plainte client et les données d’entrée avant tout effacement, démontage ou intervention.',
  seller: 'Documentez les entretiens, réparations et défauts connus avec un maximum de transparence.',
  owner: 'Décrivez l’évolution du véhicule pour construire un carnet de santé technique utile dans le temps.',
};

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
  workspaceIntro.innerHTML = '<p class="panel-kicker">ASSISTANT ET RAPPORT ÉVOLUTIF</p><h2>Analysez, contrôlez et documentez</h2><p>La synthèse se met à jour à chaque observation. Les contrôles détaillés restent disponibles sous la console.</p>';
  views[3].append(workspaceIntro, chatPanel);
  chatPanel.hidden = false;

  const checklist = document.createElement('section');
  checklist.className = 'wizard-checklist';
  checklist.innerHTML = '<div class="wizard-checklist-heading"><p class="panel-kicker">CONTRÔLES TERRAIN</p><h2>Expertise détaillée</h2></div>';
  const quickBanner = document.querySelector('.quick-mode-banner');
  if (quickBanner) checklist.append(quickBanner);
  document.querySelectorAll('details.section:not([data-section="info"])').forEach((section) => checklist.append(section));
  views[3].append(checklist);

  root.append(...views);
  main.replaceChildren(root);
  return { root, views };
}

export function initializeWizard() {
  const structure = buildWizardViews();
  if (!structure) return;

  const { views } = structure;
  const header = document.getElementById('wizardHeader');
  const bottomBar = document.getElementById('wizardBottomBar');
  const back = document.getElementById('wizardBack');
  const bottomBack = document.getElementById('wizardBottomBack');
  const next = document.getElementById('wizardNext');
  const generate = document.getElementById('wizardGenerate');
  const stepLabel = document.getElementById('wizardStepLabel');
  const progress = document.getElementById('wizardProgressBar');
  const dots = [...document.querySelectorAll('.wizard-dots span')];
  const contextIntro = document.getElementById('profileContextIntro');
  const chatPanel = document.getElementById('chatPanel');
  let currentStep = 1;
  let transitionTimer;

  document.body.classList.add('wizard-active');
  header.hidden = false;
  bottomBar.hidden = false;

  function updateProfileContext() {
    const profile = activeProfile();
    document.body.dataset.usageScenario = profile;
    if (contextIntro) contextIntro.textContent = PROFILE_CONTEXT[profile];
    document.querySelectorAll('[data-context-profile]').forEach((panel) => {
      panel.hidden = panel.dataset.contextProfile !== profile;
    });
  }

  function validateIdentification() {
    const selectOrManual = (selectId, manualId) => (
      document.getElementById(manualId)?.value.trim()
      || document.getElementById(selectId)?.value
      || ''
    );
    const required = [
      [selectOrManual('marqueSelect', 'marqueManualInput'), 'la marque'],
      [selectOrManual('modeleSelect', 'modeleManualInput'), 'le modèle'],
      [document.getElementById('anneeSelect')?.value || '', 'l’année'],
      [selectOrManual('motorisationSelect', 'motorisationManualInput'), 'la motorisation'],
    ];
    const missing = required.filter(([value]) => !value).map(([, label]) => label);
    const status = document.getElementById('result');
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

    const label = STEP_TITLES[currentStep - 1];
    stepLabel.textContent = `Étape ${currentStep} sur ${STEP_COUNT} · ${label}`;
    progress.style.width = `${(currentStep / STEP_COUNT) * 100}%`;
    dots.forEach((dot, index) => dot.classList.toggle('active', index < currentStep));
    back.hidden = currentStep === 1;
    bottomBack.hidden = currentStep === 1;
    next.hidden = currentStep === STEP_COUNT;
    generate.hidden = currentStep !== STEP_COUNT;
    next.textContent = currentStep === 1 ? 'Commencer' : currentStep === 3 ? 'Lancer l’expertise' : 'Suivant';
    chatPanel.hidden = currentStep !== STEP_COUNT;
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
      safeStorageSet(PROFILE_STORAGE_KEY, activeProfile());
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
      safeStorageSet(PROFILE_STORAGE_KEY, input.value);
      updateProfileContext();
      window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', { detail: { type: 'selection', message: 'Parcours personnalisé' } }));
      window.setTimeout(() => goToStep(2, 'forward'), 120);
    });
  });

  document.querySelectorAll('[data-chat-toggle]').forEach((button) => {
    button.addEventListener('click', () => goToStep(4, 'forward'));
  });
  document.getElementById('chatClose')?.addEventListener('click', (event) => {
    event.stopImmediatePropagation();
    goToStep(3, 'back');
  }, true);

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

  const storedProfile = safeStorageGet(PROFILE_STORAGE_KEY);
  if (VALID_PROFILES.has(storedProfile)) {
    const profileInput = document.querySelector(`[name="usage_scenario"][value="${storedProfile}"]`);
    if (profileInput) profileInput.checked = true;
  }
  updateProfileContext();

  const savedStep = Number.parseInt(safeStorageGet(STEP_STORAGE_KEY) || '', 10);
  currentStep = VALID_PROFILES.has(storedProfile)
    ? (savedStep >= 1 && savedStep <= STEP_COUNT ? savedStep : 4)
    : 1;
  renderStep('forward');

  window.cardiagWizard = {
    get currentStep() { return currentStep; },
    next: advance,
    back: retreat,
    goToStep,
  };
}
