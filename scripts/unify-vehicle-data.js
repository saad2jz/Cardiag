'use strict';

const fs = require('fs');
const path = require('path');

const MODELS_DIRECTORY = path.join(__dirname, '..', 'data', 'modeles');
const IMPORTS_DIRECTORY = path.join(__dirname, '..', 'source-data', 'imports');
const BRAND_INDEX_FILE = path.join(__dirname, '..', 'data', 'marques.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'vehicles.json');

function normalizeSources(payload) {
  const entries = Array.isArray(payload)
    ? payload
    : payload && Array.isArray(payload.marques)
      ? payload.marques
      : payload && payload.marque
        ? [payload]
        : [];

  return entries
    .filter((entry) => entry && entry.marque)
    .map((entry) => ({
      marque: String(entry.marque).trim(),
      modeles: Array.isArray(entry.modeles) ? entry.modeles : [],
    }));
}

function identity(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr');
}

function modelKey(model) {
  return identity(model?.nom || model?.name);
}

function generationKey(generation) {
  return [
    generation?.code_chassis || generation?.phase || '',
    generation?.annees || '',
  ].join('|').toLocaleLowerCase('fr');
}

function mergeModels(existing, incoming) {
  const byName = new Map(existing.map((model) => [modelKey(model), model]));

  incoming.forEach((candidate) => {
    const key = modelKey(candidate);
    if (!key) return;

    const current = byName.get(key);
    if (!current) {
      const normalized = { ...candidate, nom: String(candidate.nom || candidate.name).trim() };
      normalized.generations = Array.isArray(candidate.generations) ? candidate.generations : [];
      existing.push(normalized);
      byName.set(key, normalized);
      return;
    }

    const knownGenerations = new Set(
      (current.generations || []).map(generationKey)
    );
    (candidate.generations || []).forEach((generation) => {
      const key = generationKey(generation);
      if (!knownGenerations.has(key)) {
        current.generations.push(generation);
        knownGenerations.add(key);
      }
    });
  });
}

function buildVehicleDatabase() {
  const brands = new Map();
  const brandIndex = JSON.parse(fs.readFileSync(BRAND_INDEX_FILE, 'utf8'));

  brandIndex.forEach((entry) => {
    const name = String(entry?.nom || '').trim();
    if (name) {
      brands.set(identity(name), { nom: name, modeles: [] });
    }
  });

  [MODELS_DIRECTORY, IMPORTS_DIRECTORY].forEach((directory) => {
    if (!fs.existsSync(directory)) return;

    fs.readdirSync(directory)
      .filter((filename) => filename.endsWith('.json'))
      .sort()
      .forEach((filename) => {
        const sourcePath = path.join(directory, filename);
        const payload = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

        normalizeSources(payload).forEach((entry) => {
          const name = String(entry?.marque || '').trim();
          if (!name) return;

          const key = identity(name);
          if (!brands.has(key)) {
            brands.set(key, { nom: name, modeles: [] });
          }
          mergeModels(brands.get(key).modeles, Array.isArray(entry.modeles) ? entry.modeles : []);
        });
      });
  });

  return Array.from(brands.values())
    .sort((left, right) => left.nom.localeCompare(right.nom, 'fr'))
    .map((brand) => ({
      nom: brand.nom,
      modeles: brand.modeles.sort((left, right) => left.nom.localeCompare(right.nom, 'fr')),
    }));
}

function sourceFiles() {
  return [MODELS_DIRECTORY, IMPORTS_DIRECTORY].flatMap((directory) => {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory)
      .filter((filename) => filename.endsWith('.json'))
      .sort()
      .map((filename) => path.join(directory, filename));
  });
}

function normalizeSourceFiles() {
  sourceFiles().forEach((sourcePath) => {
    const payload = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const normalized = normalizeSources(payload);
    fs.writeFileSync(sourcePath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  });
  console.log(`Normalized ${sourceFiles().length} source files.`);
}

if (process.argv.includes('--normalize-sources')) {
  normalizeSourceFiles();
}

const database = buildVehicleDatabase();
fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(database, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  BRAND_INDEX_FILE,
  `${JSON.stringify(database.map(({ nom }) => ({ nom })), null, 2)}\n`,
  'utf8'
);

const modelCount = database.reduce((count, brand) => count + brand.modeles.length, 0);
console.log(`Generated ${path.relative(process.cwd(), OUTPUT_FILE)}: ${database.length} brands, ${modelCount} models.`);
