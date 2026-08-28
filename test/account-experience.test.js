import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { sanitizeAccountProfile } from '../src/auth/firebase-admin.js';

const client = await readFile(new URL('../js/auth/firebase-client.js', import.meta.url), 'utf8');
const authUi = await readFile(new URL('../js/auth/auth-ui.js', import.meta.url), 'utf8');
const authStyles = await readFile(new URL('../css/auth/auth.css', import.meta.url), 'utf8');
const comparison = await readFile(new URL('../js/legacy-features.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const landing = await readFile(new URL('../js/landing/landing.js', import.meta.url), 'utf8');
const landingStyles = await readFile(new URL('../css/landing/landing.css', import.meta.url), 'utf8');
const router = await readFile(new URL('../js/navigation/route-controller.js', import.meta.url), 'utf8');
const syncQueue = await readFile(new URL('../js/native/sync-queue.js', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const deepLinks = await readFile(new URL('../js/native/app-links.js', import.meta.url), 'utf8');

test('web authentication uses official IndexedDB persistence instead of raw localStorage tokens', () => {
  assert.match(client, /indexedDBLocalPersistence/);
  assert.doesNotMatch(client, /localStorage\.setItem/);
  assert.match(client, /onAuthStateChanged/);
  assert.match(client, /fetch\('\/firebase-config\.json'/);
});

test('account profile keeps the useful personal and professional details', () => {
  const profile = sanitizeAccountProfile({ role:'rental', displayName:'  Nadia  ', phone:' 0612345678 ', garageName:' CarDiag Fleet ', siret:'123 456 789 012 34', fleetSize:'42 vehicles', consent:true }, '2026-08-20T12:00:00.000Z');
  assert.equal(profile.accountType, 'professional');
  assert.equal(profile.displayName, 'Nadia');
  assert.equal(profile.garageName, 'CarDiag Fleet');
  assert.equal(profile.siret, '12345678901234');
  assert.equal(profile.fleetSize, '42');
});

test('connected account view exposes identity details and comparison filters blank reports', () => {
  assert.match(authUi, /data-account-summary-email/);
  assert.match(authUi, /accountEmail/);
  assert.match(authUi, /profilePayload/);
  assert.match(comparison, /CHECK_NAMES\.some\(name=>data\[name\]\)/);
  assert.match(comparison, /slice\(0,3\)/);
  assert.match(comparison, /compare-summary-grid/);
});

test('passwordless email authentication keeps account creation separate from profile sync', () => {
  assert.match(authUi, /data-auth-form="email-link"/);
  assert.match(authUi, /data-existing-login/);
  assert.match(authUi, /Se connecter par e-mail/);
  assert.match(authUi, /authClient\.sendMagicLink\(form\.email\.value\)/);
  assert.doesNotMatch(authUi, /name="passwordConfirmation"/);
  assert.match(client, /validateEmail\(normalizedEmail\)/);
  assert.match(client, /sendSignInLinkToEmail/);
  assert.match(client, /signInWithEmailLink/);
  assert.match(client, /url\.searchParams\.set\('returnTo', readAuthReturnPath\(\)\)/);
  assert.match(client, /restoreMagicLinkReturn\(\)/);
  assert.match(client, /get pendingMagicLink\(\)/);
  assert.match(authUi, /authClient\.pendingMagicLink/);
  assert.match(authUi, /authClient\.completeMagicLink\(form\.email\.value\)/);
  assert.match(authUi, /const loadProfile = async/);
  assert.match(authUi, /data-migrate-local/);
  assert.match(authUi, /migrateLocalRecords/);
});

test('an authenticated session exposes only profile settings and sign out', () => {
  assert.match(authUi, /const name = authClient\.user \? 'profile'/);
  assert.doesNotMatch(authUi, /const signupTrigger/);
  assert.match(authUi, /Passwordless email creates an account on first use/);
  assert.match(authUi, /actions\.dataset\.authenticated/);
  assert.match(authUi, /data-sign-out/);
  assert.match(authStyles, /data-authenticated=true.*auth-view:not\(\[data-auth-view=profile\]\)/);
});

test('Google authentication remains available alongside passwordless email', () => {
  assert.match(authUi, /data-google-login/);
  assert.doesNotMatch(authUi, /data-google-signup/);
  assert.match(authUi, /signInWithGoogle/);
  assert.match(client, /signInWithRedirect/);
  assert.match(client, /popupRedirectResolver: authSdk\.browserPopupRedirectResolver/);
  assert.match(client, /signInWithPopup/);
  assert.match(client, /useGoogleRedirect/);
  assert.match(client, /ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL/);
  assert.match(client, /async linkGoogle\(\)/);
  assert.match(client, /linkWithPopup/);
  assert.match(authUi, /data-link-google/);
  assert.match(client, /googleAuthError/);
  assert.match(client, /Firebase: \$\{error\?\.code/);
  assert.match(authUi, /open\('profile'\);/);
});

test('public landing opens account choices without entering the inspection application', () => {
  assert.match(index, /<base href="\/">/);
  assert.match(index, /data-landing-auth-toggle/);
  assert.match(index, /data-landing-auth="google"/);
  assert.match(index, /data-landing-auth="email"/);
  assert.match(index, /data-landing-auth="existing"/);
  assert.match(landingStyles, /\.landing-active>:not\(#marketingLanding\):not\(\.profile-onboarding\):not\(\.account-sheet\)/);
  assert.match(landing, /cardiag:open-auth/);
  assert.match(landing, /cardiagOpenAuthentication/);
  assert.match(landing, /provider: button\.dataset\.landingAuth/);
  assert.match(authUi, /provider === 'google'/);
  assert.match(app, /The landing is immediately interactive/);
  assert.match(app, /The profile shell must exist before the large vehicle catalogue/);
  assert.match(app, /const landing = isApplicationShell \? null : initializeLanding\(\);[\s\S]{0,300}initializeLazyAccountFeature\(\);/);
  assert.match(app, /landing\.js\?v=20260828-1/);
  assert.match(app, /hasPendingAuthenticationReturn/);
  assert.match(router, /rememberProtectedRoute/);
  assert.match(router, /consumeProtectedRoute/);
  assert.match(router, /Persist the canonical route \*before\* opening the login panel/);
});

test('authentication resumes the requested app entry and reports a failed migration truthfully', () => {
  assert.doesNotMatch(index, /landing-nav-cta/);
  assert.match(landing, /cardiag_auth_return_v1/);
  assert.match(router, /cardiag:authentication-complete/);
  assert.match(authUi, /cardiag:authentication-complete/);
  assert.match(client, /cardiag_auth_completion_v1/);
  assert.match(client, /cardiag_google_redirect_intent_v1/);
  assert.match(client, /rememberGoogleRedirectIntent\(\)/);
  assert.match(landing, /A successful sign-in must visibly enter the app/);
  assert.match(landing, /path: '\/app\/nouvelle'/);
  assert.match(landing, /openProfile: Boolean\(options\.openProfile\)/);
  assert.match(router, /cardiagAuthUi\?\.open\?\.\('profile'\)/);
  assert.match(router, /pending\.openProfile/);
  assert.match(router, /cardiagRequireAuthentication/);
  assert.match(syncQueue, /Vos fiches restent sur cet appareil/);
});

test('every public scenario keeps its intended destination after authentication', () => {
  for (const role of ['buyer', 'seller', 'owner', 'mechanic', 'rental']) {
    assert.match(index, new RegExp(`data-landing-role="${role}"`));
  }
  assert.match(landing, /rememberAuthReturn\(role, level\)/);
  assert.match(router, /resumeAuthenticationDestination/);
  assert.match(router, /routeProfileForScenario\(pending\.role\)/);
  assert.match(landing, /persistEntryChoice\(role, selectedLevel\)/);
  assert.match(landing, /suggestedRole: role \|\| 'buyer'/);
});

test('all inspection, diagnosis and report entry actions use the account gate', () => {
  assert.match(app, /initializeAuthenticatedActionGate/);
  assert.match(app, /window\.cardiagOpenAuthentication = openAuthentication/);
  assert.match(app, /data-chat-toggle/);
  assert.match(app, /data-assistant-new-vehicle/);
  assert.match(app, /#newFicheBtn/);
  assert.match(deepLinks, /await window\.cardiagRequireAuthentication/);
  assert.doesNotMatch(app, /trigger\.dataset\.accountOpen/);
});

test('profile onboarding exposes direct Google account connection', async () => {
  const onboarding = await readFile(new URL('../js/onboarding/profile-onboarding.js', import.meta.url), 'utf8');
  assert.match(onboarding, /data-profile-google-auth/);
  assert.match(onboarding, /authClient\.signInGoogle\(\)/);
  assert.match(onboarding, /cardiag:authentication-complete/);
});

test('email verification can be refreshed without reconnecting', () => {
  assert.match(authUi, /data-check-verification/);
  assert.match(authUi, /authClient\.reloadUser\(\)/);
  assert.match(client, /async reloadUser\(\)/);
});
