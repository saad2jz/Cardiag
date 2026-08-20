const RENDER_API = 'https://fiche-expert-auto.onrender.com/';
const FIREBASE_APP_SDK = 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
const FIREBASE_AUTH_SDK = 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
const browserWindow = typeof window === 'undefined' ? {} : window;
const browserLocation = typeof location === 'undefined' ? { hostname: '', origin: '' } : location;
const isNative = browserWindow.Capacitor?.isNativePlatform?.() === true;
const API_BASE = !isNative && ['localhost','127.0.0.1'].includes(browserLocation.hostname) ? `${browserLocation.origin}/` : RENDER_API;
let config;
let webSession = null;
let webFirebasePromise = null;
let currentUser = null;
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
    UNAUTHORIZED_DOMAIN: 'Ce domaine doit être autorisé dans Firebase Authentication.',
  };
  return messages[code] || 'L’opération du compte a échoué. Réessayez dans quelques instants.';
}

async function loadConfig() {
  if (!config) config = await fetch('firebase-config.json', { cache: 'no-store' }).then((response) => response.json());
  return config;
}

function nativeAuth() { return browserWindow.Capacitor?.Plugins?.FirebaseAuthentication; }
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
        auth = authSdk.initializeAuth(app, { persistence: [authSdk.indexedDBLocalPersistence] });
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
    }
    return currentUser;
  },
  onChange(listener) { listeners.add(listener); listener(currentUser); return () => listeners.delete(listener); },
  get user() { return currentUser; },
  get configured() { return Boolean(config?.apiKey && config?.projectId); },
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
        const result = await sdk.signInWithPopup(sdk.auth, new sdk.GoogleAuthProvider());
        notify(result.user);
      }
      return currentUser;
    } catch (error) {
      throw Object.assign(new Error(friendlyAuthError(error)), { code: error?.code || 'AUTH_ERROR', cause: error });
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
