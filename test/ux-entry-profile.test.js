import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const landing = await readFile(new URL('../js/landing/landing.js', import.meta.url), 'utf8');
const wizard = await readFile(new URL('../js/wizard.js', import.meta.url), 'utf8');
const ownerHelp = await readFile(new URL('../js/ux/owner-technical-help.js', import.meta.url), 'utf8');

test('a landing persona is transmitted to the wizard without a second blocking choice', () => {
  assert.match(landing, /url\.searchParams\.set\('profil'/);
  assert.match(landing, /url\.searchParams\.set\('niveau'/);
  assert.match(landing, /hasProfileEntry/);
  assert.match(wizard, /PROFILE_FROM_SLUG/);
  assert.match(wizard, /currentStep = VALID_PROFILES\.has\(entry\.profile\)[\s\S]{0,140}: 1;/);
});

test('the active profile remains visible and can be changed without clearing common fields', () => {
  assert.match(index, /id="activeProfileChipText"/);
  assert.match(index, /id="changeProfileBtn"/);
  assert.match(wizard, /profileReturnStep = 3/);
  assert.doesNotMatch(wizard, /changeProfileBtn[\s\S]{0,300}(?:reset\(|\.value\s*=\s*['"]{2})/);
});

test('plain-language technical help is restricted to confirmed owner journeys', () => {
  assert.match(ownerHelp, /dataset\.usageScenario === 'owner'/);
  assert.match(ownerHelp, /dataset\.scenarioConfirmed === 'true'/);
  for (const field of ['culasse', 'p1000', 'supports', 'rotules', 'codes_ecm', 'codes_abs']) {
    assert.match(ownerHelp, new RegExp(`\\b${field}:`));
  }
  assert.match(ownerHelp, /data-owner-technical-help/);
});

test('advanced toolbar actions are grouped and current access has no invented subscription', () => {
  assert.match(index, /class="advanced-actions-menu"/);
  assert.match(index, /Plus d.actions/);
  assert.match(index, /Aucun abonnement n.est activ/);
});
