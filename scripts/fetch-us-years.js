import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'us-years.json');

const START_YEAR = 1992;
const END_YEAR = new Date().getFullYear();
const BASE_URL = 'https://raw.githubusercontent.com/abhionlyone/us-car-models-data/master';

const MAKE_ALIASES = {
  'mercedes-benz': 'Mercedes-Benz',
  'mercedes': 'Mercedes-Benz',
  'bmw': 'BMW',
  'volkswagen': 'Volkswagen',
  'vw': 'Volkswagen',
  'audi': 'Audi',
  'ford': 'Ford',
  'opel': 'Opel',
  'fiat': 'Fiat',
  'renault': 'Renault',
  'peugeot': 'Peugeot',
  'citroen': 'Citroën',
  'volvo': 'Volvo',
  'lexus': 'Lexus',
  'honda': 'Honda',
  'toyota': 'Toyota',
  'nissan': 'Nissan',
  'mazda': 'Mazda',
  'mitsubishi': 'Mitsubishi',
  'subaru': 'Subaru',
  'suzuki': 'Suzuki',
  'kia': 'Kia',
  'hyundai': 'Hyundai',
  'jaguar': 'Jaguar',
  'land rover': 'Land Rover',
  'porsche': 'Porsche',
  'mini': 'MINI',
  'seat': 'SEAT',
  'skoda': 'Skoda',
  'dacia': 'Dacia',
  'jeep': 'Jeep',
  'dodge': 'Dodge',
  'chrysler': 'Chrysler',
  'chevrolet': 'Chevrolet',
  'cadillac': 'Cadillac',
  'buick': 'Buick',
  'lincoln': 'Lincoln',
  'gmc': 'GMC',
  'ram': 'RAM',
  'acura': 'Acura',
  'alfa romeo': 'Alfa Romeo',
  'aston martin': 'Aston Martin',
  'bentley': 'Bentley',
  'ferrari': 'Ferrari',
  'lamborghini': 'Lamborghini',
  'maserati': 'Maserati',
  'mclaren': 'McLaren',
  'rolls-royce': 'Rolls-Royce',
  'smart': 'Smart',
  'tesla': 'Tesla',
  'infiniti': 'Infiniti',
  'genesis': 'Genesis',
  'polestar': 'Polestar',
  'cupra': 'CUPRA',
  'ds': 'DS',
};

const TARGET_BRANDS = new Set([
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

function normalizeMake(raw) {
  const key = String(raw || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9 ]/gi, ' ')
    .trim()
    .toLowerCase();
  return MAKE_ALIASES[key] || raw;
}

function normalizeModel(raw) {
  let model = String(raw || '').trim();
  // "C-Class" -> "Classe C", "CLA-Class" -> "Classe CLA"
  model = model.replace(/^(\S+)-Class$/i, 'Classe $1');
  // "3 Series" -> "Série 3"
  model = model.replace(/^(\S+) Series$/i, 'Série $1');
  return model;
}

function normalizeKey(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

function fetchCsv(year) {
  return new Promise((resolve, reject) => {
    https.get(`${BASE_URL}/${year}.csv`, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${year}`));
        return;
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseCsv(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const yearIdx = headers.indexOf('year');
  const makeIdx = headers.indexOf('make');
  const modelIdx = headers.indexOf('model');
  if (yearIdx === -1 || makeIdx === -1 || modelIdx === -1) return [];

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 3) continue;
    rows.push({
      year: parseInt(parts[yearIdx], 10),
      make: normalizeMake(parts[makeIdx]),
      model: normalizeModel(parts[modelIdx]),
    });
  }
  return rows;
}

async function main() {
  const index = new Map(); // key -> {make, model, min, max}

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    try {
      const csv = await fetchCsv(year);
      const rows = parseCsv(csv);
      for (const row of rows) {
        if (!TARGET_BRANDS.has(row.make.toUpperCase())) continue;
        const key = `${normalizeKey(row.make)}|${normalizeKey(row.model)}`;
        const entry = index.get(key);
        if (!entry) {
          index.set(key, { make: row.make, model: row.model, min: row.year, max: row.year });
        } else {
          entry.min = Math.min(entry.min, row.year);
          entry.max = Math.max(entry.max, row.year);
        }
      }
      process.stdout.write(`Fetched ${year}: ${rows.length} rows\n`);
    } catch (err) {
      process.stderr.write(`Warning: ${err.message}\n`);
    }
  }

  const output = {};
  for (const { make, model, min, max } of index.values()) {
    if (!output[make]) output[make] = {};
    output[make][normalizeKey(model)] = `${min}-${max}`;
  }

  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  const count = Array.from(index.values()).length;
  console.log(`Wrote ${OUTPUT_FILE}: ${count} model year ranges for ${Object.keys(output).length} brands.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
