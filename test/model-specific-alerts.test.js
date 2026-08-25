import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { findModelSpecificAlerts, normalizeCatalogueAlerts } from '../js/knowledge/model-specific-alerts.js';

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

test('documented engine weaknesses expose every field required by the UI and PDF', async () => {
  const catalog = JSON.parse(await readFile(new URL('../data/vehicles.json', import.meta.url), 'utf8'));
  let documentedMotor;
  outer: for (const brand of catalog) {
    for (const model of brand.modeles || []) {
      for (const generation of model.generations || []) {
        for (const motor of generation.motorisations || model.motorisations || []) {
          if (Array.isArray(motor.points_faibles) && motor.points_faibles.length) {
            documentedMotor = motor;
            break outer;
          }
        }
      }
    }
  }
  assert.ok(documentedMotor, 'Le catalogue doit contenir au moins une motorisation documentee');
  const [alert] = normalizeCatalogueAlerts(documentedMotor.points_faibles);
  assert.ok(alert);
  for (const field of ['symptomes', 'kilometrage_apparition', 'diagnostic', 'piece_concernee', 'gravite', 'frequence', 'cout_reparation_estime']) {
    assert.ok(alert[field], `Le champ ${field} doit etre disponible`);
  }
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
