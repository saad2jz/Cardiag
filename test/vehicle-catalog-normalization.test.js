import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const rawCatalog = JSON.parse(await readFile(new URL('../data/vehicles.json', import.meta.url), 'utf8'));
await import('../build-data.js');
const catalog = globalThis.buildData({
  marques: rawCatalog,
  modelesByMarque: Object.fromEntries(rawCatalog.map((brand) => [brand.nom, brand.modeles])),
});

function vehicle(name) {
  return catalog.find((entry) => entry.nom === name);
}

test('vehicle catalog keeps MINI and Alpina models out of BMW', () => {
  const bmw = vehicle('BMW');
  assert.ok(bmw, 'BMW doit exister dans le catalogue');
  const forbidden = /^(alpina\b|clubman cooper$|cooper(?: s)?$|john cooper works$|mini(?:\s|$)|one$)/i;
  assert.equal(bmw.modeles.some((model) => forbidden.test(model.nom)), false);

  const alpina = vehicle('Alpina');
  assert.ok(alpina?.modeles.some((model) => /^B[35678]\b/i.test(model.nom)));
});

test('catalog folds documented market-name duplicates into one make', () => {
  const names = new Set(catalog.map((entry) => entry.nom));
  assert.ok(names.has('Ford'));
  assert.equal(names.has('Ford USA'), false);
  assert.ok(names.has('DS Automobiles'));
  assert.equal(names.has('DS'), false);
  assert.ok(names.has('Alpina'));
  assert.equal(names.has('Bmw Alpina'), false);
});

test('catalog includes the CL 600 C215 V12 naturally aspirated from 1999 to 2002', () => {
  const mercedes = vehicle('Mercedes-Benz');
  const cl = mercedes?.modeles.find((model) => model.nom === 'CL');
  const c215 = cl?.generations.find((generation) => generation.code_chassis === 'C215');
  const motor = c215?.motorisations.find((entry) => entry.code_moteur === 'M137.970');

  assert.ok(motor, 'Le M137.970 doit être proposé pour la CL C215');
  assert.equal(motor.nom, 'CL 600 V12 atmosphérique — 367 ch');
  assert.equal(motor.date_debut, '10/1999');
  assert.equal(motor.date_fin, '05/2002');
  assert.equal(motor.puissance_kw, 270);
  assert.equal(motor.puissance_ch, 367);
  assert.equal(motor.couple_nm, 530);
  assert.equal(motor.alimentation, 'Injection essence atmosphérique');
  assert.ok(motor.points_faibles.length >= 6);
});
