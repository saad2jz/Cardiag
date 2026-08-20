const STORAGE_KEY = 'cardiag_user_profile_v1';
const SETTINGS_KEY = 'cardiag_app_settings_v1';
const VALID_PERSONAL_ROLES = new Set(['buyer', 'seller', 'owner']);

function readProfile() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}

function persistProfile(profile) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch { /* Le profil reste disponible en mémoire. */ }
}

export function normalizeLocalProfile(value = {}) {
  const type = value.type === 'professional' ? 'professional' : 'personal';
  const professionalKind = value.professionalKind === 'rental' || value.role === 'rental' ? 'rental' : 'mechanic';
  const personalRole = VALID_PERSONAL_ROLES.has(value.role) ? value.role : 'owner';
  return {
    type,
    professionalKind,
    role: type === 'professional' ? professionalKind : personalRole,
    displayName: String(value.displayName || '').trim().slice(0, 80),
    email: String(value.email || '').trim().slice(0, 160),
    phone: String(value.phone || '').trim().slice(0, 40),
    garageName: String(value.garageName || '').trim().slice(0, 100),
    contactName: String(value.contactName || '').trim().slice(0, 80),
    siret: String(value.siret || '').replace(/\D/g, '').slice(0, 14),
    vatNumber: String(value.vatNumber || '').trim().slice(0, 30),
    address: String(value.address || '').trim().slice(0, 240),
    website: String(value.website || '').trim().slice(0, 180),
    specialties: String(value.specialties || '').trim().slice(0, 300),
    fleetSize: String(value.fleetSize || '').replace(/\D/g, '').slice(0, 6),
    fleetReference: String(value.fleetReference || '').trim().slice(0, 60),
    createdAt: value.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function validateProfileContact(emailValue, phoneValue) {
  const email = String(emailValue || '').trim();
  const phone = String(phoneValue || '').trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phoneDigits = phone.replace(/\D/g, '');
  const phoneValid = /^\+?[0-9][0-9\s().-]*$/.test(phone)
    && phoneDigits.length >= 7
    && phoneDigits.length <= 15;

  if (!emailPattern.test(email) && emailPattern.test(phone)) {
    return { valid: false, code: 'swapped', field: 'email' };
  }
  if (!emailPattern.test(email)) return { valid: false, code: 'email', field: 'email' };
  if (!phoneValid) return { valid: false, code: 'phone', field: 'phone' };
  return { valid: true, code: '', field: '' };
}

function readSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
}

function persistInitialLanguage(language) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...readSettings(), language })); } catch { /* Choix conservé en mémoire. */ }
}

function translate(key, fallback) { return window.cardiagI18n?.t?.(key, fallback) || fallback; }

