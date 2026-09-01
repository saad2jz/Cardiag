import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsPDF } from 'jspdf';
import { createPdf } from '../js/reports/premium-report.js';
import { buildCompleteReportModel } from '../test/fixtures/complete-report-model.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(projectRoot, 'assets', 'demo', 'rapport-expertise-demo-cardiag.pdf');
const model = buildCompleteReportModel();

model.id = 'demo-cardiag-2026-001';
model.title = 'Porsche 911 GT3 RS (991) — véhicule de démonstration';
model.shareUrl = '';
Object.assign(model.data, {
  marque: 'Porsche',
  annee: '2016',
  kilometrage: '32 800',
  vin: 'Non communiqué — démonstration',
  valeur: '198000',
  budget_max: '210000',
  usage_scenario: 'buyer',
  geoloc: 'Lyon — données de démonstration',
  vehicle_details_label: 'Génération 991 · données de démonstration',
  is_demo: true,
});
model.assistantSummary = 'Exemple fictif présentant la structure d’un rapport CarDiag pour une Porsche 911 GT3 RS (991).';
const vehicleImage = await readFile(resolve(projectRoot, 'assets', 'landing', 'cardiag-inspection.webp'));
model.mainPhoto = { dataUrl: `data:image/webp;base64,${vehicleImage.toString('base64')}`, name: 'porsche-911-gt3-rs-991-demonstration.webp' };

globalThis.window = { jspdf: { jsPDF } };
const { pdf } = await createPdf(model, { theme: 'cardiag', workshopName: 'CarDiag · Rapport de démonstration' });
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.from(pdf.output('arraybuffer')));
console.log(`Rapport de démonstration généré : ${outputPath}`);
