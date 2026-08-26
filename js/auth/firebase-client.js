const RENDER_API = 'https://fiche-expert-auto.onrender.com/';
const CANONICAL_WEB_ORIGIN = 'https://cardiag.online';
const FIREBASE_APP_SDK = 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
const FIREBASE_AUTH_SDK = 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
const browserWindow = typeof window === 'undefined' ? {} : window;
const browserLocation = typeof location === 'undefined' ? { hostname: '', origin: '' } : location;
const isNative = browserWindow.Capacitor?.isNativePlatform?.() === true;
const API_BASE = !isNative && ['localhost','127.0.0.1'].includes(browserLocation.hostname) ? `${browserLocation.origin}/` : RENDER_API;
const MAGIC_LINK_EMAIL_KEY = 'cardiag_magic_link_email_v1';
const AUTH_COMPLETION_KEY = 'cardiag_auth_completion_v1';
const AUTH_RETURN_KEY = 'cardiag_auth_return_v1';
const GOOGLE_REDIRECT_INTENT_KEY = 'cardiag_google_redirect_intent_v1';
const GOOGLE_REDIRECT_FALLBACK_CODES = new Set([
  'POPUP_BLOCKED',
  'WEB_STORAGE_UNSUPPORTED',
  'OPERATION_NOT_SUPPORTED_IN_THIS_ENVIRONMENT',
  'INTERNAL_ERROR',
]);
let config;
let webSession = null;
let webFirebasePromise = null;
let currentUser = null;
let pendingMagicLink = false;
const listeners = new Set();

export function normalizeAuthEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validateEmail(email) {
  if (!email) throw Object.assign(new Error(friendlyAuthError({ code: 'MISSING_EMAIL' })), { code: 'MISSING_EMAIL' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error(friendlyAuthError({ code: 'INVALID_EMAIL' })), { code: 'INVALID_EMAIL' });
  }
}

function validatePassword(password, { creating = false } = {}) {
  if (!String(password || '')) throw Object.assign(new Error(friendlyAuthError({ code: 'MISSING_PASSWORD' })), { code: 'MISSING_PASSWORD' });
  if (creating && String(password).length < 8) {
    throw Object.assign(new Error(friendlyAuthError({ code: 'WEAK_PASSWORD' })), { code: 'WEAK_PASSWORD' });
  }
}

