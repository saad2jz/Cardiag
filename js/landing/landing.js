const SETTINGS_KEY = 'cardiag_app_settings_v1';
const PROFILE_KEY = 'cardiag_user_profile_v1';
const PROFILE_SLUGS = Object.freeze({
  buyer: 'acheteur', seller: 'vendeur', owner: 'proprietaire',
  mechanic: 'garagiste', rental: 'location',
});

const EN = {
  ariaHome: 'CarDiag home', ariaNav: 'Main navigation', ariaBrand: 'CarDiag, home', ariaLanguage: 'Language',
  ariaExperience: 'CarDiag experience preview', ariaScore: 'Report score preview', ariaFeatures: 'Included features', ariaReportMockup: 'CarDiag PDF report preview', ariaLegal: 'Legal information', ariaUserType: 'User type',
  navHow: 'How it works', navReport: 'The report', navLogin: 'Sign in', navStart: 'Open the app',
  authGoogle: 'Continue with Google', authEmail: 'Sign in with email', authExisting: 'Already registered',
  kicker: 'USED VEHICLE INSPECTION · PROFESSIONAL REPORT',
  title: 'Inspect a used vehicle like an expert, in 15 minutes.',
  lead: 'A guided checklist, documented evidence and a clear PDF report to buy, sell, repair or monitor a vehicle with confidence.',
  start: 'Start an inspection', demo: 'View a sample report', local: 'Works offline', private: 'Reports are local by default · AI and sync on request', noCard: 'No payment card required',
  shortDisclaimer: 'CarDiag supports your decision and does not replace an official roadworthiness inspection.',
  factsPoints: 'structured inspection points', factsSections: 'technical sections', factsReport: 'professional PDF report',
  existingFeaturesKicker: 'TWO MODES, ONE CLEARER DECISION', existingFeaturesTitle: 'Adapt the inspection to the time available.',
  quickFeatureTitle: '⚡ Quick inspection', quickFeatureText: 'Need an initial opinion in 5 minutes? Quick mode covers the 12 most critical points.',
  compareFeatureTitle: '⇄ Vehicle comparison', compareFeatureText: 'Compare 2 or 3 reports side by side to review scores, faults and budgets.',
  pathsTitle: 'One method, adapted to your objective.', pathsIntro: 'Choose your situation. CarDiag opens the existing inspection workflow with the appropriate controls and final report.',
  personalFamily: 'Personal', personalFamilyText: 'Buy, sell or monitor your vehicle', professionalFamily: 'Professional', professionalFamilyText: 'Workshop, repairs and fleet management', popular: 'Most selected',
  buyer: 'Buyer', buyerText: 'Identify major risks, estimate repairs and prepare evidence-based negotiation.',
  mechanic: 'Workshop', mechanicText: 'Document customer intake, measurements, repairs and final checks.',
  rental: 'Rental agency', rentalText: 'Track the fleet, mileage and vehicle condition before and after each rental.',
  seller: 'Seller', sellerText: 'Build a transparent vehicle file that can be shared with a future buyer.',
  owner: 'Owner', ownerText: 'Keep a clear health record and understand faults without technical jargon.',
  ownerLandingTitle: 'I have a problem with my car', ownerLandingText: 'I need an expert diagnosis to understand the symptoms and know which checks to carry out.', ownerLandingCta: 'Start an expert diagnosis', openPath: 'Choose this workflow',
  pathImpact: 'This choice adapts the displayed fields and score weighting. You can change it without losing shared information.',
  processTitle: 'From the vehicle to a defensible decision.', processIntro: 'The experience guides you without replacing an official roadworthiness test or a qualified professional.',
  step1Title: 'Identify', step1Text: 'Select the vehicle and add the mileage, VIN and relevant context.',
  step2Title: 'Inspect', step2Text: 'Complete the seven sections and attach each photo to the exact control point.',
  step3Title: 'Decide', step3Text: 'Review the weighted score, estimated costs and export the detailed PDF report.',
  valueKicker: 'THE DELIVERABLE', valueTitle: 'A report designed to be read, shared and trusted.', valueText: 'The final document turns field observations into a structured record, without inventing checks that were not completed.',
  value1: 'Visual summary, weighted score and inspection coverage', value2: 'Photos placed in their exact technical section', value3: 'Risk alerts, estimated repairs and negotiation guidance', value4: 'Signatures, legal limitations and optional read-only sharing',
  reportHeader: 'INSPECTION REPORT', reportHeaderFull: 'VEHICLE INSPECTION REPORT', reportTitle: 'Vehicle inspection report', decision: 'NEGOTIATION', verified: 'points checked',
  organs: 'Vital systems', chassis: 'Chassis', appearance: 'Appearance', downloadDemo: 'Download the fictitious sample PDF →',
  finalTitle: 'Make your next automotive decision with evidence.', finalText: 'Inspection and PDF export are currently available without payment. No subscription is active.', finalButton: 'Create my first inspection',
  footerText: 'CarDiag · Guided vehicle inspection and traceability', privacy: 'Privacy', terms: 'Terms', account: 'Account deletion', imageAlt: 'Vehicle in a workshop beside a tablet showing a CarDiag inspection report',
};

