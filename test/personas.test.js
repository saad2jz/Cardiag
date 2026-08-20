import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PERSONAS,
  calculatePersonaScore,
  personaQuickChecks,
  personaRequiresVin,
  personaWeights,
  sanitizePersonaData,
} from '../js/personas.js';

const expectedMajorScores = {
  buyer: 42,
  mechanic: 50,
  rental: 69,
  seller: 58,
  owner: 46,
};

for (const persona of PERSONAS) {
  test(`${persona}: le cas nominal produit un score reproductible de 100`, () => {
    const result = calculatePersonaScore([
      { category: 'vital', status: 'ok' },
      { category: 'chassis', status: 'ok' },
      { category: 'esthetique', status: 'ok' },
    ], persona);
    assert.equal(result.score, 100);
    assert.equal(result.done, 3);
  });

  test(`${persona}: un défaut vital applique le preset propre au persona`, () => {
    const result = calculatePersonaScore([
      { category: 'vital', status: 'defaut' },
      { category: 'chassis', status: 'ok' },
      { category: 'esthetique', status: 'ok' },
    ], persona);
    assert.equal(result.score, expectedMajorScores[persona]);
  });

  test(`${persona}: le mode rapide comporte douze contrôles uniques`, () => {
    const checks = personaQuickChecks(persona);
    assert.equal(checks.length, 12);
    assert.equal(new Set(checks).size, 12);
  });
}

test('les presets de score sont distincts et immuables par copie', () => {
  assert.notDeepEqual(personaWeights('buyer'), personaWeights('rental'));
  const weights = personaWeights('buyer');
  weights.vital = 0;
  assert.equal(personaWeights('buyer').vital, 7);
});

test('les champs de contexte étrangers au persona sont retirés des exports', () => {
  const clean = sanitizePersonaData({
    usage_scenario: 'mechanic',
    work_order_reference: 'OR-42',
    rental_contract_reference: 'LOC-9',
    known_defects: 'Rayure',
    marque: 'BMW',
  });
  assert.deepEqual(clean, { usage_scenario: 'mechanic', work_order_reference: 'OR-42', marque: 'BMW' });
});

test('le VIN est obligatoire uniquement pour les parcours professionnels traçables', () => {
  assert.equal(personaRequiresVin('mechanic'), true);
  assert.equal(personaRequiresVin('rental'), true);
  assert.equal(personaRequiresVin('buyer'), false);
  assert.equal(personaRequiresVin('seller'), false);
  assert.equal(personaRequiresVin('owner'), false);
});