export function friendlyAuthError(error) {
  const rawCode = String(error?.code || error?.message || 'AUTH_ERROR');
  const code = rawCode.replace(/^auth\//i, '').replaceAll('-', '_').toUpperCase();
  const messages = {
    EMAIL_EXISTS: 'Un compte existe déjà avec cette adresse. Utilisez « Déjà inscrit » ou réinitialisez le mot de passe.',
    EMAIL_ALREADY_IN_USE: 'Un compte existe déjà avec cette adresse. Utilisez « Déjà inscrit » ou réinitialisez le mot de passe.',
    INVALID_EMAIL: 'Adresse email invalide.',
    MISSING_EMAIL: 'Saisissez votre adresse email.',
    INVALID_PASSWORD: 'Mot de passe incorrect.',
    INVALID_LOGIN_CREDENTIALS: 'Email ou mot de passe incorrect.',
    INVALID_CREDENTIAL: 'Email ou mot de passe incorrect.',
    USER_NOT_FOUND: 'Email ou mot de passe incorrect.',
    USER_DISABLED: 'Ce compte a été désactivé.',
    WEAK_PASSWORD: 'Le mot de passe doit contenir au moins 8 caractères.',
    MISSING_PASSWORD: 'Saisissez votre mot de passe.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'Trop de tentatives. Réessayez dans quelques minutes.',
    TOO_MANY_REQUESTS: 'Trop de tentatives. Réessayez dans quelques minutes.',
    NETWORK_REQUEST_FAILED: 'Connexion impossible. Vérifiez votre accès internet puis réessayez.',
    OPERATION_NOT_ALLOWED: 'La réinitialisation du mot de passe n’est pas encore activée.',
    CONFIGURATION_NOT_FOUND: 'Firebase Auth n’est pas correctement configuré.',
    POPUP_CLOSED_BY_USER: 'La fenêtre Google a été fermée avant la connexion.',
    POPUP_BLOCKED: 'Le navigateur a bloqué la fenêtre Google. Autorisez les pop-ups puis réessayez.',
    WEB_STORAGE_UNSUPPORTED: 'Votre navigateur bloque le stockage nécessaire à Google. Autorisez les cookies pour ce site puis réessayez.',
    OPERATION_NOT_SUPPORTED_IN_THIS_ENVIRONMENT: 'La fenêtre Google n’est pas prise en charge dans cet environnement. La connexion va utiliser une redirection sécurisée.',
    UNAUTHORIZED_DOMAIN: 'Ce domaine doit être autorisé dans Firebase Authentication.',
    AUTH_DOMAIN_CONFIG_REQUIRED: 'Le domaine Firebase Authentication doit être configuré pour la connexion Google.',
    INVALID_OAUTH_CLIENT_ID: 'Le client OAuth Google configuré pour CarDiag est invalide.',
    ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL: 'Un compte existe déjà avec cette adresse. Connectez-vous d’abord par lien email, puis associez Google depuis votre profil pour conserver vos fiches.',
    CREDENTIAL_ALREADY_IN_USE: 'Ce compte Google est déjà associé à un autre compte CarDiag.',
    INVALID_API_KEY: 'La configuration Firebase de cette application est invalide.',
    API_KEY_NOT_VALID: 'La configuration Firebase de cette application est invalide.',
    APP_NOT_AUTHORIZED: 'Cette application n’est pas autorisée à utiliser Firebase Authentication.',
    INTERNAL_ERROR: 'Firebase a refusé la connexion Google. Vérifiez que Google est activé et que ce domaine est autorisé.',
    INVALID_ACTION_CODE: 'Ce lien de connexion est invalide ou a expiré. Demandez un nouveau lien.',
    EXPIRED_ACTION_CODE: 'Ce lien de connexion a expiré. Demandez un nouveau lien.',
    INVALID_OOB_CODE: 'Ce lien de connexion est invalide ou a expiré. Demandez un nouveau lien.',
    MISSING_MAGIC_LINK_EMAIL: 'Saisissez l’adresse email sur laquelle vous avez reçu le lien.',
    MAGIC_LINK_UNSUPPORTED: 'La connexion par lien email est disponible sur le site web. Utilisez Google dans l’application mobile pour le moment.',
  };
  return messages[code] || 'L’opération du compte a échoué. Réessayez dans quelques instants.';
}

function googleAuthError(error) {
  const code = String(error?.code || '').replace(/^auth\//i, '').replaceAll('-', '_').toUpperCase();
  const known = friendlyAuthError(error);
  if (code === 'UNAUTHORIZED_DOMAIN') {
    return 'Le domaine actuel n’est pas autorisé par Firebase. Ouvrez cardiag.online et ajoutez ce domaine dans Firebase Authentication.';
  }
  if (code === 'OPERATION_NOT_ALLOWED') {
    return 'Le fournisseur Google n’est pas activé dans Firebase Authentication.';
  }
  if (code === 'AUTH_DOMAIN_CONFIG_REQUIRED' || code === 'INVALID_OAUTH_CLIENT_ID') {
    return `La configuration OAuth Google est incomplète (${error?.code || code}). Vérifiez le client Web et l’URL /__/auth/handler.`;
  }
  // The Firebase error code is safe to disclose and makes an otherwise generic
  // OAuth failure actionable without exposing any credential.
  return `${known} [Firebase: ${error?.code || 'auth/unknown'}]`;
}

async function loadConfig() {
  // This must be origin-relative: relative URLs break when the app was
  // refreshed directly on /app/... and the browser resolves them below it.
  if (!config) config = await fetch('/firebase-config.json', { cache: 'no-store' }).then((response) => response.json());
  return config;
}

function nativeAuth() { return browserWindow.Capacitor?.Plugins?.FirebaseAuthentication; }

function useGoogleRedirect() {
  // Firebase's popup flow is the reliable default on desktop. Redirect remains
  // preferable in installed/mobile contexts and is the fallback when a popup
  // is blocked by the browser.
  try {
    return browserWindow.matchMedia?.('(max-width: 767px), (display-mode: standalone)')?.matches === true;
  } catch { return false; }
}
function storedMagicLinkEmail() {
  try { return browserWindow.localStorage?.getItem(MAGIC_LINK_EMAIL_KEY) || ''; } catch { return ''; }
}
function rememberMagicLinkEmail(email) {
  try { browserWindow.localStorage?.setItem(MAGIC_LINK_EMAIL_KEY, email); } catch { /* The user can confirm their email manually. */ }
}
function forgetMagicLinkEmail() {
  try { browserWindow.localStorage?.removeItem(MAGIC_LINK_EMAIL_KEY); } catch { /* Nothing to clean up. */ }
}
function rememberAuthenticationCompletion(provider) {
  try { browserWindow.sessionStorage?.setItem(AUTH_COMPLETION_KEY, String(provider || 'email')); } catch { /* Non-essential navigation hint. */ }
}
function rememberGoogleRedirectIntent() {
  try { browserWindow.sessionStorage?.setItem(GOOGLE_REDIRECT_INTENT_KEY, String(Date.now())); } catch { /* Firebase still returns the OAuth result when storage is unavailable. */ }
}
function consumeGoogleRedirectIntent() {
  try {
    const startedAt = Number(browserWindow.sessionStorage?.getItem(GOOGLE_REDIRECT_INTENT_KEY) || 0);
    browserWindow.sessionStorage?.removeItem(GOOGLE_REDIRECT_INTENT_KEY);
    return startedAt > 0 && Date.now() - startedAt < 30 * 60 * 1000;
  } catch { return false; }
}
function validReturnPath(value) {
  const path = String(value || '').trim();
  return /^\/app(?:\/|$)/.test(path) ? path : '';
}
function readAuthReturnPath() {
  try {
    const fromUrl = validReturnPath(new URL(browserLocation.href).searchParams.get('returnTo'));
    if (fromUrl) return fromUrl;
    const pending = JSON.parse(browserWindow.sessionStorage?.getItem(AUTH_RETURN_KEY) || 'null');
    const fromSession = validReturnPath(pending?.path);
    if (fromSession) return fromSession;
  } catch { /* Use the safe default below. */ }
  return '/app/nouvelle';
}
function restoreMagicLinkReturn() {
  const path = readAuthReturnPath();
  try {
    const existing = JSON.parse(browserWindow.sessionStorage?.getItem(AUTH_RETURN_KEY) || '{}');
    browserWindow.sessionStorage?.setItem(AUTH_RETURN_KEY, JSON.stringify({
      ...existing, path, openProfile: Boolean(existing?.openProfile), requestedAt: Date.now(),
    }));
  } catch { /* Navigation is still possible from the default destination. */ }
  return path;
}
function magicLinkSettings() {
  // Preserve the requested application route across email clients while
  // retaining Firebase's action parameters at the canonical root URL.
  const url = new URL('/', CANONICAL_WEB_ORIGIN);
  url.searchParams.set('returnTo', readAuthReturnPath());
  return { url: url.toString(), handleCodeInApp: true };
}
function cleanMagicLinkUrl() {
  try {
    const url = new URL(browserLocation.href);
    ['apiKey', 'mode', 'oobCode', 'continueUrl', 'langCode', 'tenantId', 'returnTo'].forEach((key) => url.searchParams.delete(key));
    browserWindow.history?.replaceState?.({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  } catch { /* The URL is harmless after the one-time code is consumed. */ }
}
function publicUser(user) {
  if (!user) return null;
  return {
    uid: String(user.uid || ''), email: String(user.email || ''),
    emailVerified: Boolean(user.emailVerified), displayName: String(user.displayName || ''),
    photoUrl: String(user.photoUrl || user.photoURL || ''),
  };
}
function notify(user) { currentUser = publicUser(user); listeners.forEach((listener) => listener(currentUser)); }

async function loadWebFirebase() {
  if (isNative) return null;
  if (!webFirebasePromise) {
    webFirebasePromise = (async () => {
      const firebaseConfig = await loadConfig();
      const [appSdk, authSdk] = await Promise.all([import(FIREBASE_APP_SDK), import(FIREBASE_AUTH_SDK)]);
      const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(firebaseConfig);
      let auth;
      try {
        // initializeAuth does not install a popup/redirect resolver unless it
        // is explicitly provided. Google OAuth therefore fails before the
        // redirect on browsers even though the provider is enabled in Firebase.
        auth = authSdk.initializeAuth(app, {
          persistence: [authSdk.indexedDBLocalPersistence],
          popupRedirectResolver: authSdk.browserPopupRedirectResolver,
        });
      } catch {
        auth = authSdk.getAuth(app);
        await authSdk.setPersistence(auth, authSdk.indexedDBLocalPersistence);
      }
      authSdk.useDeviceLanguage(auth);
      return { auth, ...authSdk };
    })().catch((error) => { webFirebasePromise = null; throw error; });
  }
  return webFirebasePromise;
}

async function optionalWebFirebase() {
  try { return await loadWebFirebase(); }
  catch (error) { console.warn('SDK Firebase Web indisponible, repli REST temporaire.', error); return null; }
}

async function identityRequest(path, body) {
  const { apiKey } = await loadConfig();
  if (!apiKey) throw new Error('Firebase n’est pas encore configuré pour cette application.');
  let response;
  try {
    response = await fetch(`https://identitytoolkit.googleapis.com/v1/${path}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body),
    });
  } catch (cause) {
    throw Object.assign(new Error(friendlyAuthError({ code: 'NETWORK_REQUEST_FAILED' })), { code: 'NETWORK_REQUEST_FAILED', cause });
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = String(payload.error?.message || 'AUTH_ERROR').split(' : ')[0];
    throw Object.assign(new Error(friendlyAuthError({ code })), { code, status: response.status });
  }
  return payload;
}

async function webLogin(path, email, password) {
  const result = await identityRequest(path, { email, password, returnSecureToken:true });
  webSession = { idToken: result.idToken, refreshToken: result.refreshToken, expiresAt: Date.now() + Number(result.expiresIn || 3600) * 1000 };
  notify({ uid: result.localId, email: result.email, emailVerified: false, displayName: result.displayName || '' });
  return currentUser;
}

async function refreshWebToken() {
  if (!webSession?.refreshToken) return '';
  if (Date.now() < webSession.expiresAt - 60_000) return webSession.idToken;
  const { apiKey } = await loadConfig();
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`, {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({ grant_type:'refresh_token', refresh_token:webSession.refreshToken }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error('Session expirée.');
  webSession = { idToken:result.id_token, refreshToken:result.refresh_token, expiresAt:Date.now()+Number(result.expires_in||3600)*1000 };
  return webSession.idToken;
}

export const authClient = {
  async initialize() {
    await loadConfig();
    const native = nativeAuth();
    if (native) {
      const result = await native.getCurrentUser();
      notify(result?.user);
      native.addListener?.('authStateChange', ({ user }) => notify(user));
    } else {
      const sdk = await optionalWebFirebase();
      if (sdk) await new Promise((resolve) => {
        let initialized = false;
        sdk.onAuthStateChanged(sdk.auth, (user) => {
          notify(user);
          if (!initialized) { initialized = true; resolve(); }
        }, () => { if (!initialized) { initialized = true; resolve(); } });
      });
      // OAuth redirects return here after Google has authenticated the user. Calling this
      // explicitly also surfaces a useful Firebase error instead of silently losing it.
      try {
        const redirectResult = await sdk.getRedirectResult?.(sdk.auth);
        // Some mobile browsers restore the Firebase session before
        // getRedirectResult resolves. Keep an explicit intent so that a
        // successful Google return always resumes the requested application.
        const returningFromGoogle = Boolean(redirectResult?.user) || (Boolean(currentUser) && consumeGoogleRedirectIntent());
        if (returningFromGoogle) {
          if (redirectResult?.user) notify(redirectResult.user);
          rememberAuthenticationCompletion('google');
        }
      } catch (error) {
        browserWindow.dispatchEvent?.(new CustomEvent('cardiag:google-auth-error', {
          detail: { message: friendlyAuthError(error), code: error?.code || 'AUTH_ERROR' },
        }));
      }
      if (sdk?.isSignInWithEmailLink?.(sdk.auth, browserLocation.href)) {
        restoreMagicLinkReturn();
        const email = storedMagicLinkEmail();
        if (email) await this.completeMagicLink(email);
        else {
          pendingMagicLink = true;
          browserWindow.dispatchEvent?.(new CustomEvent('cardiag:magic-link-email-required'));
        }
      }
    }
    return currentUser;
  },
  onChange(listener) { listeners.add(listener); listener(currentUser); return () => listeners.delete(listener); },
  get user() { return currentUser; },
  get configured() { return Boolean(config?.apiKey && config?.projectId); },
  get pendingMagicLink() { return pendingMagicLink; },
  async sendMagicLink(email) {
    const normalizedEmail = normalizeAuthEmail(email);
    validateEmail(normalizedEmail);
    if (nativeAuth()) {
      throw Object.assign(new Error(friendlyAuthError({ code: 'MAGIC_LINK_UNSUPPORTED' })), { code: 'MAGIC_LINK_UNSUPPORTED' });
    }
    try {
      const sdk = await loadWebFirebase();
      await sdk.sendSignInLinkToEmail(sdk.auth, normalizedEmail, magicLinkSettings());
      rememberMagicLinkEmail(normalizedEmail);
    } catch (error) {
      throw Object.assign(new Error(friendlyAuthError(error)), { code: error?.code || 'AUTH_ERROR', cause: error });
    }
  },
  async completeMagicLink(email) {
    const normalizedEmail = normalizeAuthEmail(email || storedMagicLinkEmail());
    if (!normalizedEmail) {
      throw Object.assign(new Error(friendlyAuthError({ code: 'MISSING_MAGIC_LINK_EMAIL' })), { code: 'MISSING_MAGIC_LINK_EMAIL' });
    }
    validateEmail(normalizedEmail);
    try {
      const sdk = await loadWebFirebase();
      if (!sdk.isSignInWithEmailLink(sdk.auth, browserLocation.href)) return null;
      restoreMagicLinkReturn();
      const result = await sdk.signInWithEmailLink(sdk.auth, normalizedEmail, browserLocation.href);
      forgetMagicLinkEmail();
      pendingMagicLink = false;
      cleanMagicLinkUrl();
      notify(result.user);
      rememberAuthenticationCompletion('email');
      return currentUser;
    } catch (error) {
      throw Object.assign(new Error(friendlyAuthError(error)), { code: error?.code || 'AUTH_ERROR', cause: error });
    }
  },
  async signUp(email,password) {
    const normalizedEmail = normalizeAuthEmail(email);
    validateEmail(normalizedEmail);
    validatePassword(password, { creating: true });
    const native = nativeAuth();
    try {
      if (native) {
        const result = await native.createUserWithEmailAndPassword({ email: normalizedEmail, password });
        notify(result.user);
        await native.sendEmailVerification();
      } else {
        const sdk = await optionalWebFirebase();
        if (sdk) {
          const result = await sdk.createUserWithEmailAndPassword(sdk.auth, normalizedEmail, password);
          notify(result.user);
          await sdk.sendEmailVerification(result.user);
        } else {
          await webLogin('accounts:signUp', normalizedEmail, password);
          await this.sendVerification();
        }
      }
      return currentUser;
    } catch (error) {
      throw Object.assign(new Error(friendlyAuthError(error)), { code: error?.code || 'AUTH_ERROR', cause: error });
    }
  },
  async signIn(email,password) {
    const normalizedEmail = normalizeAuthEmail(email);
    validateEmail(normalizedEmail);
    validatePassword(password);
    const native = nativeAuth();
    try {
      if (native) {
        const result = await native.signInWithEmailAndPassword({ email: normalizedEmail, password });
        notify(result.user);
      } else {
        const sdk = await optionalWebFirebase();
        if (sdk) {
          const result = await sdk.signInWithEmailAndPassword(sdk.auth, normalizedEmail, password);
          notify(result.user);
        } else await webLogin('accounts:signInWithPassword', normalizedEmail, password);
      }
      return currentUser;
    } catch (error) {
      throw Object.assign(new Error(friendlyAuthError(error)), { code: error?.code || 'AUTH_ERROR', cause: error });
    }
  },
  async signInGoogle() {
    const native = nativeAuth();
    try {
      if (native) {
        const result = await native.signInWithGoogle();
        notify(result.user);
      } else {
        const sdk = await loadWebFirebase();
        const provider = new sdk.GoogleAuthProvider();
        provider.setCustomParameters?.({ prompt: 'select_account' });
        if (!useGoogleRedirect()) {
          try {
            const result = await sdk.signInWithPopup(sdk.auth, provider);
            notify(result.user);
            return currentUser;
          } catch (popupError) {
            const popupCode = String(popupError?.code || '').replace(/^auth\//i, '').replaceAll('-', '_').toUpperCase();
            // A blocked desktop popup safely falls back to the mobile-friendly
            // redirect flow instead of leaving the user without an option.
            if (!GOOGLE_REDIRECT_FALLBACK_CODES.has(popupCode) || typeof sdk.signInWithRedirect !== 'function') throw popupError;
          }
        }
        if (typeof sdk.signInWithRedirect === 'function') {
          rememberGoogleRedirectIntent();
          await sdk.signInWithRedirect(sdk.auth, provider);
          return null;
        }
        // This branch is only reached on an obsolete SDK without redirects.
        {
          const result = await sdk.signInWithPopup(sdk.auth, provider);
          notify(result.user);
          return currentUser;
        }
      }
      return currentUser;
    } catch (error) {
      throw Object.assign(new Error(googleAuthError(error)), { code: error?.code || 'AUTH_ERROR', cause: error });
    }
  },
  async linkGoogle() {
    if (nativeAuth()) {
      throw Object.assign(new Error('L’association de Google sera disponible dans l’application mobile après sa configuration native.'), { code: 'LINK_GOOGLE_UNSUPPORTED' });
    }
    try {
      const sdk = await loadWebFirebase();
      const user = sdk.auth.currentUser;
      if (!user) throw Object.assign(new Error('Connectez-vous d’abord par lien email avant d’associer Google.'), { code: 'AUTH_REQUIRED' });
      const provider = new sdk.GoogleAuthProvider();
      provider.setCustomParameters?.({ prompt: 'select_account' });
      if (!useGoogleRedirect()) {
        try {
          const result = await sdk.linkWithPopup(user, provider);
          notify(result.user);
          return currentUser;
        } catch (popupError) {
          const popupCode = String(popupError?.code || '').replace(/^auth\//i, '').replaceAll('-', '_').toUpperCase();
          if (!GOOGLE_REDIRECT_FALLBACK_CODES.has(popupCode) || typeof sdk.linkWithRedirect !== 'function') throw popupError;
        }
      }
      if (typeof sdk.linkWithRedirect === 'function') {
        await sdk.linkWithRedirect(user, provider);
        return null;
      }
      const result = await sdk.linkWithPopup(user, provider);
      notify(result.user);
      return currentUser;
    } catch (error) {
      throw Object.assign(new Error(googleAuthError(error)), { code: error?.code || 'AUTH_ERROR', cause: error });
    }
  },
  async resetPassword(email) {
    const normalizedEmail = normalizeAuthEmail(email);
    validateEmail(normalizedEmail);
    const native = nativeAuth();
    try {
      if (native?.sendPasswordResetEmail) return await native.sendPasswordResetEmail({ email: normalizedEmail });
      const sdk = await optionalWebFirebase();
      if (sdk) return await sdk.sendPasswordResetEmail(sdk.auth, normalizedEmail);
      return await identityRequest('accounts:sendOobCode', { requestType:'PASSWORD_RESET', email: normalizedEmail });
    } catch (error) {
      if (error?.code && error.message && !String(error.code).startsWith('auth/')) throw error;
      throw Object.assign(new Error(friendlyAuthError(error)), { code: error?.code || 'AUTH_ERROR', cause: error });
    }
  },
  async sendVerification() {
    const native = nativeAuth();
    if (native) return native.sendEmailVerification();
    const sdk = await optionalWebFirebase();
    if (sdk?.auth?.currentUser) return sdk.sendEmailVerification(sdk.auth.currentUser);
    const idToken = await refreshWebToken();
    return identityRequest('accounts:sendOobCode',{requestType:'VERIFY_EMAIL',idToken});
  },
  async getIdToken(forceRefresh=false) {
    const native = nativeAuth();
    if (native) return (await native.getIdToken({forceRefresh})).token;
    const sdk = await optionalWebFirebase();
    if (sdk?.auth?.currentUser) return sdk.getIdToken(sdk.auth.currentUser, forceRefresh);
    return refreshWebToken();
  },
  async reloadUser() {
    const native = nativeAuth();
    if (native) {
      await native.reload?.();
      const result = await native.getCurrentUser();
      notify(result?.user);
      return currentUser;
    }
    const sdk = await optionalWebFirebase();
    if (sdk?.auth?.currentUser) {
      await sdk.reload(sdk.auth.currentUser);
      notify(sdk.auth.currentUser);
      return currentUser;
    }
    if (webSession?.idToken) {
      const lookup = await identityRequest('accounts:lookup', { idToken: await refreshWebToken() });
      const user = lookup.users?.[0];
      notify(user ? { uid:user.localId, email:user.email, emailVerified:user.emailVerified, displayName:user.displayName } : null);
    }
    return currentUser;
  },
  async api(path, options={}) {
    const token = await this.getIdToken();
    if (!token) throw Object.assign(new Error('Session expirée. Reconnectez-vous.'), { code: 'AUTH_REQUIRED' });
    const response = await fetch(`${API_BASE}${path.replace(/^\//,'')}`, {
      ...options,
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...options.headers},
    });
    if (response.status === 204) return null;
    const payload = await response.json().catch(()=>({}));
    if (!response.ok) {
      const error = new Error(payload.error || 'Erreur du compte.');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  },
  async signOut() {
    const native = nativeAuth();
    if (native) await native.signOut?.();
    else {
      const sdk = await optionalWebFirebase();
      if (sdk) await sdk.signOut(sdk.auth);
    }
    webSession = null;
    notify(null);
  },
};