function buildSurface() {
  const layer = document.createElement('section');
  layer.className = 'profile-onboarding';
  layer.hidden = true;
  layer.innerHTML = `
    <div class="language-onboarding-card" data-language-first hidden role="dialog" aria-modal="true" aria-labelledby="languageFirstTitle">
      <p class="panel-kicker">CARDIAG</p>
      <h1 id="languageFirstTitle">Choose your language<br><span>Choisissez votre langue</span></h1>
      <p>Cette langue sera utilisée dans toute l’application.<br><span>This language will be used throughout the application.</span></p>
      <div class="language-first-grid">
        <button type="button" data-first-language="fr"><strong>Français</strong><small>Continuer en français</small></button>
        <button type="button" data-first-language="en"><strong>English</strong><small>Continue in English</small></button>
      </div>
    </div>
    <div class="profile-onboarding-card" data-profile-card role="dialog" aria-modal="true" aria-labelledby="localProfileTitle">
      <header><div><p class="panel-kicker" data-profile-kicker></p><h1 id="localProfileTitle" data-profile-title></h1><p data-profile-intro></p></div><button type="button" data-profile-close aria-label="Fermer">×</button></header>
      <form data-local-profile-form novalidate>
        <fieldset class="profile-type-grid"><legend data-profile-type-legend></legend>
          <label><input type="radio" name="profile_type" value="professional" required><span><b data-profile-pro-title></b><small data-profile-pro-description></small></span></label>
          <label><input type="radio" name="profile_type" value="personal"><span><b data-profile-personal-title></b><small data-profile-personal-description></small></span></label>
        </fieldset>
        <section data-profile-fields="professional" hidden>
          <fieldset class="professional-kind-grid"><legend data-professional-kind-legend></legend>
            <label><input type="radio" name="professionalKind" value="mechanic"><span><b data-professional-mechanic-title></b><small data-professional-mechanic-description></small></span></label>
            <label><input type="radio" name="professionalKind" value="rental"><span><b data-professional-rental-title></b><small data-professional-rental-description></small></span></label>
          </fieldset>
          <div class="profile-form-grid">
            <label><span data-label="garageName"></span><input name="garageName" maxlength="100" autocomplete="organization"></label>
            <label><span data-label="contactName"></span><input name="contactName" maxlength="80" autocomplete="name"></label>
            <label><span data-label="siret"></span><input name="siret" inputmode="numeric" maxlength="14" pattern="[0-9]{14}"></label>
            <label><span data-label="vatNumber"></span><input name="vatNumber" maxlength="30"></label>
            <label><span data-label="email"></span><input name="professionalEmail" type="email" inputmode="email" autocomplete="email" placeholder="nom@exemple.com"></label>
            <label><span data-label="phone"></span><input name="professionalPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="06 12 34 56 78"></label>
            <label class="profile-field-wide"><span data-label="address"></span><textarea name="address" rows="2" autocomplete="street-address"></textarea></label>
            <label><span data-label="website"></span><input name="website" type="url" placeholder="https://"></label>
            <label><span data-label="specialties"></span><input name="specialties" maxlength="300"></label>
            <label data-professional-kind-fields="rental"><span data-label="fleetSize"></span><input name="fleetSize" type="number" min="1" max="999999"></label>
            <label data-professional-kind-fields="rental"><span data-label="fleetReference"></span><input name="fleetReference" maxlength="60"></label>
          </div>
        </section>
        <section data-profile-fields="personal" hidden>
          <div class="profile-form-grid">
            <label><span data-label="displayName"></span><input name="displayName" maxlength="80" autocomplete="name"></label>
            <label><span data-label="email"></span><input name="personalEmail" type="email" inputmode="email" autocomplete="email" placeholder="nom@exemple.com"></label>
            <label><span data-label="phone"></span><input name="personalPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="06 12 34 56 78"></label>
            <label><span data-label="role"></span><select name="personalRole"><option value="buyer"></option><option value="seller"></option><option value="owner"></option></select></label>
          </div>
        </section>
        <p class="profile-onboarding-error" data-profile-error role="alert"></p>
        <button type="submit" class="profile-onboarding-submit" data-profile-submit></button>
      </form>
    </div>`;
  document.body.append(layer);
  return layer;
}

