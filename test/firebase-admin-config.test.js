import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFirebasePrivateKey } from '../src/auth/firebase-admin.js';

const RAW_KEY = '-----BEGIN PRIVATE KEY-----\nQUJDREVGRw==\n-----END PRIVATE KEY-----';

test('Firebase Admin accepte une clé PEM multiligne', () => {
  assert.equal(normalizeFirebasePrivateKey(RAW_KEY), `${RAW_KEY}\n`);
});

test('Firebase Admin accepte les retours à la ligne échappés de Render', () => {
  assert.equal(normalizeFirebasePrivateKey(RAW_KEY.replaceAll('\n', '\\n')), `${RAW_KEY}\n`);
});

test('Firebase Admin retire les guillemets JSON externes', () => {
  assert.equal(normalizeFirebasePrivateKey(JSON.stringify(RAW_KEY)), `${RAW_KEY}\n`);
});

test('Firebase Admin rejette une valeur tronquée ou une propriété JSON complète', () => {
  assert.throws(
    () => normalizeFirebasePrivateKey('"private_key": "-----BEGIN PRIVATE KEY-----\\nabc"'),
    (error) => error.code === 'FIREBASE_PRIVATE_KEY_FORMAT',
  );
});
