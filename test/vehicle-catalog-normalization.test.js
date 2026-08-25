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

test('popular-brand catalogue remains complete and includes curated missing models', () => {
  const expected = {
    'Mercedes-Benz': 'GLE Coupe', BMW: 'Série 2 Active Tourer', Volkswagen: 'Golf Sportsvan',
    Audi: 'Q5 Sportback', Toyota: 'GR Yaris', Porsche: '718', Lamborghini: 'Revuelto',
    Ferrari: 'SF90 XX', Nissan: 'Z', Volvo: 'EX40', 'Citroën': 'e-C3', Peugeot: 'e-3008',
    Renault: 'R5 Turbo 3E',
  };
  for (const [brandName, modelName] of Object.entries(expected)) {
    const brand = vehicle(brandName);
    const model = brand?.modeles.find((entry) => entry.nom === modelName);
    assert.ok(model, `${brandName} doit contenir ${modelName}`);
    assert.ok(model.generations.length, `${modelName} doit avoir une génération`);
    for (const generation of model.generations) {
      assert.match(generation.annees, /\d{4}/, `${modelName} doit avoir une période`);
      assert.ok(generation.motorisations?.length, `${modelName} doit avoir des motorisations`);
    }
  }
});

test('Honda Prelude and Toyota Supra keep their documented historic generations', () => {
  const prelude = vehicle('Honda')?.modeles.find((model) => model.nom === 'Prelude');
  const supra = vehicle('Toyota')?.modeles.find((model) => model.nom === 'Supra');
  assert.deepEqual(prelude?.generations.map((generation) => generation.code_chassis), ['SN', 'BA1/BA2', 'BA4', 'BA8/BA9', 'BB5/BB6/BB8']);
  assert.deepEqual(supra?.generations.map((generation) => generation.code_chassis), ['A40/A50 - Mk1', 'A60 - Mk2', 'A70 - Mk3', 'A80']);
  assert.ok(supra.generations[3].motorisations.some((motor) => motor.code_moteur === '2JZ-GTE'));
  assert.ok(prelude.generations[4].motorisations.some((motor) => motor.code_moteur === 'H22A8'));
  assert.ok(prelude.source_fiche_technique.some((url) => url.includes('global.honda')));
  assert.ok(supra.source_fiche_technique.some((url) => url.includes('global.toyota')));
});

test('Porsche 911 includes the source-backed original and G-Series generations', () => {
  const model = vehicle('Porsche')?.modeles.find((entry) => entry.nom === '911');
  assert.ok(model?.generations.some((generation) => generation.code_chassis === '901 / Original 911'));
  const gSeries = model.generations.find((generation) => generation.code_chassis === 'G-Series / 930');
  assert.ok(gSeries?.motorisations.some((motor) => motor.puissance_ch === 300));
  assert.ok(model.source_fiche_technique.some((url) => url.includes('newsroom.porsche.com')));
});

test('requested popular makes have no generation without a year range or powertrain', () => {
  const requestedBrands = ['Mercedes-Benz', 'BMW', 'Volkswagen', 'Audi', 'Honda', 'Toyota', 'Lexus', 'Porsche', 'Land Rover', 'Jaguar', 'Lamborghini', 'Ferrari', 'Subaru', 'Nissan', 'Volvo', 'Citroën', 'Peugeot', 'Renault'];
  for (const brandName of requestedBrands) {
    const brand = vehicle(brandName);
    assert.ok(brand, `${brandName} doit exister`);
    for (const model of brand.modeles) {
      for (const generation of model.generations || []) {
        assert.match(String(generation.annees || ''), /\d{4}/, `${brandName} ${model.nom} doit avoir une période`);
        assert.ok((generation.motorisations || model.motorisations || []).length, `${brandName} ${model.nom} doit avoir une motorisation`);
      }
    }
  }
});
