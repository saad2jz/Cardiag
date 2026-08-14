const RENDER_API = 'https://fiche-expert-auto.onrender.com/';
const isNative = window.Capacitor?.isNativePlatform?.() === true;
const API_BASE = !isNative && ['localhost','127.0.0.1'].includes(location.hostname) ? `${location.origin}/` : RENDER_API;
let config;
let webSession = null;
let currentUser = null;
const listeners = new Set();

async function loadConfig() {
  if (!config) config = await fetch('firebase-config.json', { cache: 'no-store' }).then((response) => response.json());
  return config;
}

function nativeAuth() { return window.Capacitor?.Plugins?.FirebaseAuthentication; }
function notify(user) { currentUser = user || null; listeners.forEach((listener) => listener(currentUser)); }

async function identityRequest(path, body) {
  const { apiKey } = await loadConfig();
  if (!apiKey) throw new Error('Firebase n’est pas encore configuré pour cette application.');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${path}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload.error?.message || 'AUTH_ERROR').replaceAll('_',' ').toLowerCase());
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
    }
    return currentUser;
  },
  onChange(listener) { listeners.add(listener); listener(currentUser); return () => listeners.delete(listener); },
  get user() { return currentUser; },
  get configured() { return Boolean(config?.apiKey && config?.projectId); },
  async signUp(email,password) {
    const native = nativeAuth();
    const result = native ? await native.createUserWithEmailAndPassword({email,password}) : await webLogin('accounts:signUp',email,password);
    if (native) notify(result.user);
    await this.sendVerification();
    return currentUser;
  },
  async signIn(email,password) {
    const native = nativeAuth();
    const result = native ? await native.signInWithEmailAndPassword({email,password}) : await webLogin('accounts:signInWithPassword',email,password);
    if (native) notify(result.user);
    return currentUser;
  },
  async signInGoogle() {
    const native = nativeAuth();
    if (!native) throw new Error('Google Sign-In natif est disponible dans l’application Android.');
    const result = await native.signInWithGoogle();
    notify(result.user);
    return currentUser;
  },
  async resetPassword(email) {
    const native = nativeAuth();
    if (native) return native.sendPasswordResetEmail({email});
    return identityRequest('accounts:sendOobCode',{requestType:'PASSWORD_RESET',email});
  },
  async sendVerification() {
    const native = nativeAuth();
    if (native) return native.sendEmailVerification();
    const idToken = await refreshWebToken();
    return identityRequest('accounts:sendOobCode',{requestType:'VERIFY_EMAIL',idToken});
  },
  async getIdToken(forceRefresh=false) {
    const native = nativeAuth();
    if (native) return (await native.getIdToken({forceRefresh})).token;
    return refreshWebToken();
  },
  async api(path, options={}) {
    const token = await this.getIdToken();
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
    await nativeAuth()?.signOut?.();
    webSession = null;
    notify(null);
  },
};
