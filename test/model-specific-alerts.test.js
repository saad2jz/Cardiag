import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { findModelSpecificAlerts } from '../js/knowledge/model-specific-alerts.js';

test('model-specific alerts require a precise brand, model and engine match', () => {
  const alerts = findModelSpecificAlerts({
    brand: 'BMW', model: 'Série 3', engine: '2.0d N47 184 ch', year: '2012', language: 'fr',
  });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].piece_concernee, 'Chaîne de distribution, tendeur et guides');
  assert.ok(alerts[0].symptomes.length >= 2);
  assert.match(alerts[0].cout_reparation_estime, /1 500/);
  assert.deepEqual(findModelSpecificAlerts({
    brand: 'BMW', model: 'Série 3', engine: '330i essence', year: '2012', language: 'fr',
  }), []);
});

test('alerts are available in English without changing their data contract', () => {
  const [alert] = findModelSpecificAlerts({
    brand: 'Ford', model: 'Fiesta', engine: '1.0 EcoBoost', year: 2018, language: 'en',
  });
  assert.equal(alert.gravite, 'Major');
  assert.ok(Array.isArray(alert.symptomes));
  assert.ok(alert.diagnostic.includes('Ford'));
});

test('the UI and premium PDF persist the model-specific alert annex', async () => {
  const [ui, report] = await Promise.all([
    readFile(new URL('../js/knowledge/model-specific-alerts.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/reports/premium-report.js', import.meta.url), 'utf8'),
  ]);
  assert.match(ui, /\['buyer', 'owner'\]/);
  assert.match(ui, /model_specific_alerts/);
  assert.match(report, /drawModelSpecificAlertsAppendix/);
  assert.match(report, /ANNEXE BASE DE CONNAISSANCES/);
});
