import { authClient } from './firebase-client.js?v=20260824-2';

const ROLES = { buyer:'Acheteur', mechanic:'Garagiste / Mécanicien', rental:'Agence de location', seller:'Vendeur', owner:'Propriétaire' };

function message(panel, text, type = '') {
  const node = panel.querySelector('[data-auth-status]');
  node.textContent = text;
  node.dataset.type = type;
}

function createAuthSurface() {
  const panel = document.createElement('section');
  panel.className = 'account-sheet';
  panel.id = 'accountSheet';
  panel.hidden = true;
  panel.innerHTML = `
    <header><div><p class="panel-kicker">COMPTE CARDIAG</p><h2 data-account-title>Connexion</h2></div><button type="button" data-account-close aria-label="Fermer">×</button></header>
    <div class="auth-view" data-auth-view="login">
      <form data-auth-form="login">
        <label>Email<input type="email" name="email" autocomplete="email" inputmode="email" required></label>
        <label>Mot de passe<input type="password" name="password" autocomplete="current-password" required></label>
        <button type="submit">Se connecter</button>
      </form>
      <button type="button" class="google-auth-button" data-google-login><span aria-hidden="true">G</span> Continuer avec Google</button>
      <button type="button" data-auth-show="reset">Mot de passe oublié</button>
      <button type="button" data-auth-show="signup">Créer un compte</button>
    </div>
    <div class="auth-view" data-auth-view="signup" hidden>
      <form data-auth-form="signup">
        <label>Email<input type="email" name="email" autocomplete="email" inputmode="email" required></label>
        <label>Mot de passe<input type="password" name="password" autocomplete="new-password" minlength="8" aria-describedby="signupPasswordHint" required></label>
        <small class="auth-field-hint" id="signupPasswordHint">8 caractères minimum.</small>
        <label>Confirmer le mot de passe<input type="password" name="passwordConfirmation" autocomplete="new-password" minlength="8" required></label>
        <label>Rôle<select name="role">${Object.entries(ROLES).map(([value,label]) => `<option value="${value}">${label}</option>`).join('')}</select></label>
        <label class="consent-check"><input type="checkbox" name="consent" required> J’accepte la politique de confidentialité et la synchronisation de mes fiches.</label>
        <button type="submit">Créer mon compte</button>
      </form>
      <div class="auth-provider-divider" aria-hidden="true"><span>ou</span></div>
      <button type="button" class="google-auth-button" data-google-signup><span aria-hidden="true">G</span> Créer un compte avec Google</button>
      <button type="button" data-auth-show="login">Déjà inscrit</button>
    </div>
    <div class="auth-view" data-auth-view="reset" hidden>
      <p class="auth-help">Saisissez l’adresse utilisée pour votre compte. Le lien est envoyé par Firebase et peut arriver dans les courriers indésirables.</p>
      <form data-auth-form="reset"><label>Email<input type="email" name="email" autocomplete="email" inputmode="email" required></label><button type="submit">Envoyer le lien</button></form>
      <button type="button" data-auth-show="login">Retour à la connexion</button>
    </div>
    <div class="auth-view" data-auth-view="profile" hidden>
      <div class="account-summary"><div class="account-summary-avatar" data-account-avatar aria-hidden="true">C</div><div><strong data-account-summary-name>Compte CarDiag</strong><span data-account-summary-email></span><span class="account-verified" data-account-verification></span></div></div>
      <section class="account-verification-tools" data-verification-tools hidden><p>Vérifiez votre adresse email pour activer la synchronisation et le partage sécurisé.</p><div><button type="button" data-resend-verification>Renvoyer l’email</button><button type="button" data-check-verification>J’ai vérifié mon email</button></div></section>
      <section class="account-migration" data-local-migration hidden aria-live="polite"><div><strong>Fiches locales à sauvegarder</strong><p data-local-migration-text></p></div><button type="button" data-migrate-local>Synchroniser maintenant</button></section>
      <form data-profile-form>
        <label>Email du compte<input name="accountEmail" type="email" readonly></label>
        <label>Nom affiché<input name="displayName" maxlength="80" autocomplete="name"></label>
        <label>Téléphone<input name="phone" type="tel" maxlength="30" autocomplete="tel"></label>
        <label>Rôle<select name="role">${Object.entries(ROLES).map(([value,label]) => `<option value="${value}">${label}</option>`).join('')}</select></label>
        <label>Organisation / atelier<input name="garageName" maxlength="120" autocomplete="organization"></label>
        <label>Avatar<input type="file" name="avatarFile" accept="image/*"></label>
        <button type="submit">Enregistrer les réglages du profil</button>
      </form>
      <div class="account-actions"><button type="button" data-export-account>Exporter mes données</button><button type="button" data-sign-out>Se déconnecter</button><button type="button" class="danger" data-delete-account>Supprimer définitivement le compte</button></div>
    </div>
    <p class="auth-status" data-auth-status role="status" aria-live="polite"></p>`;
  document.body.append(panel);
  return panel;
}

