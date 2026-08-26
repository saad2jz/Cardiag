import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { friendlyAuthError, normalizeAuthEmail } from '../js/auth/firebase-client.js';

const authUi = await readFile(new URL('../js/auth/auth-ui.js', import.meta.url), 'utf8');
const client = await readFile(new URL('../js/auth/firebase-client.js', import.meta.url), 'utf8');
const worker = await readFile(new URL('../sw.js', import.meta.url), 'utf8');

test('passwordless email authentication normalizes and validates account email addresses', () => {
  assert.equal(normalizeAuthEmail('  Client@Example.COM '), 'client@example.com');
  assert.equal(friendlyAuthError({ code: 'auth/invalid-email' }), 'Adresse email invalide.');
  assert.match(friendlyAuthError({ code: 'auth/invalid-action-code' }), /lien de connexion/i);
  assert.match(friendlyAuthError({ code: 'auth/network-request-failed' }), /Connexion impossible/);
});

test('email-link UI prevents duplicate requests and keeps a neutral confirmation', () => {
  assert.match(authUi, /setBusy\(submit, true\)/);
  assert.match(authUi, /Si cette adresse est valide/);
  assert.match(authUi, /courriers ind/);
  assert.match(authUi, /data-auth-form="email-link"/);
  assert.match(worker, /cardiag-v106/);
  assert.match(client, /CANONICAL_WEB_ORIGIN/);
});
