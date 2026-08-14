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
model.title = 'BMW Série 3 320d — véhicule fictif';
model.shareUrl = '';
model.data.geoloc = 'Lyon — données de démonstration';
model.assistantSummary = 'Exemple fictif destiné à présenter la structure du rapport CarDiag.';
const vehicleImage = await readFile(resolve(projectRoot, 'assets', 'landing', 'cardiag-inspection.webp'));
model.mainPhoto = { dataUrl: `data:image/webp;base64,${vehicleImage.toString('base64')}`, name: 'vehicule-fictif.webp' };

globalThis.window = { jspdf: { jsPDF } };
const { pdf } = await createPdf(model, { theme: 'workshop', workshopName: 'Atelier Démonstration CarDiag' });
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.from(pdf.output('arraybuffer')));
console.log(`Rapport de démonstration généré : ${outputPath}`);
