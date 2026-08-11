import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIRECTORY = path.join(__dirname, '..', 'data', 'modeles');
const IMPORTS_DIRECTORY = path.join(__dirname, '..', 'source-data', 'imports');
const BRAND_INDEX_FILE = path.join(__dirname, '..', 'data', 'marques.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'vehicles.json');
const US_YEARS_FILE = path.join(__dirname, '..', 'data', 'us-years.json');

const TARGET_BRANDS_FOR_US_YEARS = new Set([
  'RENAULT', 'PEUGEOT', 'VOLKSWAGEN', 'BMW', 'CITROËN', 'AUDI', 'MERCEDES-BENZ', 'FORD', 'OPEL', 'FIAT',
  'ABARTH', 'AIXAM', 'ALFA ROMEO', 'ALPINA', 'ALPINE', 'ASTON MARTIN', 'AUDI', 'AUSTIN', 'AUTOBIANCHI',
  'BENTLEY', 'BMW', 'BYD', 'CADILLAC', 'CHEVROLET', 'CHRYSLER', 'CITROËN', 'CUPRA', 'DACIA', 'DAEWOO',
  'DAIHATSU', 'DODGE', 'DR', 'DS', 'FERRARI', 'FIAT', 'FORD', 'FORD USA', 'GERMAN E-CARS', 'HONDA',
  'HUMMER', 'HYUNDAI', 'INFINITI', 'ISUZU', 'IVECO', 'JAGUAR', 'JEEP', 'KG MOBILITY', 'KIA', 'LADA',
  'LAMBORGHINI', 'LANCIA', 'LAND ROVER', 'LEXUS', 'LOTUS', 'LYNK & CO', 'MAN', 'MASERATI', 'MAXUS',
  'MAZDA', 'MERCEDES-BENZ', 'MG', 'MICROCAR', 'MINI', 'MITSUBISHI', 'NISSAN', 'OPEL', 'PEUGEOT', 'PIAGGIO',
  'POLESTAR', 'PONTIAC', 'PORSCHE', 'RAM', 'RENAULT', 'RENAULT TRUCKS', 'ROLLS-ROYCE', 'ROVER', 'SAAB',
  'SANTANA', 'SEAT', 'SKODA', 'SMART', 'SSANGYONG', 'SUBARU', 'SUZUKI', 'TALBOT', 'TATA (TELCO)', 'TESLA',
  'TOYOTA', 'TRABANT', 'TRIUMPH', 'VAUXHALL', 'VOLKSWAGEN', 'VOLVO',
]);

function loadUsYears() {
  try {
    return JSON.parse(fs.readFileSync(US_YEARS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

const US_YEARS = loadUsYears();

function normalizeMatchKey(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

function findUsYearRange(make, model) {
  if (!TARGET_BRANDS_FOR_US_YEARS.has(make.toUpperCase())) return '';
  const byMake = US_YEARS[make];
  if (!byMake) return '';
  const modelKey = normalizeMatchKey(model);
  return byMake[modelKey] || '';
}

function applyUsYearRange(model, makeName) {
  const range = findUsYearRange(makeName || model.nom, model.nom);
  if (!range) return;
  if (!String(model.annees || '').trim()) {
    model.annees = range;
  }
  if (!Array.isArray(model.generations) || !model.generations.length) return;
  model.generations.forEach((generation) => {
    if (!String(generation.annees || '').trim()) {
      generation.annees = range;
    }
  });
}

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

function isPlaceholder(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return true;
  const placeholders = ['documenter', 'non document', 'non precise', 'non précis', 'à confirmer', 'a confirmer', 'n/a', 'n/d', '-'];
  return placeholders.some((p) => v === p || v.includes(p));
}

const GENERIC_MOTOR_PATTERNS = [
  /^Essence\s*[-–—]\s*petite cylindrée/i,
  /^Essence\s*[-–—]\s*cylindrée moyenne/i,
  /^Essence\s*[-–—]\s*turbo/i,
  /^Diesel\s*[-–—]\s*entrée de gamme/i,
  /^Diesel\s*[-–—]\s*cylindrée moyenne/i,
  /^Diesel\s*[-–—]\s*puissant/i,
  /^Hybride$/i,
  /^Électrique$/i,
  /^Electrique$/i,
  /^Motorisation\s*\d+$/i,
];

function isGenericMotor(label) {
  const v = String(label || '').trim();
  if (!v) return true;
  return GENERIC_MOTOR_PATTERNS.some((re) => re.test(v));
}

function escapeRegex(string) {
  return String(string || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isPlaceholderChassis(code_chassis, modelName) {
  const v = String(code_chassis || '').trim();
  if (!v) return true;
  const lower = v.toLowerCase();
  const generic = ['version 1', 'version 2', 'version 3', 'version 4', 'version 5', 'modele 1', 'modèle 1', 'modele -1', 'modèle -1', 'modele 2', 'modèle 2', 'generation 1', 'génération 1', 'non document', 'non documenté', 'à documenter', 'a documenter', 'documenter', 'inconnu'];
  if (generic.some((p) => lower === p || lower.includes(p))) return true;
  const modelPart = String(modelName || '').trim();
  if (modelPart) {
    const re = new RegExp('^' + escapeRegex(modelPart) + '\\s*-?\\d+$', 'i');
    if (re.test(v)) return true;
  }
  return false;
}

function hasUsefulGenerationData(generation) {
  const hasChassis = !isPlaceholderChassis(generation?.code_chassis);
  const hasAnnees = !isPlaceholder(generation?.annees);
  const hasMotors = Array.isArray(generation?.motorisations) && generation.motorisations.some((m) => !isGenericMotor(m?.nom || m?.label || m));
  return hasChassis || hasAnnees || hasMotors;
}

function extractYearsFromString(text) {
  const years = [];
  const normalized = String(text || '').replace(/[–—]/g, '-');
  const matches = normalized.match(/\b(19|20)\d{2}\b/g);
  if (matches) years.push(...matches.map((y) => parseInt(y, 10)));
  return years;
}

function inferAnnees(generation, modelAnnees) {
  const direct = String(generation?.annees || '').trim();
  if (direct && !isPlaceholder(direct)) return direct;

  const years = [];
  years.push(...extractYearsFromString(generation?.code_chassis));
  years.push(...extractYearsFromString(generation?.phase));
  if (Array.isArray(generation?.phases)) {
    generation.phases.forEach((phase) => {
      years.push(...extractYearsFromString(typeof phase === 'string' ? phase : phase?.phase || phase?.nom || phase?.name));
    });
  }
  years.push(...extractYearsFromString(modelAnnees));

  if (!years.length) return '';
  const min = Math.min(...years);
  const max = Math.max(...years);
  const currentYear = new Date().getFullYear();
  const end = max > currentYear ? `${currentYear}` : max === min ? '' : `${max}`;
  return end ? `${min}-${end}` : `${min}`;
}

function cleanMotor(motor) {
  if (typeof motor === 'string') {
    const v = motor.trim();
    if (isPlaceholder(v) || isGenericMotor(v)) return null;
    return { nom: v };
  }
  if (!motor || typeof motor !== 'object') {
    return null;
  }
  const type = isPlaceholder(motor.type) ? '' : String(motor.type || '').trim();
  const nom = isPlaceholder(motor.nom) ? '' : String(motor.nom || '').trim();
  const code = isPlaceholder(motor.code_moteur) && isPlaceholder(motor.code)
    ? ''
    : String(motor.code_moteur || motor.code || '').trim();
  const cyl = isPlaceholder(motor.cylindree) ? '' : String(motor.cylindree || '').trim();
  const puissance = motor.puissance_ch || motor.puissance || null;
  const label = nom || [type, cyl, puissance ? `${puissance} ch` : ''].filter(Boolean).join(' ');
  if (!label || isGenericMotor(label)) return null;
  return {
    ...motor,
    type,
    nom: label,
    code_moteur: code,
    cylindree: cyl,
  };
}

function cleanGeneration(generation, modelName, index, modelAnnees) {
  const phase = String(generation?.phase || '').trim();
  let code_chassis = String(generation?.code_chassis || generation?.chassis || '').trim();

  if (isPlaceholder(code_chassis)) {
    code_chassis = phase || '';
  }
  if (isPlaceholderChassis(code_chassis, modelName)) {
    return null;
  }

  const annees = inferAnnees({ ...generation, phase }, modelAnnees);

  const motors = Array.isArray(generation?.motorisations)
    ? generation.motorisations.map((m) => cleanMotor(m)).filter(Boolean)
    : [];

  const cleaned = {
    ...generation,
    code_chassis,
    annees,
    motorisations: motors,
  };

  return hasUsefulGenerationData(cleaned) ? cleaned : null;
}

function normalizeModel(model) {
  const normalized = {
    ...model,
    nom: String(model?.nom || model?.name || '').trim(),
  };
  const modelName = normalized.nom;
  const modelAnnees = String(model?.annees || '').trim();
  const generations = Array.isArray(model?.generations) ? model.generations : [];

  normalized.generations = generations.flatMap((generation) => {
    if (!generation || typeof generation !== 'object') return [];
    const phases = Array.isArray(generation.phases) ? generation.phases : [];
    if (!phases.length || phases.every((phase) => typeof phase !== 'object')) {
      return [cleanGeneration({
        ...generation,
        motorisations: Array.isArray(generation.motorisations) ? generation.motorisations : [],
      }, modelName, 0, modelAnnees)];
    }

    return phases.map((phase, index) => cleanGeneration({
      ...generation,
      phase: phase.phase || phase.nom || phase.name || '',
      motorisations: Array.isArray(phase.motorisations)
        ? phase.motorisations
        : (Array.isArray(generation.motorisations) ? generation.motorisations : []),
    }, modelName, index, modelAnnees));
  }).filter(Boolean);

  if (!normalized.generations.length && Array.isArray(model?.motorisations)) {
    normalized.generations = [cleanGeneration({
      code_chassis: model.code_chassis || model.chassis || '',
      annees: model.annees || '',
      motorisations: model.motorisations,
    }, modelName, 0, modelAnnees)].filter(Boolean);
  }

  return normalized;
}

function generationKey(generation) {
  return [
    generation?.code_chassis || generation?.phase || '',
    generation?.annees || '',
  ].join('|').toLocaleLowerCase('fr');
}

function mergeModels(existing, incoming, makeName) {
  const byName = new Map(existing.map((model) => [modelKey(model), model]));

  incoming.forEach((candidate) => {
    const key = modelKey(candidate);
    if (!key) return;
    const normalizedCandidate = normalizeModel(candidate);
    applyUsYearRange(normalizedCandidate, makeName);

    const current = byName.get(key);
    if (!current) {
      const normalized = normalizedCandidate;
      if (!normalized.generations || normalized.generations.length === 0) return;
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
          mergeModels(brands.get(key).modeles, Array.isArray(entry.modeles) ? entry.modeles : [], name);
        });
      });
  });

  return Array.from(brands.values())
    .map((brand) => ({
      nom: brand.nom,
      modeles: brand.modeles.filter((model) => Array.isArray(model.generations) && model.generations.length > 0),
    }))
    .filter((brand) => brand.modeles.length > 0)
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
