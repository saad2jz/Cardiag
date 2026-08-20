import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const worker = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const enhancements = await readFile(new URL('../js/ux/inspection-enhancements.js', import.meta.url), 'utf8');
const legacy = await readFile(new URL('../js/legacy-features.js', import.meta.url), 'utf8');

test('the public landing and wizard expose the same five workflows', () => {
  const landingRoles = [...index.matchAll(/data-landing-role="([^"]+)"/g)].map((match) => match[1]);
  const wizardRoles = [...index.matchAll(/name="usage_scenario" value="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(landingRoles.sort(), ['buyer', 'mechanic', 'owner', 'rental', 'seller']);
  assert.deepEqual(wizardRoles.sort(), ['buyer', 'mechanic', 'owner', 'rental', 'seller']);
});

test('the app shell keeps SEO, accessibility and cache safeguards', () => {
  assert.doesNotMatch(index, /<meta name="chat-api"/);
  assert.match(index, /hreflang="fr"/);
  assert.match(index, /"@type":"Organization"/);
  assert.match(index, /id="installAppBtn"[^>]*hidden/);
  assert.match(index, /sigCanvasAcheteur[^>]*aria-label=/);
  assert.match(worker, /cardiag-v51/);
});

test('vehicle identification exposes loading, offline fallback and fuzzy result feedback', () => {
  assert.match(index, /id="vehicleDatabaseStatus"/);
  assert.match(legacy, /function fuzzyVehicleMatch/);
  assert.match(legacy, /vsearch-result-count/);
  assert.match(legacy, /vehicleEditDistance/);
});

test('inspection progress counts every status group including maintenance history', () => {
  assert.match(enhancements, /querySelectorAll\('\.badge-group'\)/);
  assert.doesNotMatch(enhancements, /total:\s*items\.length/);
});