function avatarData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function profilePayload(overrides = {}) {
  const local = window.cardiagLocalProfile?.current || {};
  return {
    displayName:local.displayName || local.contactName || '', accountType:local.type || 'personal', phone:local.phone || '', garageName:local.garageName || '',
    contactName:local.contactName || '', siret:local.siret || '', address:local.address || '', website:local.website || '', professionalKind:local.professionalKind || '',
    fleetSize:local.fleetSize || '', fleetReference:local.fleetReference || '', role:local.role || 'buyer', consent:true, ...overrides,
  };
}

function setBusy(button, busy) {
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
}

export async function initializeAuthUi() {
  const panel = createAuthSurface();
  const actions = document.createElement('div');
  actions.className = 'auth-quick-actions';
  const trigger = document.createElement('button');
  trigger.className = 'account-trigger';
  trigger.type = 'button';
  trigger.textContent = 'Déjà inscrit';
  const signupTrigger = document.createElement('button');
  signupTrigger.className = 'account-signup-trigger';
  signupTrigger.type = 'button';
  signupTrigger.textContent = 'Créer un compte';
  actions.append(trigger, signupTrigger);
  document.getElementById('wizardHeader')?.append(actions);

  let signupRole = 'buyer';
  let profile = null;
  let profileUid = '';
  let profileRequest = 0;

  const pendingLocalRecords = () => (window.cardiagDataBridge?.exportRecords?.() || [])
    .filter((record) => !record?.syncConflict && (!Number.isSafeInteger(record.syncVersion) || record.syncVersion < 1)).length;
  const refreshMigration = (user = authClient.user) => {
    const section = panel.querySelector('[data-local-migration]');
    const button = panel.querySelector('[data-migrate-local]');
    const count = pendingLocalRecords();
    section.hidden = !user || count === 0;
    if (section.hidden) return;
    const verified = Boolean(user.emailVerified);
    const migrationWording = count > 1 ? 'seront copiées' : 'sera copiée';
    section.querySelector('[data-local-migration-text]').textContent = verified
      ? `${count} fiche${count > 1 ? 's' : ''} locale${count > 1 ? 's' : ''} ${migrationWording} vers votre compte. Elles restent aussi sur cet appareil.`
      : 'Vérifiez d’abord votre adresse email pour sauvegarder vos fiches dans le cloud.';
    button.disabled = !verified;
  };

  const accountName = () => profile?.displayName || authClient.user?.displayName || authClient.user?.email?.split('@')[0] || '';
  const show = (requested) => {
    const name = authClient.user ? 'profile' : (['signup','reset'].includes(requested) ? requested : 'login');
    panel.querySelectorAll('[data-auth-view]').forEach((view) => { view.hidden = view.dataset.authView !== name; });
    panel.querySelector('[data-account-title]').textContent = name === 'profile' ? 'Mon profil' : name === 'signup' ? 'Créer un compte' : name === 'reset' ? 'Mot de passe oublié' : 'Connexion';
  };
  const updateQuickLabels = () => {
    const english = window.cardiagI18n?.language === 'en';
    const user = authClient.user;
    const name = accountName();
    actions.dataset.authenticated = String(Boolean(user));
    panel.dataset.authenticated = String(Boolean(user));
    signupTrigger.hidden = Boolean(user);
    trigger.textContent = user ? `${english ? 'Account' : 'Compte'}${name ? ` · ${name}` : ''}` : (english ? 'Already registered' : 'Déjà inscrit');
    trigger.title = user ? (english ? 'Open profile settings' : 'Ouvrir les réglages du profil') : trigger.textContent;
    signupTrigger.textContent = english ? 'Create account' : 'Créer un compte';
  };
  const renderAccount = (user) => {
    if (!user) return;
    const form = panel.querySelector('[data-profile-form]');
    const name = accountName() || 'Compte CarDiag';
    form.accountEmail.value = user.email || '';
    form.displayName.value = profile?.displayName || user.displayName || '';
    form.phone.value = profile?.phone || '';
    form.role.value = profile?.role || signupRole || 'buyer';
    form.garageName.value = profile?.garageName || '';
    panel.querySelector('[data-account-summary-name]').textContent = name;
    panel.querySelector('[data-account-summary-email]').textContent = user.email || '';
    const verified = panel.querySelector('[data-account-verification]');
    verified.textContent = user.emailVerified ? 'Email vérifié' : 'Email à vérifier';
    verified.dataset.verified = String(Boolean(user.emailVerified));
    panel.querySelector('[data-verification-tools]').hidden = Boolean(user.emailVerified);
    const avatar = panel.querySelector('[data-account-avatar]');
    const source = profile?.avatar || user.photoUrl || '';
    avatar.textContent = source ? '' : name.charAt(0).toUpperCase();
    avatar.style.backgroundImage = source ? `url("${String(source).replaceAll('"','%22')}")` : '';
    updateQuickLabels();
    refreshMigration(user);
  };
  const open = (requestedView = '') => {
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    message(panel, '');
    show(requestedView);
  };
  const loadProfile = async (user, seed = {}) => {
    if (!user?.uid) return;
    const request = ++profileRequest;
    try {
      let remote = (await authClient.api('/api/account/profile')).profile;
      if (!remote) remote = (await authClient.api('/api/account/profile', { method:'PUT', body:JSON.stringify(profilePayload({ displayName:user.displayName || '', role:signupRole, ...seed })) })).profile;
      if (request !== profileRequest || authClient.user?.uid !== user.uid) return;
      profile = remote;
      profileUid = user.uid;
      renderAccount(user);
      window.dispatchEvent(new CustomEvent('cardiag:account-profile-change', { detail:{ ...profile } }));
    } catch (error) {
      if (request !== profileRequest || authClient.user?.uid !== user.uid) return;
      profile = profile || profilePayload({ displayName:user.displayName || '', role:signupRole, ...seed });
      profileUid = user.uid;
      renderAccount(user);
      message(panel, `Compte connecté. ${error.message}`, 'error');
    }
  };

  trigger.addEventListener('click', () => open('login'));
  signupTrigger.addEventListener('click', () => open('signup'));
  window.addEventListener('cardiag:open-auth', (event) => open(event.detail?.view));
  window.addEventListener('cardiag:language-change', updateQuickLabels);
  window.addEventListener('cardiag:data-change', () => refreshMigration());
  window.addEventListener('cardiag:sync-status', () => refreshMigration());
  panel.querySelector('[data-account-close]').onclick = () => { panel.classList.remove('is-open'); setTimeout(() => { panel.hidden = true; }, 220); };
  panel.querySelectorAll('[data-auth-show]').forEach((button) => { button.onclick = () => {
    if (authClient.user) { show('profile'); return; }
    const target = button.dataset.authShow;
    message(panel, '');
    if (target === 'reset') {
      const loginEmail = panel.querySelector('[data-auth-form="login"] [name="email"]').value;
      const resetEmail = panel.querySelector('[data-auth-form="reset"] [name="email"]');
      if (!resetEmail.value) resetEmail.value = loginEmail;
      show(target);
      requestAnimationFrame(() => resetEmail.focus());
      return;
    }
    show(target);
  }; });

  panel.querySelector('[data-auth-form="login"]').onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    if (!form.reportValidity() || submit.disabled) return;
    setBusy(submit, true);
    message(panel, 'Connexion…');
    try {
      const user = await authClient.signIn(form.email.value, form.password.value);
      form.password.value = '';
      show('profile');
      renderAccount(user);
      message(panel, 'Connexion réussie.', 'success');
    } catch (error) { message(panel, error.message, 'error'); }
    finally { setBusy(submit, false); }
  };

  panel.querySelector('[data-auth-form="signup"]').onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    if (!form.reportValidity() || submit.disabled) return;
    if (form.password.value !== form.passwordConfirmation.value) {
      form.passwordConfirmation.setCustomValidity('Les mots de passe ne correspondent pas.');
      form.passwordConfirmation.reportValidity();
      form.passwordConfirmation.setCustomValidity('');
      return;
    }
    signupRole = form.role.value;
    setBusy(submit, true);
    message(panel, 'Création du compte…');
    try {
      const user = await authClient.signUp(form.email.value, form.password.value);
      profile = profilePayload({ role:signupRole });
      profileUid = user.uid;
      form.password.value = '';
      form.passwordConfirmation.value = '';
      show('profile');
      renderAccount(user);
      message(panel, 'Compte créé. Vérifiez votre adresse email.', 'success');
    } catch (error) { message(panel, error.message, 'error'); }
    finally { setBusy(submit, false); }
  };

  panel.querySelector('[data-auth-form="reset"]').onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    if (!form.reportValidity() || submit.disabled) return;
    setBusy(submit, true);
    message(panel, 'Envoi du lien…');
    try {
      await authClient.resetPassword(form.email.value);
      message(panel, 'Si un compte correspond à cette adresse, le lien a été envoyé. Vérifiez aussi vos courriers indésirables.', 'success');
    } catch (error) { message(panel, error.message, 'error'); }
    finally { setBusy(submit, false); }
  };

  const signInWithGoogle = async (button) => {
    if (button.disabled) return;
    setBusy(button, true);
    message(panel, 'Connexion Google…');
    try {
      const user = await authClient.signInGoogle();
      show('profile');
      renderAccount(user);
      message(panel, 'Connexion Google réussie.', 'success');
    } catch (error) { message(panel, error.message, 'error'); }
    finally { setBusy(button, false); }
  };
  panel.querySelectorAll('[data-google-login], [data-google-signup]').forEach((button) => {
    button.onclick = () => signInWithGoogle(button);
  });

  panel.querySelector('[data-migrate-local]').onclick = async (event) => {
    const button = event.currentTarget;
    if (button.disabled) return;
    setBusy(button, true);
    message(panel, 'Sauvegarde des fiches locales en cours…');
    try {
      const result = await window.cardiagSync?.migrateLocalRecords?.();
      if (!result) throw new Error('La synchronisation est indisponible.');
      message(panel, result.state === 'synced'
        ? 'Vos fiches locales sont sauvegardées dans votre compte. Elles restent disponibles sur cet appareil.'
        : 'Vos fiches restent locales et seront synchronisées automatiquement dès le retour du réseau.', result.state === 'synced' ? 'success' : '');
    } catch (error) { message(panel, error.message, 'error'); }
    finally { setBusy(button, false); refreshMigration(); }
  };

  panel.querySelector('[data-resend-verification]').onclick = async (event) => {
    const button = event.currentTarget;
    setBusy(button, true);
    try { await authClient.sendVerification(); message(panel, 'Email de vérification renvoyé.', 'success'); }
    catch (error) { message(panel, error.message, 'error'); }
    finally { setBusy(button, false); }
  };
  panel.querySelector('[data-check-verification]').onclick = async (event) => {
    const button = event.currentTarget;
    setBusy(button, true);
    try {
      const user = await authClient.reloadUser();
      renderAccount(user);
      message(panel, user?.emailVerified ? 'Adresse email vérifiée.' : 'La vérification n’est pas encore confirmée. Ouvrez le lien reçu puis réessayez.', user?.emailVerified ? 'success' : '');
    } catch (error) { message(panel, error.message, 'error'); }
    finally { setBusy(button, false); }
  };

  panel.querySelector('[data-profile-form]').onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    setBusy(submit, true);
    try {
      const file = form.avatarFile.files[0];
      const avatar = file ? await avatarData(file) : profile?.avatar || '';
      const body = profilePayload({ displayName:form.displayName.value.trim(), phone:form.phone.value.trim(), garageName:form.garageName.value.trim(), role:form.role.value, avatar });
      profile = (await authClient.api('/api/account/profile', { method:'PUT', body:JSON.stringify(body) })).profile;
      profileUid = authClient.user?.uid || '';
      renderAccount(authClient.user);
      document.querySelector(`[name=usage_scenario][value="${profile.role}"]`)?.click();
      window.dispatchEvent(new CustomEvent('cardiag:account-profile-change', { detail:{ ...profile } }));
      message(panel, 'Profil enregistré.', 'success');
    } catch (error) { message(panel, error.message, 'error'); }
    finally { setBusy(submit, false); }
  };

  panel.querySelector('[data-sign-out]').onclick = async (event) => {
    const button = event.currentTarget;
    setBusy(button, true);
    try {
      await authClient.signOut();
      profile = null;
      profileUid = '';
      show('login');
      message(panel, 'Vous êtes déconnecté.', 'success');
    } catch (error) { message(panel, error.message, 'error'); }
    finally { setBusy(button, false); }
  };
  panel.querySelector('[data-export-account]').onclick = async () => {
    try {
      const data = await authClient.api('/api/account/export');
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], { type:'application/json' }));
      anchor.download = 'cardiag-export-rgpd.json';
      anchor.click();
      URL.revokeObjectURL(anchor.href);
    } catch (error) { message(panel, error.message, 'error'); }
  };
  panel.querySelector('[data-delete-account]').onclick = async () => {
    if (!confirm('Supprimer définitivement le compte et toutes ses données ?')) return;
    try {
      await authClient.api('/api/account', { method:'DELETE', body:JSON.stringify({ confirmation:'SUPPRIMER' }) });
      await authClient.signOut();
      profile = null;
      profileUid = '';
      show('login');
      message(panel, 'Compte supprimé.', 'success');
    } catch (error) { message(panel, error.message, 'error'); }
  };

  authClient.onChange((user) => {
    updateQuickLabels();
    if (!user) {
      profileRequest += 1;
      profile = null;
      profileUid = '';
      if (!panel.hidden) show('login');
      return;
    }
    if (!panel.hidden) show('profile');
    renderAccount(user);
    if (profileUid !== user.uid) loadProfile(user);
  });

  try { await authClient.initialize(); }
  catch (error) { message(panel, error.message || 'Authentification temporairement indisponible.', 'error'); }
  updateQuickLabels();
  window.cardiagAuth = authClient;
  window.cardiagAuthUi = { open, refresh:() => authClient.user && loadProfile(authClient.user) };
}
