import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const worker = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const enhancements = await readFile(new URL('../js/ux/inspection-enhancements.js', import.meta.url), 'utf8');
const legacy = await readFile(new URL('../js/legacy-features.js', import.meta.url), 'utf8');
const homeButton = await readFile(new URL('../js/navigation/home-button.js', import.meta.url), 'utf8');
const brandPicker = await readFile(new URL('../js/wizard/brand-picker.js', import.meta.url), 'utf8');
const vehiclePicker = await readFile(new URL('../js/wizard/vehicle-picker.js', import.meta.url), 'utf8');
const recordsGallery = await readFile(new URL('../js/records/records-gallery.js', import.meta.url), 'utf8');
const settings = await readFile(new URL('../js/settings/settings.js', import.meta.url), 'utf8');
const audioAnalyzer = await readFile(new URL('../js/media/engine-audio-analyzer.js', import.meta.url), 'utf8');
const themes = await readFile(new URL('../js/theming/theme-manager.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');
const landingStyles = await readFile(new URL('../css/landing/landing.css', import.meta.url), 'utf8');
const appBrandStyles = await readFile(new URL('../css/app-brand.css', import.meta.url), 'utf8');
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
  assert.match(worker, /cardiag-v145/);
  assert.match(index, /cardiag_design_preferences/);
  assert.match(index, /Apply the saved visual preference before the first paint/);
  assert.match(worker, /landing\/landing\.js\?v=20260829-1/);
  assert.match(index, /css\/landing\/landing\.css\?v=20260901-1/);
  assert.match(worker, /css\/landing\/landing\.css\?v=20260901-1/);
  assert.match(worker, /js\/app\.js\?v=20260901-4/);
  assert.match(index, /id="pwaUpdateBanner"/);
  assert.match(index, /Fiches locales par défaut/);
  assert.match(pwa, /registration\.addEventListener\('updatefound'/);
  assert.match(pwa, /updateViaCache: 'none'/);
  assert.match(pwa, /pwaUpdateReload/);
  assert.match(worker, /event\.request\.cache === 'reload'/);
  assert.match(worker, /event\.request\.cache === 'no-cache'/);
});