export async function initializeProfileOnboarding(options = {}) {
  let current = readProfile();
  const layer = buildSurface();
  const languageCard = layer.querySelector('[data-language-first]');
  const profileCard = layer.querySelector('[data-profile-card]');
  const form = layer.querySelector('[data-local-profile-form]');
  const closeButton = layer.querySelector('[data-profile-close]');
  let editing = false;

  function applyTranslations() {
    const values = {
      '[data-profile-kicker]': ['onboarding.kicker', 'BIENVENUE SUR CARDIAG'],
      '[data-profile-title]': ['onboarding.title', 'Créez votre profil'],
      '[data-profile-intro]': ['onboarding.intro', 'Votre profil adapte les fiches véhicule, les contrôles et les rapports.'],
      '[data-profile-type-legend]': ['onboarding.type', 'Vous utilisez CarDiag en tant que…'],
      '[data-profile-pro-title]': ['onboarding.professional', 'Professionnel · Garagiste'],
      '[data-profile-pro-description]': ['onboarding.professional.description', 'Garage, mécanicien ou agence de location avec gestion des véhicules.'],
      '[data-profile-personal-title]': ['onboarding.personal', 'Personnel'],
      '[data-profile-personal-description]': ['onboarding.personal.description', 'Acheteur, vendeur ou propriétaire avec vos propres véhicules.'],
      '[data-profile-submit]': ['onboarding.submit', 'Enregistrer et ajouter mon véhicule'],
      '[data-professional-kind-legend]': ['onboarding.professionalKind', 'Votre activité professionnelle'],
      '[data-professional-mechanic-title]': ['onboarding.mechanic', 'Garagiste / Mécanicien'],
      '[data-professional-mechanic-description]': ['onboarding.mechanic.description', 'État d’entrée client, travaux réalisés et contrôle après réparation.'],
      '[data-professional-rental-title]': ['onboarding.rental', 'Agence de location'],
      '[data-professional-rental-description]': ['onboarding.rental.description', 'Flotte, kilométrage et état du véhicule avant/après location.'],
    };
    Object.entries(values).forEach(([selector, [key, fallback]]) => { layer.querySelector(selector).textContent = translate(key, fallback); });
    const labels = {
      garageName: ['onboarding.garageName', 'Nom de l’entreprise / agence / atelier *'], contactName: ['onboarding.contactName', 'Responsable / contact *'],
      siret: ['onboarding.siret', 'SIRET (14 chiffres) *'], vatNumber: ['onboarding.vat', 'N° TVA intracommunautaire'],
      email: ['onboarding.email', 'Email *'], phone: ['onboarding.phone', 'Téléphone *'], address: ['onboarding.address', 'Adresse complète *'],
      website: ['onboarding.website', 'Site internet'], specialties: ['onboarding.specialties', 'Spécialités de l’atelier'],
      displayName: ['onboarding.displayName', 'Nom complet *'], role: ['onboarding.goal', 'Objectif principal *'],
      fleetSize: ['onboarding.fleetSize', 'Nombre de véhicules dans la flotte'], fleetReference: ['onboarding.fleetReference', 'Préfixe / référence de flotte'],
    };
    Object.entries(labels).forEach(([name, [key, fallback]]) => layer.querySelectorAll(`[data-label="${name}"]`).forEach(node => { node.textContent = translate(key, fallback); }));
    const roleOptions = form.personalRole.options;
    roleOptions[0].textContent = translate('profile.buyer', 'Acheteur');
    roleOptions[1].textContent = translate('profile.seller', 'Vendeur');
    roleOptions[2].textContent = translate('profile.owner', 'Propriétaire');
    closeButton.setAttribute('aria-label', translate('common.close', 'Fermer'));
  }

  function renderType() {
    const type = form.profile_type.value;
    layer.querySelectorAll('[data-profile-fields]').forEach(section => {
      const active = section.dataset.profileFields === type;
      section.hidden = !active;
      section.querySelectorAll('input, select, textarea').forEach(control => { control.disabled = !active; });
    });
    const requiredByType = {
      professional: ['professionalKind', 'garageName', 'contactName', 'siret', 'professionalEmail', 'professionalPhone', 'address'],
      personal: ['displayName', 'personalEmail', 'personalPhone', 'personalRole'],
    };
    form.querySelectorAll('[required]').forEach(control => {
      if (control.name !== 'profile_type') control.required = false;
    });
    (requiredByType[type] || []).forEach(name => {
      const control = form.elements.namedItem(name);
      if (control) control.required = true;
    });
    const professionalKind = form.professionalKind.value || 'mechanic';
    layer.querySelectorAll('[data-professional-kind-fields]').forEach(field => { field.hidden = field.dataset.professionalKindFields !== professionalKind; });
  }

  function fill(profile) {
    const data = normalizeLocalProfile(profile || {});
    form.profile_type.value = data.type;
    form.professionalKind.value = data.professionalKind;
    form.garageName.value = data.garageName;
    form.contactName.value = data.contactName;
    form.siret.value = data.siret;
    form.vatNumber.value = data.vatNumber;
    form.professionalEmail.value = data.type === 'professional' ? data.email : '';
    form.professionalPhone.value = data.type === 'professional' ? data.phone : '';
    form.address.value = data.address;
    form.website.value = data.website;
    form.specialties.value = data.specialties;
    form.fleetSize.value = data.fleetSize;
    form.fleetReference.value = data.fleetReference;
    form.displayName.value = data.displayName;
    form.personalEmail.value = data.type === 'personal' ? data.email : '';
    form.personalPhone.value = data.type === 'personal' ? data.phone : '';
    form.personalRole.value = ['mechanic', 'rental'].includes(data.role) ? 'owner' : data.role;
    renderType();
  }

  function open(options = {}) {
    editing = Boolean(options.edit);
    const suggestedRole = ['buyer', 'seller', 'owner', 'mechanic', 'rental'].includes(options.suggestedRole) ? options.suggestedRole : 'owner';
    const suggestedProfile = ['mechanic', 'rental'].includes(suggestedRole)
      ? { type: 'professional', professionalKind: suggestedRole, role: suggestedRole }
      : { type: 'personal', role: suggestedRole };
    fill(current || suggestedProfile);
    applyTranslations();
    closeButton.hidden = !editing && !current;
    languageCard.hidden = true;
    profileCard.hidden = false;
    layer.hidden = false;
    document.body.classList.add('profile-onboarding-open');
    requestAnimationFrame(() => layer.classList.add('is-open'));
  }

  function openFirstLanguage() {
    languageCard.hidden = false;
    profileCard.hidden = true;
    layer.hidden = false;
    document.body.classList.add('profile-onboarding-open');
    requestAnimationFrame(() => layer.classList.add('is-open'));
  }

  function hideLayer() {
    layer.classList.remove('is-open');
    document.body.classList.remove('profile-onboarding-open');
    setTimeout(() => { layer.hidden = true; }, 180);
  }

  function close() {
    if (!current) return;
    hideLayer();
  }

  form.addEventListener('change', event => { if (event.target.name === 'profile_type' || event.target.name === 'professionalKind') renderType(); });
  form.addEventListener('input', event => {
    event.target.removeAttribute?.('aria-invalid');
    layer.querySelector('[data-profile-error]').textContent = '';
  });
  layer.querySelectorAll('[data-first-language]').forEach(button => button.addEventListener('click', () => {
    const language = button.dataset.firstLanguage;
    persistInitialLanguage(language);
    window.cardiagI18n?.setLanguage?.(language);
    if (options.deferProfile) {
      hideLayer();
      window.dispatchEvent(new CustomEvent('cardiag:first-language-selected', { detail: { language } }));
    } else open();
  }));
  closeButton.addEventListener('click', close);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    form.querySelectorAll('[aria-invalid="true"]').forEach(control => control.removeAttribute('aria-invalid'));
    const errorNode = layer.querySelector('[data-profile-error]');
    errorNode.textContent = '';
    const type = form.profile_type.value;
    const raw = type === 'professional' ? {
      type, professionalKind: form.professionalKind.value, garageName: form.garageName.value, contactName: form.contactName.value, siret: form.siret.value,
      vatNumber: form.vatNumber.value, email: form.professionalEmail.value, phone: form.professionalPhone.value,
      address: form.address.value, website: form.website.value, specialties: form.specialties.value,
      fleetSize: form.fleetSize.value, fleetReference: form.fleetReference.value,
    } : {
      type, displayName: form.displayName.value, email: form.personalEmail.value, phone: form.personalPhone.value,
      role: form.personalRole.value,
    };
    const profile = normalizeLocalProfile({ ...current, ...raw });
    const missing = type === 'professional'
      ? !profile.garageName || !profile.contactName || profile.siret.length !== 14 || !profile.email || !profile.phone || !profile.address
      : !profile.displayName || !profile.email || !profile.phone;
    if (missing) {
      errorNode.textContent = translate('onboarding.required', 'Complétez tous les champs obligatoires avant de continuer.');
      const invalidControl = form.querySelector(':invalid');
      invalidControl?.setAttribute('aria-invalid', 'true');
      invalidControl?.focus({ preventScroll: true });
      invalidControl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const contact = validateProfileContact(profile.email, profile.phone);
    if (!contact.valid) {
      const messages = {
        swapped: ['onboarding.contactSwapped', 'Les champs Email et Téléphone semblent inversés. Saisissez l’adresse dans Email et le numéro dans Téléphone.'],
        email: ['onboarding.invalidEmail', 'Saisissez une adresse e-mail valide, par exemple nom@exemple.com.'],
        phone: ['onboarding.invalidPhone', 'Saisissez un numéro de téléphone valide comportant entre 7 et 15 chiffres.'],
      };
      const [key, fallback] = messages[contact.code];
      errorNode.textContent = translate(key, fallback);
      const targetName = type === 'professional'
        ? (contact.field === 'email' ? 'professionalEmail' : 'professionalPhone')
        : (contact.field === 'email' ? 'personalEmail' : 'personalPhone');
      const target = form.elements.namedItem(targetName);
      target?.setAttribute('aria-invalid', 'true');
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!form.checkValidity()) {
      errorNode.textContent = translate('onboarding.invalid', 'Corrigez le champ signalé avant de continuer.');
      const invalidControl = form.querySelector(':invalid');
      invalidControl?.setAttribute('aria-invalid', 'true');
      invalidControl?.focus({ preventScroll: true });
      invalidControl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    current = profile;
    persistProfile(profile);
    if (type === 'professional') await window.cardiagBranding?.update?.({ workshopName: profile.garageName });
    const roleInput = document.querySelector(`[name="usage_scenario"][value="${profile.role}"]`);
    if (roleInput) { roleInput.checked = true; roleInput.dispatchEvent(new Event('change', { bubbles: true })); }
    window.dispatchEvent(new CustomEvent('cardiag:local-profile-change', { detail: profile }));
    close();
    if (!editing) window.cardiagWizard?.goToStep?.(2, 'forward');
  });
  window.addEventListener('cardiag:language-change', applyTranslations);

  window.cardiagLocalProfile = { get current() { return current ? { ...current } : null; }, open };
  window.dispatchEvent(new CustomEvent('cardiag:profile-onboarding-ready'));
  const hasLanguageChoice = ['fr', 'en', 'auto'].includes(readSettings().language);
  if (!current && !hasLanguageChoice) openFirstLanguage();
  else if (!current && !options.deferProfile) open();
  return current;
}
