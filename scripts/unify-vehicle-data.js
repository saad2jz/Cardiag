import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIRECTORY = path.join(__dirname, '..', 'data', 'modeles');
const IMPORTS_DIRECTORY = path.join(__dirname, '..', 'source-data', 'imports');
const BRAND_INDEX_FILE = path.join(__dirname, '..', 'data', 'marques.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'vehicles.json');

function normalizeSources(payload) {
  const entries = Array.isArray(payload)
    ? payload
    : payload && Array.isArray(payload.marques)
      ? payload.marques
      : payload && (payload.marque || payload.nom)
        ? [payload]
        : [];

  return entries
    .filter((entry) => entry && (entry.marque || entry.nom))
    .map((entry) => ({
      marque: String(entry.marque || entry.nom).trim(),
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

function normalizeModel(model) {
  const normalized = {
    ...model,
    nom: String(model?.nom || model?.name || '').trim(),
  };
  const generations = Array.isArray(model?.generations) ? model.generations : [];

  normalized.generations = generations.flatMap((generation) => {
    if (!generation || typeof generation !== 'object') return [];
    const phases = Array.isArray(generation.phases) ? generation.phases : [];
    if (!phases.length || phases.every((phase) => typeof phase !== 'object')) {
      return [{
        ...generation,
        motorisations: Array.isArray(generation.motorisations) ? generation.motorisations : [],
      }];
    }

    return phases.map((phase) => ({
      ...generation,
      phase: phase.phase || phase.nom || phase.name || '',
      annees: phase.annees || generation.annees || '',
      motorisations: Array.isArray(phase.motorisations)
        ? phase.motorisations
        : (Array.isArray(generation.motorisations) ? generation.motorisations : []),
    }));
  });

  if (!normalized.generations.length && Array.isArray(model?.motorisations)) {
    normalized.generations = [{
      code_chassis: model.code_chassis || model.chassis || '',
      annees: model.annees || '',
      motorisations: model.motorisations,
    }];
  }

  return normalized;
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
    const normalizedCandidate = normalizeModel(candidate);

    const current = byName.get(key);
    if (!current) {
      const normalized = normalizedCandidate;
      existing.push(normalized);
      byName.set(key, normalized);
      return;
    }

    const knownGenerations = new Set(
      (current.generations || []).map(generationKey)
    );
    (normalizedCandidate.generations || []).forEach((generation) => {
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