function readJson(key, fallback = {}) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } }
function isNative() { return Boolean(globalThis.Capacitor?.isNativePlatform?.()); }
function shouldSkipLanding() {
  const params = new URLSearchParams(location.search);
  const hasProfileEntry = Object.values(PROFILE_SLUGS).includes((params.get('profil') || '').toLowerCase());
  return isNative() || params.get('app') === '1' || params.has('action') || hasProfileEntry
    || /^\/(app|fiche)\//.test(location.pathname) || location.pathname === '/app';
}

function applyLanguage(root, language) {
  root.querySelectorAll('[data-landing-i18n]').forEach((node) => {
    if (node.dataset.landingI18n === 'title') {
      node.innerHTML = language === 'en'
        ? 'Inspect a used vehicle like an expert, <span>in 15 minutes.</span>'
        : "Inspectez un véhicule d'occasion comme un expert, <span>en 15 minutes.</span>";
      return;
    }
    if (!node.dataset.landingFr) node.dataset.landingFr = node.textContent.trim();
    const key = node.dataset.landingI18n;
    node.textContent = language === 'en' ? (EN[key] || node.dataset.landingFr) : node.dataset.landingFr;
  });
  [root, ...root.querySelectorAll('[data-landing-aria-label]')].forEach((node) => {
    if (!node.matches('[data-landing-aria-label]')) return;
    if (!node.dataset.landingAriaFr) node.dataset.landingAriaFr = node.getAttribute('aria-label') || '';
    const key = node.dataset.landingAriaLabel;
    node.setAttribute('aria-label', language === 'en' ? (EN[key] || node.dataset.landingAriaFr) : node.dataset.landingAriaFr);
  });
  root.querySelectorAll('[data-landing-language]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.landingLanguage === language)));
  const heroImage = root.querySelector('.landing-visual-frame img');
  if (heroImage) heroImage.alt = language === 'en' ? EN.imageAlt : heroImage.dataset.altFr;
}

function selectScenario(role) {
  const input = document.querySelector(`[name="usage_scenario"][value="${role}"]`);
  if (!input) return;
  input.checked = true;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function persistEntryChoice(role, level = '') {
  const profile = PROFILE_SLUGS[role] || '';
  if (window.cardiagRouter?.newInspection) {
    window.cardiagRouter.newInspection(profile, level, profile === 'proprietaire' ? 'diagnostic' : 'identification');
    return;
  }
  // Compatibility while the application shell is still starting. The router
  // converts this old share format to a canonical path on first render.
  const url = new URL(location.href);
  if (role && profile) url.searchParams.set('profil', profile);
  else url.searchParams.delete('profil');
  if (level === 'quick' || level === 'complete') {
    url.searchParams.set('niveau', level === 'quick' ? 'rapide' : 'complet');
  }
  history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export function initializeLanding() {
  const root = document.getElementById('marketingLanding');
  if (!root) return { active: false };
  let active = !shouldSkipLanding();

  const hide = () => {
    active = false;
    root.hidden = true;
    document.body.classList.remove('landing-active');
    document.documentElement.scrollTop = 0;
  };

  const enter = (role = '') => {
    if (!window.cardiagLocalProfile) {
      root.setAttribute('aria-busy', 'true');
      window.addEventListener('cardiag:profile-onboarding-ready', () => {
        root.removeAttribute('aria-busy');
        enter(role);
      }, { once: true });
      return;
    }
    const selectedLevel = document.querySelector('[name="inspection_mode"]:checked')?.value || '';
    persistEntryChoice(role, selectedLevel);
    hide();
    if (role) selectScenario(role);
    const profile = readJson(PROFILE_KEY, null);
    if (!profile) {
      window.cardiagLocalProfile?.open?.({ suggestedRole: role || 'buyer' });
      return;
    }
    window.cardiagWizard?.goToStep?.(role ? 2 : 1, 'forward');
  };

  const showFamily = (family = 'personal') => {
    const activeFamily = family === 'professional' ? 'professional' : 'personal';
    root.querySelectorAll('[data-landing-family]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.landingFamily === activeFamily));
    });
    root.querySelectorAll('[data-profile-family]').forEach((card) => {
      card.hidden = card.dataset.profileFamily !== activeFamily;
    });
  };

  if (!active) hide();
  else {
    root.hidden = false;
    document.body.classList.add('landing-active');
  }

  root.querySelectorAll('[data-landing-enter]').forEach((button) => button.addEventListener('click', () => enter(button.dataset.landingRole || '')));
  const authToggle = root.querySelector('[data-landing-auth-toggle]');
  const authOptions = root.querySelector('#landingAuthOptions');
  const closeAuthOptions = () => {
    if (!authToggle || !authOptions) return;
    authToggle.setAttribute('aria-expanded', 'false');
    authOptions.hidden = true;
  };
  authToggle?.addEventListener('click', () => {
    const open = authToggle.getAttribute('aria-expanded') !== 'true';
    authToggle.setAttribute('aria-expanded', String(open));
    if (authOptions) authOptions.hidden = !open;
  });
  root.querySelectorAll('[data-landing-auth]').forEach((button) => button.addEventListener('click', () => {
    closeAuthOptions();
    // The account sheet is lazy-loaded by app.js. This never enters the
    // inspection tunnel, so an anonymous visitor remains on the landing page.
    window.dispatchEvent(new CustomEvent('cardiag:open-auth', {
      detail: { view: 'login', provider: button.dataset.landingAuth || 'email' },
    }));
  }));
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.landing-account-menu')) closeAuthOptions();
  });
  root.querySelectorAll('[data-landing-family]').forEach((button) => button.addEventListener('click', () => showFamily(button.dataset.landingFamily)));
  root.querySelectorAll('[data-landing-language]').forEach((button) => button.addEventListener('click', () => {
    const language = button.dataset.landingLanguage === 'en' ? 'en' : 'fr';
    const settings = readJson(SETTINGS_KEY, {});
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, language })); } catch { /* The active UI still changes. */ }
    window.cardiagI18n?.setLanguage?.(language);
    applyLanguage(root, language);
  }));
  root.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener('click', () => document.querySelector(link.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' })));
  window.addEventListener('cardiag:language-change', (event) => applyLanguage(root, event.detail?.language || 'fr'));
  applyLanguage(root, window.cardiagI18n?.language || 'fr');
  showFamily('personal');
  window.cardiagLanding = {
    get active() { return active; },
    enter,
    hide,
    show() { active = true; root.hidden = false; document.body.classList.add('landing-active'); },
  };
  return { get active() { return active; } };
}
