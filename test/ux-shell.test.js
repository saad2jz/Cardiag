import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const worker = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const enhancements = await readFile(new URL('../js/ux/inspection-enhancements.js', import.meta.url), 'utf8');
const legacy = await readFile(new URL('../js/legacy-features.js', import.meta.url), 'utf8');
const homeButton = await readFile(new URL('../js/navigation/home-button.js', import.meta.url), 'utf8');
const brandPicker = await readFile(new URL('../js/wizard/brand-picker.js', import.meta.url), 'utf8');
const vehiclePicker = await readFile(new URL('../js/wizard/vehicle-picker.js', import.meta.url), 'utf8');
const recordsGallery = await readFile(new URL('../js/records/records-gallery.js', import.meta.url), 'utf8');
const settings = await readFile(new URL('../js/settings/settings.js', import.meta.url), 'utf8');
const themes = await readFile(new URL('../js/theming/theme-manager.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');
const pwa = await readFile(new URL('../js/pwa.js', import.meta.url), 'utf8');
const router = await readFile(new URL('../js/navigation/router.js', import.meta.url), 'utf8');
const routeController = await readFile(new URL('../js/navigation/route-controller.js', import.meta.url), 'utf8');

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
  assert.match(worker, /cardiag-v109/);
  assert.match(worker, /landing\/landing\.js\?v=20260826-2/);
  assert.match(index, /id="pwaUpdateBanner"/);
  assert.match(index, /Fiches locales par défaut/);
  assert.match(pwa, /registration\.addEventListener\('updatefound'/);
  assert.match(pwa, /pwaUpdateReload/);
});

test('the wizard toolbar exposes a non-destructive CarDiag home action', () => {
  assert.match(homeButton, /dataset\.cardiagHome/);
  assert.match(homeButton, /cardiagLanding\?\.show/);
  assert.match(homeButton, /cardiagWizard\?\.goToStep\?\.\(1, 'back'\)/);
  assert.doesNotMatch(homeButton, /localStorage\.clear|location\.reload|resetFiche/);
  assert.match(worker, /navigation\/home-button\.js/);
  assert.match(styles, /\.home-trigger\{order:-2/);
  assert.match(settings, /settings-trigger-label[^>]*>Paramètres/);
  assert.match(settings, /navigate\(\{kind:'settings'\}\)/);
  assert.match(settings, /window\.cardiagSettings=\{open,openAppearance\}/);
  assert.match(themes, /button\.hidden = true/);
  assert.match(themes, /data-open-all-settings/);
});

test('the app shell owns stable routes for each workflow and inspection state', () => {
  assert.match(router, /\/app\/nouvelle/);
  assert.match(router, /\/app\/inspection/);
  assert.match(router, /history\?\.\[replace \? 'replaceState' : 'pushState'\]/);
  assert.match(routeController, /cardiag:wizard-step/);
  assert.match(routeController, /cardiag:inspection-section-change/);
  assert.match(worker, /navigation\/route-controller\.js/);
});

test('vehicle identification exposes loading and offline fallback without duplicate quick search', () => {
  assert.match(index, /id="vehicleDatabaseStatus"/);
  assert.doesNotMatch(index, /vsearch-panel/);
  assert.doesNotMatch(index, /Recherche rapide/);
});

test('mobile vehicle identification provides an offline brand gallery and iOS safeguards', () => {
  assert.match(brandPicker, /initializeBrandPicker/);
  assert.match(brandPicker, /INITIAL_BRAND_LIMIT = 20/);
  assert.match(brandPicker, /OFFICIAL_LOGOS/);
  assert.match(brandPicker, /role="option"/);
  assert.match(brandPicker, /select\.dispatchEvent\(new Event\('change'/);
  assert.match(styles, /\.brand-grid\{display:grid/);
  assert.match(styles, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(styles, /@supports \(-webkit-touch-callout:none\)/);
  assert.match(styles, /font-size:16px!important/);
  assert.match(worker, /wizard\/brand-picker\.js/);
  assert.match(worker, /assets\/vehicle-brands\/renault\.png/);
});

test('saved reports expose working create, compare and recoverable delete actions', () => {
  assert.match(vehiclePicker, /cardiag:new-vehicle/);
  assert.match(vehiclePicker, /data-toggle-saved/);
  assert.match(recordsGallery, /data-records-compare/);
  assert.match(recordsGallery, /data-record-delete/);
  assert.match(legacy, /deleteRecord: \(id\)=>deleteRecordById\(id\)/);
  assert.match(legacy, /showUndoSnackbar/);
});

test('inspection progress counts every status group including maintenance history', () => {
  assert.match(enhancements, /querySelectorAll\('\.badge-group'\)/);
  assert.doesNotMatch(enhancements, /total:\s*items\.length/);
});
