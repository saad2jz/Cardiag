import { authClient } from './firebase-client.js?v=20260826-6';

const AUTH_COMPLETION_KEY = 'cardiag_auth_completion_v1';

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
      <p class="auth-help">Recevez un lien sécurisé par email : aucun mot de passe à créer ni à retenir.</p>
      <form data-auth-form="email-link">
        <label>Email<input type="email" name="email" autocomplete="email" inputmode="email" required></label>
        <button type="submit">Se connecter par e-mail</button>
      </form>
      <button type="button" class="google-auth-button" data-google-login><span aria-hidden="true">G</span> Continuer avec Google</button>
      <button type="button" class="auth-existing-button" data-existing-login>Déjà inscrit ? Recevoir mon lien sécurisé</button>
      <p class="auth-help">Premier accès ? Le lien crée votre compte automatiquement.</p>
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
      <div class="account-actions"><button type="button" data-link-google>Associer Google à ce compte</button><button type="button" data-export-account>Exporter mes données</button><button type="button" data-sign-out>Se déconnecter</button><button type="button" class="danger" data-delete-account>Supprimer définitivement le compte</button></div>
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
  // Passwordless email creates an account on first use. A second header CTA
  // therefore adds no action and used to look like an empty duplicate account
  // button once a session was restored.
  actions.append(trigger);
  document.getElementById('wizardHeader')?.append(actions);

  let signupRole = 'buyer';
  let profile = null;
  let profileUid = '';
  let profileRequest = 0;
  const hasPendingJourney = () => {
    try { return Boolean(sessionStorage.getItem('cardiag_auth_return_v1')); } catch { return false; }
  };
  const closeForJourney = () => {
    panel.classList.remove('is-open');
    window.setTimeout(() => { panel.hidden = true; }, 220);
  };
  const announceAuthentication = (provider = '') => {
    try { sessionStorage.removeItem(AUTH_COMPLETION_KEY); } catch { /* Nothing to clear. */ }
    window.dispatchEvent(new CustomEvent('cardiag:authentication-complete', { detail: { provider } }));
  };

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
    const name = authClient.user ? 'profile' : 'login';
    panel.querySelectorAll('[data-auth-view]').forEach((view) => { view.hidden = view.dataset.authView !== name; });
    panel.querySelector('[data-account-title]').textContent = name === 'profile' ? 'Mon profil' : 'Connexion ou créer un compte';
  };
  const updateQuickLabels = () => {
    const english = window.cardiagI18n?.language === 'en';
    const user = authClient.user;
    const name = accountName();
    actions.dataset.authenticated = String(Boolean(user));
    panel.dataset.authenticated = String(Boolean(user));
    trigger.textContent = user ? `${english ? 'Account' : 'Compte'}${name ? ` · ${name}` : ''}` : (english ? 'Already registered' : 'Déjà inscrit');
    trigger.title = user ? (english ? 'Open profile settings' : 'Ouvrir les réglages du profil') : trigger.textContent;
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
  const open = (requestedView = '', provider = '') => {
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    message(panel, '');
    show(requestedView);
    if (authClient.user) return;
    requestAnimationFrame(() => {
      if (provider === 'google') {
        panel.querySelector('[data-google-login]')?.click();
        return;
      }
      const email = panel.querySelector('[data-auth-form="email-link"] [name="email"]');
      email?.focus();
      if (provider === 'existing') message(panel, 'Saisissez votre adresse : un lien sécurisé vous reconnectera à votre compte.');
    });
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
  window.addEventListener('cardiag:open-auth', (event) => open(event.detail?.view, event.detail?.provider));
  window.addEventListener('cardiag:language-change', updateQuickLabels);
  window.addEventListener('cardiag:data-change', () => refreshMigration());
  window.addEventListener('cardiag:sync-status', () => refreshMigration());
  panel.querySelector('[data-account-close]').onclick = () => { panel.classList.remove('is-open'); setTimeout(() => { panel.hidden = true; }, 220); };
  window.addEventListener('cardiag:magic-link-email-required', () => {
    open('login');
    message(panel, 'Confirmez l’adresse email sur laquelle vous avez reçu le lien.');
    requestAnimationFrame(() => panel.querySelector('[data-auth-form="email-link"] [name="email"]')?.focus());
  });

  panel.querySelector('[data-auth-form="email-link"]').onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    if (!form.reportValidity() || submit.disabled) return;
    setBusy(submit, true);
    message(panel, 'Envoi du lien sécurisé…');
    try {
      if (authClient.pendingMagicLink) {
        const user = await authClient.completeMagicLink(form.email.value);
        if (!user) throw new Error('Ce lien de connexion est invalide ou a expiré. Demandez un nouveau lien.');
        if (hasPendingJourney()) closeForJourney();
        else {
          show('profile');
          renderAccount(user);
        }
        message(panel, 'Connexion réussie.', 'success');
        announceAuthentication('email');
        return;
      }
      await authClient.sendMagicLink(form.email.value);
      message(panel, 'Si cette adresse est valide, un lien de connexion vient d’être envoyé. Vérifiez aussi vos courriers indésirables.', 'success');
    } catch (error) { message(panel, error.message, 'error'); }
    finally { setBusy(submit, false); }
  };
  panel.querySelector('[data-existing-login]').onclick = () => {
    message(panel, 'Saisissez votre adresse e-mail puis choisissez « Se connecter par e-mail ».');
    panel.querySelector('[data-auth-form="email-link"] [name="email"]')?.focus();
  };

  const signInWithGoogle = async (button) => {
    if (button.disabled) return;
    setBusy(button, true);
    message(panel, 'Connexion Google…');
    try {
      const user = await authClient.signInGoogle();
      if (!user) {
        message(panel, 'Redirection sécurisée vers Google…', '');
        return;
      }
      if (hasPendingJourney()) closeForJourney();
      else {
        show('profile');
        renderAccount(user);
      }
      message(panel, 'Connexion Google réussie.', 'success');
      announceAuthentication('google');
    } catch (error) { message(panel, error.message, 'error'); }
    finally { setBusy(button, false); }
  };
  panel.querySelectorAll('[data-google-login]').forEach((button) => {
    button.onclick = () => signInWithGoogle(button);
  });
  window.addEventListener('cardiag:google-auth-error', (event) => {
    message(panel, event.detail?.message || 'La connexion Google a échoué.', 'error');
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
  panel.querySelector('[data-link-google]').onclick = async (event) => {
    const button = event.currentTarget;
    setBusy(button, true);
    message(panel, 'Association de Google…');
    try {
      const user = await authClient.linkGoogle();
      if (!user) {
        message(panel, 'Redirection sécurisée vers Google…', '');
        return;
      }
      renderAccount(user);
      message(panel, 'Google est associé à ce compte. Vous retrouverez les mêmes fiches avec ces deux connexions.', 'success');
    } catch (error) { message(panel, error.message, 'error'); }
    finally { setBusy(button, false); }
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
  try {
    const provider = sessionStorage.getItem(AUTH_COMPLETION_KEY);
    if (provider && authClient.user) {
      // Redirect OAuth returns reload the document. Reopen the authenticated
      // account panel so the user lands directly on their account and goal.
      if (hasPendingJourney()) closeForJourney();
      else open('profile');
      announceAuthentication(provider);
    }
  } catch { /* Browser storage is optional for authentication. */ }
}
