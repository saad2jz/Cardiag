import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  INLINE_PROCEDURES,
  SYMPTOMS_DATABASE,
  OBD_SCENARIOS,
} from '../src/knowledge-base.js';

function normalizeKey(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

test('knowledge base provides broad offline coverage', () => {
  assert.ok(Object.keys(INLINE_PROCEDURES).length >= 90);
  assert.ok(Object.keys(SYMPTOMS_DATABASE).length >= 30);
  assert.ok(Object.keys(OBD_SCENARIOS).length >= 140);
});

test('inline procedures are non-empty and contain only safe HTML', () => {
  const unsafeHtml = /<(?!\/?(?:strong|em|code|br|ul|ol|li|i)\b)[^>]*>/i;

  for (const [key, procedure] of Object.entries(INLINE_PROCEDURES)) {
    assert.ok(key.trim(), 'Une clé inline est vide.');
    assert.equal(typeof procedure, 'string', `${key} doit contenir une chaîne HTML.`);
    assert.ok(procedure.trim(), `${key} contient une procédure vide.`);
    assert.doesNotMatch(procedure, unsafeHtml, `${key} contient une balise HTML interdite.`);
  }
});

test('normalized inline keys do not collide', () => {
  const normalizedKeys = Object.keys(INLINE_PROCEDURES).map(normalizeKey);
  assert.equal(new Set(normalizedKeys).size, normalizedKeys.length);
});

test('all symptom scenarios satisfy the report contract', () => {
  for (const [key, scenario] of Object.entries(SYMPTOMS_DATABASE)) {
    assert.ok(key.trim());
    assert.equal(scenario.type, 'report', `${key} doit être un rapport.`);
    assert.equal(typeof scenario.fault_code, 'string');
    assert.ok(scenario.root_cause?.trim(), `${key} doit définir root_cause.`);
    assert.ok(scenario.action_plan?.trim(), `${key} doit définir action_plan.`);
    if (scenario.keywords !== undefined) {
      assert.ok(Array.isArray(scenario.keywords), `${key}.keywords doit être un tableau.`);
      assert.ok(scenario.keywords.every((keyword) => typeof keyword === 'string' && keyword.trim()));
    }
  }
});

test('all OBD scenarios use a valid matching key and report contract', () => {
  for (const [code, scenario] of Object.entries(OBD_SCENARIOS)) {
    assert.match(code, /^[PBCU][0-9A-F]{4}$/);
    assert.equal(scenario.type, 'report', `${code} doit être un rapport.`);
    assert.equal(scenario.fault_code, code);
    assert.ok(scenario.root_cause?.trim(), `${code} doit définir root_cause.`);
    assert.ok(scenario.action_plan?.trim(), `${code} doit définir action_plan.`);
  }
});
