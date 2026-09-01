import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vercelHandler from '../src/app.js';

const previousVercel = process.env.VERCEL;
process.env.VERCEL = '1';
const { default: app, initializeAccountService } = await import('../src/server.js');
if (previousVercel === undefined) delete process.env.VERCEL;
else process.env.VERCEL = previousVercel;

test('Vercel can import the Express application without opening a local listener', () => {
  assert.equal(typeof vercelHandler, 'function');
  assert.equal(typeof app, 'function');
  assert.equal(typeof app.listen, 'function');
});

test('the Vercel build stages frontend files in the public CDN directory', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const buildScript = await readFile(new URL('../scripts/prepare-vercel-public.mjs', import.meta.url), 'utf8');

  assert.equal(packageJson.scripts.build, 'node scripts/prepare-vercel-public.mjs');
  assert.match(buildScript, /'firebase-config\.json'/);
  assert.match(buildScript, /'assets'/);
  assert.match(buildScript, /'data'/);
  assert.match(buildScript, /outputDir !== join\(projectRoot, 'public'\)/);
});

test('an invalid Firebase private key disables account APIs without crashing Vercel', () => {
  const errors = [];
  const service = initializeAccountService({
    FIREBASE_PROJECT_ID: 'cardiag-f1ea7',
    FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk@example.invalid',
    FIREBASE_PRIVATE_KEY: 'invalid',
  }, { error: (...values) => errors.push(values) });

  assert.equal(service, null);
  assert.equal(errors.length, 1);
  assert.equal(errors[0][1]?.code, 'FIREBASE_PRIVATE_KEY_FORMAT');
});