test('the wizard toolbar exposes a non-destructive CarDiag home action', () => {
  assert.match(homeButton, /dataset\.cardiagHome/);
  assert.match(homeButton, /navigate\(\{ kind: 'dashboard' \}\)/);
  assert.doesNotMatch(homeButton, /cardiagLanding\?\.show/);
  assert.match(homeButton, /cardiagWizard\?\.goToStep\?\.\(1, 'back'\)/);
  assert.doesNotMatch(homeButton, /localStorage\.clear|location\.reload|resetFiche/);
  assert.match(worker, /navigation\/home-button\.js/);
  assert.match(styles, /\.home-trigger\{order:-2/);
  assert.match(settings, /settings-trigger-label[^>]*>Paramètres/);
  assert.match(settings, /navigate\(\{kind:'settings'\}\)/);
  assert.match(settings, /window\.cardiagSettings=\{open,openAppearance\}/);
  assert.match(settings, /data-setting-inspection-view/);
  assert.match(themes, /button\.hidden = true/);
  assert.match(themes, /data-open-all-settings/);
});

test('the acoustic analyzer is restricted to the relevant engine checks', () => {
  assert.match(audioAnalyzer, /const AUDIO_SUPPORTED_TESTS = \{/);
  assert.match(audioAnalyzer, /bruits:/);
  assert.match(audioAnalyzer, /ralenti:/);
  assert.match(audioAnalyzer, /input\[name="\$\{testKey\}"\]/);
  assert.doesNotMatch(index, /id="engineAudioAnalyzerWrap"/);
});

test('application routes use an isolated shell and never initialise the public landing', async () => {
  assert.match(index, /document\.body\.classList\.add\('app-shell', 'app-booting'\)/);
  assert.match(landingStyles, /\.app-shell #marketingLanding\{display:none!important\}/);
  assert.match(app, /const initialRoute = parseRoute\(window\.location\.href\);/);
  assert.match(app, /const landing = isApplicationShell \? null : initializeLanding\(\);/);
  assert.match(app, /Boolean\(landing\?\.active\)/);
  assert.match(routeController, /continueInApplicationShell/);
  assert.match(routeController, /window\.location\.assign\(target\)/);
});

test('the application shell applies a coherent visual system while preserving saved themes', () => {
  assert.match(index, /css\/app-brand\.css\?v=20260901-1/);
  assert.match(appBrandStyles, /body\.app-shell\{font-family:var\(--font-body\)/);
  assert.match(appBrandStyles, /--signal:#45d6e7/);
  assert.match(appBrandStyles, /\[data-theme='workshop'\]/);
  assert.match(appBrandStyles, /\[data-theme='premium'\]/);
  assert.match(appBrandStyles, /\.wizard-progress-track span\{background:linear-gradient/);
  assert.match(appBrandStyles, /@media \(prefers-reduced-motion:reduce\)/);
});

test('application routes wait for their first destination and keep header actions in-app', () => {
  assert.match(index, /classList\.add\('app-shell', 'app-booting'\)/);
  assert.match(app, /await routeController\.ready/);
  assert.match(app, /function bootApplicationOnce\(\)/);
  assert.match(routeController, /const ready = new Promise/);
  assert.match(routeController, /return Object\.freeze\(\{ router, ready \}\)/);
  assert.match(recordsGallery, /window\.cardiagRouter\.navigate\(\{ kind: 'dashboard' \}\)/);
  assert.match(settings, /if \(window\.cardiagSettings\?\.open\) return window\.cardiagSettings/);
  assert.match(legacy, /window\.cardiagRouter\.inspection\(record\.id, key === 'info' \? 'identification' : 'controle'/);
  assert.match(appBrandStyles, /body\.app-shell \.settings-sheet\{position:fixed/);
  assert.match(app, /reports\/premium-report\.js\?v=20260901-1/);
  assert.match(worker, /reports\/premium-report\.js\?v=20260901-1/);
});

test('landing media has stable layers, deliberate crops and a visual fallback', () => {
  assert.match(index, /class="landing-process-ambient"[^>]*preload="metadata"[^>]*poster="assets\/landing\/report-preview-bg\.webp"/);
  assert.match(landingStyles, /\.landing-visual-frame\{position:relative;isolation:isolate/);
  assert.match(landingStyles, /grid-template-columns:minmax\(0,\.82fr\) minmax\(500px,1\.18fr\)/);
  assert.match(landingStyles, /grid-template-rows:clamp\(204px,16vw,238px\) auto 1fr auto/);
  assert.match(landingStyles, /\.landing-visual-frame::after\{content:'';position:absolute;z-index:1/);
  assert.match(landingStyles, /\.landing-orbit-core\{position:absolute;z-index:0/);
  assert.match(landingStyles, /\.landing-compare img\{display:block;width:100%;height:100%;object-fit:cover/);
  assert.match(landingStyles, /\.landing-path-card--illustrated:nth-child\(1\) \.landing-path-media\{object-position:center 61%/);
});

test('the app shell owns stable routes for each workflow and inspection state', () => {
  assert.match(router, /\/app\/nouvelle/);
  assert.match(router, /\/app\/inspection/);
  assert.match(router, /history\?\.\[replace \? 'replaceState' : 'pushState'\]/);
  assert.match(routeController, /cardiag:wizard-step/);
  assert.match(routeController, /cardiag:inspection-section-change/);
  assert.match(router, /\/app\/assistant/);
  assert.match(routeController, /cardiagOpenAssistantWorkspace/);
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
  assert.match(recordsGallery, /trigger\.dataset\.appRoute = 'dashboard'/);
  assert.match(recordsGallery, /const dashboardPath = '\/app';/);
  assert.match(recordsGallery, /window\.location\.assign\(dashboardPath\)/);
  assert.match(recordsGallery, /window\.cardiagRequireAuthentication/);
  assert.match(legacy, /deleteRecord: \(id\)=>deleteRecordById\(id\)/);
  assert.match(legacy, /showUndoSnackbar/);
});

test('inspection progress counts every status group including maintenance history', () => {
  assert.match(enhancements, /querySelectorAll\('\.badge-group'\)/);
  assert.doesNotMatch(enhancements, /total:\s*items\.length/);
});
