import assert from 'node:assert/strict';
import { test } from 'node:test';
import { jsPDF } from 'jspdf';
import { createPdf, executiveSummary, photoGroupsForSection } from '../js/reports/premium-report.js';
import { buildCompleteReportModel } from './fixtures/complete-report-model.js';

test('the incomplete report states its exact inspection coverage', () => {
  const model=buildCompleteReportModel();
  model.done=12;
  model.points.slice(12).forEach(point=>{ point.status=''; });
  assert.match(executiveSummary(model),/^Inspection non finalisée — 12 points sur 33 renseignés\./);
});

test('P1000 is the first alert in a complete executive summary', () => {
  const summary=executiveSummary(buildCompleteReportModel());
  assert.match(summary,/^Alerte prioritaire : le code P1000/);
  assert.match(summary,/Conclusion : décision NÉGOCIATION/);
});

test('the complete 33-point model produces a multi-page premium PDF', async () => {
  globalThis.window={ jspdf:{ jsPDF } };
  const model=buildCompleteReportModel();
  const { pdf,reference }=await createPdf(model,{theme:'workshop',workshopName:'Atelier QA',logo:model.mainPhoto?.dataUrl});
  const bytes=Buffer.from(pdf.output('arraybuffer'));
  assert.equal(model.done,33);
  assert.equal(reference,'CD-33001');
  assert.ok(pdf.getNumberOfPages()>=13);
  assert.ok(bytes.length>25000);
});

test('all point and section photos remain attached to their precise report section', () => {
  const model=buildCompleteReportModel();
  const paintPoint=model.points.find(item=>item.name==='peinture');
  paintPoint.photos=[
    {dataUrl:'data:image/png;base64,AA==',name:'defaut-peinture-aile.png'},
    {dataUrl:'data:image/png;base64,AA==',name:'defaut-peinture-portiere.png'},
  ];
  model.photos.push(
    {dataUrl:'data:image/png;base64,AA==',name:'vue-moteur-1.png',key:'moteur'},
    {dataUrl:'data:image/png;base64,AA==',name:'vue-moteur-2.png',key:'moteur'},
    {dataUrl:'data:image/png;base64,AA==',name:'habitacle.png',key:'habitacle'},
  );
  const moteur=photoGroupsForSection(model,'moteur');
  const carrosserie=photoGroupsForSection(model,'carrosserie');
  const habitacle=photoGroupsForSection(model,'habitacle');
  assert.equal(moteur.general.length,2);
  assert.equal(carrosserie.points.find(item=>item.name==='peinture').photos.length,2);
  assert.equal(carrosserie.general.length,0);
  assert.equal(habitacle.general.length,1);
  assert.equal(habitacle.points.flatMap(item=>item.photos).length,0);
});
