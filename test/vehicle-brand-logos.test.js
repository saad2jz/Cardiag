import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  OFFICIAL_LOGOS,
  getVehicleBrandLogoPath,
  normalizeVehicleBrand,
} from '../js/branding/vehicle-brand-logos.js';

const picker = await readFile(new URL('../js/wizard/brand-picker.js', import.meta.url), 'utf8');
const report = await readFile(new URL('../js/reports/premium-report.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');

test('the identification picker and PDF share one local vehicle logo manifest', async () => {
  assert.equal(getVehicleBrandLogoPath('Citroën'), 'assets/vehicle-brands/citroen.svg');
  assert.equal(getVehicleBrandLogoPath('Mercedes-Benz'), 'assets/vehicle-brands/mercedes_benz.svg');
  assert.equal(normalizeVehicleBrand('VW'), 'volkswagen');
  assert.match(picker, /getVehicleBrandLogoPath\(name\)/);
  assert.match(picker, /<strong>\$\{brand/);
  assert.match(report, /await getVehicleBrandLogoDataUrl\(model\.data\.marque\)/);
  assert.match(report, /addImageContained\(pdf,vehicleBrandLogo/);
  assert.match(picker, /class="official-brand-logo"/);
  assert.doesNotMatch(picker, /brand-logo-fallback/);
  assert.match(styles, /img\.official-brand-logo\{[^}]*object-fit:contain!important;[^}]*filter:none!important;/);
  assert.match(picker, /const VISUAL_STEPS = \[/);
  for (const selectId of ['modeleSelect', 'generationSelect', 'anneeSelect', 'motorisationSelect']) {
    assert.match(picker, new RegExp(selectId));
  }
  assert.match(picker, /brand-grid vehicle-choice-grid/);
  assert.match(picker, /brand-card vehicle-choice-card/);
  assert.match(picker, /motorisationSelect[^\n]+dependsOn: 'anneeSelect'/);
  assert.match(picker, /target\.dispatchEvent\(new Event\('change'/);

  for (const path of OFFICIAL_LOGOS.values()) {
    await access(new URL(`../${path}`, import.meta.url));
  }
});

test('runtime logo modules do not depend on an external logo service', () => {
  assert.doesNotMatch(picker, /upload\.wikimedia\.org|commons\.wikimedia\.org/);
  assert.doesNotMatch(report, /upload\.wikimedia\.org|commons\.wikimedia\.org/);
});
