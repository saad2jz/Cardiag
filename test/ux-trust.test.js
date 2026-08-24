import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = `${await readFile(new URL('../js/app.js', import.meta.url), 'utf8')}\n${await readFile(new URL('../js/app-runtime.js', import.meta.url), 'utf8')}`;
const legacy = await readFile(new URL('../js/legacy-features.js', import.meta.url), 'utf8');
const wizard = await readFile(new URL('../js/wizard.js', import.meta.url), 'utf8');
const postReport = await readFile(new URL('../js/ux/post-report-actions.js', import.meta.url), 'utf8');
const backup = await readFile(new URL('../js/ux/local-backup-reminder.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');

test('legal decision limits remain visible on the landing and final verdict', () => {
  assert.ok((index.match(/data-landing-i18n="shortDisclaimer"/g) || []).length >= 2);
  assert.match(index, /class="decision-disclaimer"/);
  assert.match(index, /ne remplace ni un contrôle technique officiel/);
});

test('landing promotes existing quick inspection and comparison without fake social proof', () => {
  assert.match(index, /data-landing-i18n="quickFeatureText"/);
  assert.match(index, /12 points les plus critiques/);
  assert.match(index, /data-landing-i18n="compareFeatureText"/);
  assert.match(index, /landing-testimonials[^>]*hidden[^>]*data-enabled="false"/);
});

test('post-report actions reuse implemented backup, compare and PDF share capabilities', () => {
  assert.match(postReport, /getCurrentRecord/);
  assert.match(postReport, /document\.getElementById\('exportBtn'\)/);
  assert.match(postReport, /document\.getElementById\('compareBtn'\)/);
  assert.match(postReport, /cardiagPremiumReport\?\.share/);
  assert.match(postReport, /cardiag:report-generated/);
  assert.match(app, /initializePostReportActions\(\)/);
});

test('a significant locally saved report exposes a direct JSON backup reminder', () => {
  assert.match(backup, /SIGNIFICANT_FIELD_COUNT = 8/);
  assert.match(backup, /sessionStorage/);
  assert.match(backup, /document\.getElementById\('exportBtn'\)/);
  assert.doesNotMatch(backup, /analytics|cloud|subscription/i);
  assert.match(app, /initializeLocalBackupReminder\(\)/);
});

test('required vehicle fields validate inline and still keep the final safety check', () => {
  for (const field of ['marque', 'modele', 'annee', 'motorisation', 'kilometrage', 'valeur']) {
    assert.match(legacy, new RegExp(`key:'${field}'`));
  }
  assert.match(legacy, /focusout/);
  assert.match(legacy, /aria-invalid/);
  assert.match(legacy, /validateRequiredFields\(true\)/);
  assert.match(wizard, /nonNegativeValue\('kilometrage'\)/);
  assert.match(wizard, /nonNegativeValue\('valeur'\)/);
});

test('vehicle database failure enables free-text fallback and status controls are field-ready', () => {
  assert.match(app, /marqueManualWrap/);
  assert.match(app, /modeleManualWrap/);
  assert.match(app, /motorisationManualWrap/);
  assert.match(styles, /\.badge-group label[\s\S]{0,300}min-height:44px/);
  assert.match(styles, /input\[value="ok"\]:checked \+ label::before/);
  assert.match(styles, /input\[value="moyen"\]:checked \+ label::before/);
  assert.match(styles, /input\[value="defaut"\]:checked \+ label::before/);
});
