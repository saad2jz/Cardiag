import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsPDF } from 'jspdf';
import { createPdf } from '../js/reports/premium-report.js';
import { buildCompleteReportModel } from '../test/fixtures/complete-report-model.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const asDataUrl=async(relativePath)=>`data:image/png;base64,${(await readFile(resolve(root,relativePath))).toString('base64')}`;
const photos=await Promise.all([
  asDataUrl('android/app/src/main/res/drawable/splash.png'),
  asDataUrl('android/app/src/main/res/drawable-port-mdpi/splash.png'),
  asDataUrl('android/app/src/main/res/drawable-land-mdpi/splash.png'),
]);

globalThis.window={ jspdf:{ jsPDF } };
const model=buildCompleteReportModel(photos);
const { pdf,reference }=await createPdf(model,{theme:'workshop',workshopName:'CarDiag Atelier Démonstration'});
const outputDir=resolve(root,'output','pdf');
const outputPath=resolve(outputDir,'rapport-expertise-complet-33-points.pdf');
await mkdir(outputDir,{recursive:true});
await writeFile(outputPath,Buffer.from(pdf.output('arraybuffer')));
console.log(JSON.stringify({outputPath,reference,pages:pdf.getNumberOfPages(),points:model.done,photos:model.photos.length,verdict:model.verdict},null,2));
