import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const wizard = await readFile(new URL('../js/wizard.js', import.meta.url), 'utf8');
const legacy = await readFile(new URL('../js/legacy-features.js', import.meta.url), 'utf8');
const inspection = await readFile(new URL('../js/ux/inspection-enhancements.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../css/ux/inspection-enhancements.css', import.meta.url), 'utf8');
const prompts = await readFile(new URL('../assets/reference/prompts-higgsfield.md', import.meta.url), 'utf8');
const testGuides = await readFile(new URL('../assets/reference/test-guides.svg', import.meta.url), 'utf8');

test('profile selection is grouped by family and exposes inspection depth before starting', () => {
  assert.match(index, /data-profile-family-choice="personal"/);
  assert.match(index, /data-profile-family-choice="professional"/);
  assert.match(index, /name="inspection_mode" value="quick"/);
  assert.match(index, /name="inspection_mode" value="complete"/);
  assert.match(index, /Le plus choisi/);
  assert.match(wizard, /renderProfileFamily/);
});

test('guided inspection keeps a reversible full-report view and seven-section stepper', () => {
  assert.match(inspection, /cardiag_guided_inspection_v1/);
  assert.equal((inspection.match(/key: '/g) || []).length, 7);
  assert.match(inspection, /data-guide-view/);
  assert.match(inspection, /documentés avec photo/);
  assert.match(inspection, /min restantes/);
  assert.match(styles, /inspection-guided-current/);
  assert.match(styles, /inspection-mini-stepper/);
  assert.match(inspection, /current\.after\(actionBar\)/);
  assert.match(styles, /is-below-question/);
});

test('mobile inspection is a strict accessible wizard with persistent progress and contextual isolation', () => {
  assert.match(inspection, /MOBILE_WIZARD_QUERY = '\(max-width: 767px\)'/);
  assert.match(inspection, /data-guide-section-current/);
  assert.match(inspection, /cardiag:inspection-section-request/);
  assert.match(inspection, /ArrowLeft/);
  assert.match(styles, /position:fixed;z-index:125/);
  assert.match(styles, /inspection-mobile-wizard/);
  assert.match(wizard, /scenarioConfirmed/);
  assert.match(wizard, /control\.disabled = !active/);
  assert.match(legacy, /cardiag:inspection-section-request/);
});

test('reference asset catalog covers all profile families and technical sections', () => {
  ['profil-acheteur.webp','profil-garagiste.webp','moteur-huile.webp','chassis-rotules.webp','carrosserie-defaut-peinture.webp','habitacle-humidite.webp','essai-freinage.webp','diagnostic-p1000.webp']
    .forEach((asset) => assert.match(prompts, new RegExp(asset)));
});

test('every inspection control has its own offline visual guide', () => {
  const controls = ['huile','ldr','fuites','bruits','fumee','ralenti','culasse','supports','rouille_plancher','longerons','pont','rotules','amortos','pneus','jantes','panneaux','mastic','peinture','feux_av','feux_ar','feux_recul','sieges','ciel','clim','vitres','humidite','accel','vitesses','braquage','freinage','stabilite','p1000','q_historique'];
  controls.forEach((control) => assert.match(testGuides, new RegExp(`id="${control}"`)));
  assert.match(inspection, /test-guides\.svg#/);
});
