import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { sanitizeAccountProfile } from '../src/auth/firebase-admin.js';

const client = await readFile(new URL('../js/auth/firebase-client.js', import.meta.url), 'utf8');
const authUi = await readFile(new URL('../js/auth/auth-ui.js', import.meta.url), 'utf8');
const authStyles = await readFile(new URL('../css/auth/auth.css', import.meta.url), 'utf8');
const comparison = await readFile(new URL('../js/legacy-features.js', import.meta.url), 'utf8');

test('web authentication uses official IndexedDB persistence instead of raw localStorage tokens', () => {
  assert.match(client, /indexedDBLocalPersistence/);
  assert.doesNotMatch(client, /localStorage\.setItem/);
  assert.match(client, /onAuthStateChanged/);
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
  assert.match(authUi, /authClient\.sendMagicLink\(form\.email\.value\)/);
  assert.doesNotMatch(authUi, /name="passwordConfirmation"/);
  assert.match(client, /validateEmail\(normalizedEmail\)/);
  assert.match(client, /sendSignInLinkToEmail/);
  assert.match(client, /signInWithEmailLink/);
  assert.match(authUi, /const loadProfile = async/);
  assert.match(authUi, /data-migrate-local/);
  assert.match(authUi, /migrateLocalRecords/);
});

test('an authenticated session exposes only profile settings and sign out', () => {
  assert.match(authUi, /const name = authClient\.user \? 'profile'/);
  assert.match(authUi, /signupTrigger\.hidden = Boolean\(user\)/);
  assert.match(authUi, /actions\.dataset\.authenticated/);
  assert.match(authUi, /data-sign-out/);
  assert.match(authStyles, /data-authenticated=true.*auth-view:not\(\[data-auth-view=profile\]\)/);
});

test('Google authentication remains available alongside passwordless email', () => {
  assert.match(authUi, /data-google-login/);
  assert.doesNotMatch(authUi, /data-google-signup/);
  assert.match(authUi, /signInWithGoogle/);
  assert.match(client, /signInWithRedirect/);
  assert.match(client, /ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL/);
});

test('profile onboarding exposes direct Google account connection', async () => {
  const onboarding = await readFile(new URL('../js/onboarding/profile-onboarding.js', import.meta.url), 'utf8');
  assert.match(onboarding, /data-profile-google-auth/);
  assert.match(onboarding, /authClient\.signInGoogle\(\)/);
});

test('email verification can be refreshed without reconnecting', () => {
  assert.match(authUi, /data-check-verification/);
  assert.match(authUi, /authClient\.reloadUser\(\)/);
  assert.match(client, /async reloadUser\(\)/);
});
