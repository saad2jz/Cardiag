import { calculateNegotiation } from './negotiation.js?v=20260814-1';
import { normalizePersona, personaReport } from '../personas.js?v=20260814-1';
import { getVehicleBrandLogoDataUrl } from '../branding/vehicle-brand-logos.js?v=20260823-5';

const SECTION_ORDER = ['info','moteur','chassis','carrosserie','habitacle','essai','diagnostic'];
const STATUS = {
  ok:{ label:'OK', color:[22,163,74] },
  moyen:{ label:'MOYEN', color:[217,119,6] },
  defaut:{ label:'DÉFAUT', color:[185,28,28] },
  '':{ label:'NON VÉRIFIÉ', color:[100,116,139] },
};
const THEMES = {
  carbon:{ page:[13,16,19], surface:[25,30,35], text:[241,244,246], muted:[160,170,178], accent:[242,151,31], line:[60,69,77] },
  workshop:{ page:[242,246,248], surface:[255,255,255], text:[21,33,42], muted:[83,102,114], accent:[0,101,177], line:[207,220,226] },
  premium:{ page:[243,245,246], surface:[255,255,255], text:[25,34,41], muted:[90,103,112], accent:[11,104,177], line:[214,224,230] },
};

let pdfRuntimePromise;
function loadRuntimeScript(src){
  return new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(script=>script.src.endsWith(src));
    if(existing){
      if(existing.dataset.cardiagLoaded === 'true') return resolve();
      existing.addEventListener('load',resolve,{once:true});
      existing.addEventListener('error',()=>reject(new Error(`Impossible de charger ${src}`)),{once:true});
      return;
    }
    const script=document.createElement('script');
    script.src=src;script.async=true;script.onload=()=>{script.dataset.cardiagLoaded='true';resolve();};script.onerror=()=>reject(new Error(`Impossible de charger ${src}`));
    document.head.append(script);
  });
}

// PDF libraries are intentionally loaded only when a report is requested.
// This keeps the landing and inspection wizard interactive on slower phones.
export function ensurePdfRuntime(includeQr=false){
  if(window.jspdf?.jsPDF && (!includeQr || window.qrcode)) return Promise.resolve();
  if(!pdfRuntimePromise){
    pdfRuntimePromise=Promise.all([
      window.jspdf?.jsPDF ? Promise.resolve() : loadRuntimeScript('vendor/jspdf.umd.min.js'),
    ]).then(()=>{
      if(!window.jspdf?.jsPDF) throw new Error('jsPDF indisponible');
    }).catch(error=>{pdfRuntimePromise=null;throw error;});
  }
  return pdfRuntimePromise.then(async()=>{
    if(includeQr && !window.qrcode) await loadRuntimeScript('vendor/qrcode.js');
  });
}

function imageFormat(dataUrl='') { return dataUrl.includes('image/png') ? 'PNG' : dataUrl.includes('image/webp') ? 'WEBP' : 'JPEG'; }
function numberLabel(value) {
  const number=Number(value);
  return Number.isFinite(number) ? Math.round(number).toLocaleString('fr-FR',{useGrouping:true}).replace(/[\u202f\u00a0]/g,' ') : '—';
}
function euro(value) { const amount=Number(String(value||'').replace(/[^0-9.-]/g,'')); return Number.isFinite(amount) ? `${numberLabel(amount)} €` : '—'; }
function dateLabel(value) { const date=value?new Date(value):new Date(); return Number.isNaN(date.getTime()) ? String(value||'—') : date.toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}); }
function decisionColor(verdict) { return verdict==='achat'?[22,163,74]:verdict==='negociation'?[217,119,6]:verdict==='fuir'?[185,28,28]:[100,116,139]; }
function firstLines(value,max=5) { return String(value||'').split(/\n+/).map(line=>line.trim()).filter(Boolean).slice(0,max).join(' '); }
function qrDataUrl(value) { try { const qr=window.qrcode(0,'M');qr.addData(value);qr.make();return qr.createDataURL(5,0); } catch { return ''; } }
function scoreBand(score) { return score == null ? { label:'Non évalué', color:[100,116,139] } : score > 80 ? { label:'Sain', color:[22,163,74] } : score >= 50 ? { label:'Vigilance', color:[217,119,6] } : { label:'À risque', color:[185,28,28] }; }
function generationLabel(date=new Date()) { return date.toLocaleString('fr-FR',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(' à ', ' à '); }
export function effectiveDecision(model) {
  if (model.verdict) return { label:model.verdictLabel, verdict:model.verdict };
  const coverage=model.total ? model.done/model.total : 0;
  return coverage >= .95
    ? { label:'DÉCISION À FORMULER', verdict:'' }
    : { label:'INSPECTION À COMPLÉTER', verdict:'' };
}
function modelSpecificAlerts(data) {
  try {
    const parsed=JSON.parse(String(data?.model_specific_alerts||''));
    return Array.isArray(parsed) ? parsed.filter((alert)=>alert && typeof alert==='object' && Array.isArray(alert.symptomes)) : [];
  } catch { return []; }
}

function drawModelSpecificAlertsAppendix(pdf, alerts, palette, english) {
  if (!alerts.length) return;
  let y;
  const title=english?'Model-specific watch points':'Points de vigilance du modèle';
  pdf.addPage();y=setupPage(pdf,palette,title,english?'KNOWLEDGE-BASE APPENDIX':'ANNEXE BASE DE CONNAISSANCES');
  pdf.setTextColor(...palette.muted);pdf.setFont('helvetica','normal');pdf.setFontSize(8.5);
  const intro=english
    ? 'These watch points are not a diagnosis. Confirm them through field checks, maintenance records and the manufacturer procedure.'
    : 'Ces points de vigilance ne constituent pas un diagnostic. Confirmez-les avec les contrôles terrain, l’historique d’entretien et la procédure constructeur.';
  pdf.text(pdf.splitTextToSize(intro,178),16,y,{lineHeightFactor:1.45});y+=18;
  alerts.forEach((alert,index)=>{
    const rows=[
      [english?'Symptoms':'Symptômes', Array.isArray(alert.symptomes)?alert.symptomes.join(' · '):'—'],
      [english?'Typical mileage':'Kilométrage d’apparition', alert.kilometrage_apparition],
      [english?'Recommended check':'Méthode de contrôle recommandée', alert.diagnostic],
      [english?'Affected component':'Pièce concernée', alert.piece_concernee],
      [english?'Severity / frequency':'Gravité / fréquence', [alert.gravite,alert.frequence].filter(Boolean).join(' · ')],
      [english?'Estimated repair cost':'Coût de réparation estimé', alert.cout_reparation_estime],
    ];
    const estimated=20+rows.reduce((sum,[,value])=>sum+Math.max(11,pdf.splitTextToSize(String(value||'—'),116).slice(0,3).length*4+5),0);
    if(y+estimated>270){pdf.addPage();y=setupPage(pdf,palette,title,english?'KNOWLEDGE-BASE APPENDIX · CONTINUED':'ANNEXE BASE DE CONNAISSANCES · SUITE');}
    pdf.setFillColor(...palette.surface);pdf.roundedRect(16,y,178,15,3,3,'F');pdf.setTextColor(...palette.text);pdf.setFont('helvetica','bold');pdf.setFontSize(10);pdf.text(String(alert.title||`${english?'Watch point':'Point de vigilance'} ${index+1}`),21,y+9);y+=20;
    rows.forEach(([label,value])=>{const lines=pdf.splitTextToSize(String(value||'—'),116).slice(0,3),height=Math.max(12,lines.length*4+5);pdf.setFillColor(...palette.page);pdf.roundedRect(16,y,178,height-1,1.5,1.5,'F');pdf.setTextColor(...palette.muted);pdf.setFont('helvetica','bold');pdf.setFontSize(7);pdf.text(label.toUpperCase(),21,y+6);pdf.setTextColor(...palette.text);pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.text(lines,77,y+6,{lineHeightFactor:1.25});y+=height;});
    y+=5;
  });
}

function drawVehicleBrandBadge(pdf, brand, x, y, palette) {
  const name=String(brand||'Véhicule').trim().slice(0,24);
  const initials=name.split(/[\s-]+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase() || 'V';
  pdf.setFillColor(...palette.surface);pdf.setDrawColor(...palette.line);pdf.roundedRect(x,y,42,21,4,4,'FD');
  pdf.setFillColor(...palette.accent);pdf.circle(x+10.5,y+10.5,6.5,'F');
  pdf.setTextColor(...palette.page);pdf.setFont('helvetica','bold');pdf.setFontSize(initials.length>1?7:9);pdf.text(initials,x+10.5,y+12.5,{align:'center'});
  pdf.setTextColor(...palette.text);pdf.setFont('helvetica','bold');pdf.setFontSize(name.length>14?5.5:6.8);pdf.text(pdf.splitTextToSize(name.toUpperCase(),24).slice(0,2),x+18,y+8,{lineHeightFactor:1.1});
}

export function executiveSummary(model) {
  const coverage=model.total ? model.done/model.total : 0;
  if(model.done < model.total && coverage < .95) return `Inspection partielle — ${model.done} points sur ${model.total} renseignés. Les résultats ci-dessous ne permettent pas encore de conclure sur l’ensemble du véhicule.`;
  const defects=model.points.filter(point=>point.status==='defaut').sort((a,b)=>b.weight-a.weight);
  const warnings=model.points.filter(point=>point.status==='moyen');
  const strengths=model.points.filter(point=>point.status==='ok').slice(0,3).map(point=>point.label);
  const parts=[];
  if(model.data.p1000==='defaut') parts.push('Alerte prioritaire : le code P1000 indique un effacement récent de la mémoire défauts et peut masquer une panne non résolue.');
  parts.push(`${model.done} contrôle${model.done>1?'s':''} sur ${model.total} ont été documentés, pour un score pondéré de ${model.score ?? '—'}%.`);
  if(strengths.length) parts.push(`Points favorables : ${strengths.join(', ')}.`);
  if(defects.length) parts.push(`Alertes majeures : ${defects.slice(0,5).map(point=>point.label).join(', ')}.`);
  else if(warnings.length) parts.push(`Points à chiffrer : ${warnings.slice(0,3).map(point=>point.label).join(', ')}.`);
  const price=Number(model.data.valeur)||0, repairs=Number(model.data.frais_estimation)||0, budget=Number(model.data.budget_max)||0;
  const budgetText=budget ? ((price+repairs)<=budget ? `le coût projeté de ${numberLabel(price+repairs)} € reste dans le budget` : `le coût projeté dépasse le budget de ${numberLabel(price+repairs-budget)} €`) : 'le budget maximal n’est pas renseigné';
  const negotiation=model.negotiation || calculateNegotiation(model);
  const negotiationText=negotiation?.amount ? ` Marge de négociation calculée selon l’état : ${numberLabel(negotiation.amount)} €.` : '';
  const conclusion=model.verdict
    ? `Conclusion : décision ${model.verdictLabel} ; ${budgetText}.`
    : coverage >= .95
      ? `Conclusion : contrôle presque complet (${model.done}/${model.total}), mais décision finale à formuler ; ${budgetText}.`
      : `Conclusion : décision finale à consigner ; ${budgetText}.`;
  parts.push(conclusion + negotiationText);
  return parts.join(' ');
}

function addImageSafe(pdf, photo, x, y, w, h) {
  const data=photo?.dataUrl || photo;
  if(!data) return false;
  try { pdf.addImage(data,imageFormat(data),x,y,w,h,undefined,'FAST'); return true; } catch { return false; }
}

function addImageContained(pdf, photo, x, y, w, h, palette) {
  const data=photo?.dataUrl || photo;
  if(!data) return false;
  pdf.setFillColor(...palette.page);pdf.roundedRect(x,y,w,h,2,2,'F');
  try {
    const properties=pdf.getImageProperties(data);
    const ratio=Math.min(w/properties.width,h/properties.height);
    const imageWidth=properties.width*ratio,imageHeight=properties.height*ratio;
    pdf.addImage(data,imageFormat(data),x+(w-imageWidth)/2,y+(h-imageHeight)/2,imageWidth,imageHeight,undefined,'FAST');
    return true;
  } catch { return false; }
}

function photoProvenance(photo, english=false) {
  if (!photo?.addedAt) return english ? 'Imported image — capture date not verified' : 'Photo importée — date de prise non vérifiable';
  const date=new Date(photo.addedAt);
  const label=Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(english?'en-GB':'fr-FR');
  return english ? `Added to this record${label?` on ${label}`:''}` : `Ajoutée à cette fiche${label?` le ${label}`:''}`;
}

export function photoGroupsForSection(model, section) {
  const points=(model.points||[]).filter(point=>point.section===section).map(point=>({
    name:point.name,
    label:point.label,
    photos:Array.isArray(point.photos)?point.photos:[],
  }));
  const general=(model.photos||[]).filter(photo=>photo.key===section);
  return { general, points };
}

function drawPhotoGallery(pdf, photos, startY, palette, options={}) {
  let y=startY;
  const values=(photos||[]).filter(photo=>photo?.dataUrl || typeof photo==='string');
  if(!values.length) return y;
  const pageTitle=options.pageTitle||'Photographies de l’inspection';
  const kicker=options.kicker||'PREUVES PHOTOGRAPHIQUES';
  const nextPage=()=>{pdf.addPage();y=setupPage(pdf,palette,pageTitle,`${kicker} · SUITE`);};
  if(y+14>273)nextPage();
  pdf.setTextColor(...palette.text);pdf.setFont('helvetica','bold');pdf.setFontSize(8.5);
  pdf.text(pdf.splitTextToSize(options.title||`Photographies (${values.length})`,178).slice(0,2),16,y);
  y+=8;
  values.forEach((photo,index)=>{
    const column=index%2,x=16+column*90;
    if(column===0 && y+55>273)nextPage();
    pdf.setFillColor(...palette.surface);pdf.roundedRect(x,y,84,50,3,3,'F');
    const rendered=addImageContained(pdf,photo,x+2,y+2,80,39,palette);
    pdf.setTextColor(...palette.muted);pdf.setFont('helvetica','normal');pdf.setFontSize(6.2);
    const filename=firstLines(photo?.name||`Photo ${index+1}`,1);
    pdf.text(pdf.splitTextToSize(`${index+1}. ${filename}`,78).slice(0,1),x+3,y+45);
    pdf.setFontSize(5.2);pdf.text(pdf.splitTextToSize(photoProvenance(photo),78).slice(0,1),x+3,y+49);
    if(!rendered){pdf.setTextColor(...STATUS.defaut.color);pdf.setFont('helvetica','bold');pdf.text('IMAGE ILLISIBLE',x+42,y+23,{align:'center'});}
    if(column===1 || index===values.length-1)y+=55;
  });
  return y+2;
}

function drawDonut(pdf,x,y,r,score,color,palette) {
  const segments=64,filled=Math.round((Math.max(0,Math.min(100,score||0))/100)*segments);
  for(let index=0;index<segments;index+=1){const angle=(-Math.PI/2)+(index/segments)*Math.PI*2;pdf.setFillColor(...(index<filled?color:palette.line));pdf.circle(x+Math.cos(angle)*r,y+Math.sin(angle)*r,1.25,'F');}
  pdf.setTextColor(...palette.text); pdf.setFont('helvetica','bold'); pdf.setFontSize(16); pdf.text(score==null?'—':`${score}%`,x,y+2,{align:'center'});
}

function setupPage(pdf,palette,title,kicker='RAPPORT D’EXPERTISE AUTOMOBILE') {
  const w=pdf.internal.pageSize.getWidth(),h=pdf.internal.pageSize.getHeight();
  pdf.setFillColor(...palette.page);pdf.rect(0,0,w,h,'F');
  pdf.setFillColor(...palette.accent);pdf.rect(16,13,31,2,'F');
  pdf.setTextColor(...palette.muted);pdf.setFont('helvetica','bold');pdf.setFontSize(7);pdf.text(kicker,16,21);
  pdf.setTextColor(...palette.text);pdf.setFontSize(20);pdf.text(title,16,32);
  pdf.setDrawColor(...palette.line);pdf.line(16,39,w-16,39);
  return 48;
}

function addFooter(pdf,palette,reference,page,total,generatedAt,decision) {
  const h=pdf.internal.pageSize.getHeight(),w=pdf.internal.pageSize.getWidth();
  pdf.setDrawColor(...palette.line);pdf.line(16,h-13,w-16,h-13);
  pdf.setTextColor(...palette.muted);pdf.setFont('helvetica','normal');pdf.setFontSize(7);
  const trace=`CarDiag · Réf. ${reference} · Généré le ${generationLabel(generatedAt)}`;
  pdf.text(pdf.splitTextToSize(trace,128)[0],16,h-8);
  pdf.setFillColor(...decisionColor(decision.verdict));pdf.roundedRect(w-49,h-11,23,6,1.5,1.5,'F');pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(5.8);pdf.text(decision.label,w-37.5,h-7,{align:'center'});
  pdf.setTextColor(...palette.muted);pdf.setFont('helvetica','normal');pdf.setFontSize(7);pdf.text(`${page} / ${total}`,w-16,h-8,{align:'right'});
}

export async function createPdf(model,branding) {
  await ensurePdfRuntime(Boolean(model?.shareUrl));
  if(!window.jspdf?.jsPDF) throw new Error('jsPDF indisponible');
  const { jsPDF }=window.jspdf;const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  const palette=THEMES[branding?.theme] || THEMES.carbon;const w=210,h=297;const ref=String(model.id||Date.now()).replace(/^t/,'CD-').toUpperCase();const generatedAt=new Date();const decision=effectiveDecision(model);const persona=normalizePersona(model.data?.usage_scenario);const reportMeta=personaReport(persona);const negotiation=model.negotiation || calculateNegotiation(model);const english=window.cardiagI18n?.language==='en';
  const vehicleBrandLogo=model.data.brand_logo || await getVehicleBrandLogoDataUrl(model.data.marque);

  // Couverture
  pdf.setFillColor(...palette.page);pdf.rect(0,0,w,h,'F');
  pdf.setFillColor(...palette.accent);pdf.rect(0,0,w,6,'F');
  pdf.setDrawColor(...palette.line);pdf.roundedRect(12,11,186,268,5,5,'S');
  if(!addImageSafe(pdf,branding?.logo,17,16,21,21)){pdf.setFillColor(...palette.accent);pdf.roundedRect(17,16,21,21,4,4,'F');pdf.setTextColor(12,12,12);pdf.setFontSize(10);pdf.text('CD',27.5,29,{align:'center'});}
  pdf.setTextColor(...palette.text);pdf.setFont('helvetica','bold');pdf.setFontSize(12);pdf.text(branding?.workshopName||'CarDiag',43,25);pdf.setFont('helvetica','normal');pdf.setTextColor(...palette.muted);pdf.setFontSize(8);pdf.text('EXPERTISE AUTOMOBILE INDÉPENDANTE',43,31);
  if(!addImageContained(pdf,vehicleBrandLogo,151,16,42,21,palette))drawVehicleBrandBadge(pdf,model.data.marque,151,16,palette);
  pdf.setTextColor(...palette.text);pdf.setFont('helvetica','bold');pdf.setFontSize(21);const coverTitle=pdf.splitTextToSize(english?reportMeta.titleEn:reportMeta.title,122).slice(0,2);pdf.text(coverTitle,17,58,{lineHeightFactor:1.15});
  pdf.setTextColor(...palette.muted);pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text(`${dateLabel(model.data.date_expertise||model.createdAt)}  ·  Référence ${ref}`,17,80);
  if(model.mainPhoto){addImageSafe(pdf,model.mainPhoto,17,91,176,88);}else{pdf.setFillColor(...palette.surface);pdf.roundedRect(17,91,176,88,4,4,'F');pdf.setTextColor(...palette.muted);pdf.setFontSize(12);pdf.text('PHOTO PRINCIPALE DU VÉHICULE',105,137,{align:'center'});}
  const badge=decisionColor(decision.verdict);pdf.setFillColor(...badge);pdf.roundedRect(17,190,70,18,3,3,'F');pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(decision.label.length>15?10:13);pdf.text(decision.label,52,202,{align:'center'});
  pdf.setTextColor(...palette.text);pdf.setFontSize(17);pdf.text(model.title||'Véhicule non identifié',17,224);
  pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(...palette.muted);
  pdf.text(`Année  ${model.data.annee||'—'}     Kilométrage  ${model.data.kilometrage||'—'} km`,17,235);
  pdf.text(`VIN / Immatriculation  ${model.data.vin||'—'}`,17,243);
  pdf.text('Contrôle documenté à un instant T · Voir les limites en dernière page',17,273);

  // Synthèse visuelle
  pdf.addPage();let y=setupPage(pdf,palette,english?'Visual summary':'Synthèse visuelle');
  drawDonut(pdf,43,73,21,model.score,decisionColor(model.verdict|| (model.score>=80?'achat':model.score>=55?'negociation':'fuir')),palette);
  const coverage=Math.round((model.done/model.total)*100);pdf.setTextColor(...palette.text);pdf.setFont('helvetica','bold');pdf.setFontSize(13);pdf.text(`${model.done} / ${model.total}`,76,59);pdf.setFontSize(9);pdf.setTextColor(...palette.muted);pdf.text('points vérifiés',76,66);pdf.setFillColor(...palette.line);pdf.roundedRect(76,71,100,5,2.5,2.5,'F');pdf.setFillColor(...palette.accent);if(coverage)pdf.roundedRect(76,71,coverage,5,2.5,2.5,'F');pdf.setFontSize(7);pdf.text(`${coverage}% de couverture`,76,82);pdf.setFontSize(10);pdf.setTextColor(...palette.text);pdf.text(decision.label,76,90);
  y=106;pdf.setFont('helvetica','bold');pdf.setFontSize(12);pdf.text('Score par catégorie',16,y);y+=10;
  model.categories.forEach(category=>{const value=category.score??0,band=scoreBand(category.score);pdf.setFillColor(...palette.surface);pdf.roundedRect(16,y,178,21,3,3,'F');pdf.setTextColor(...palette.text);pdf.setFontSize(8);pdf.text(category.label.split(' (')[0],21,y+7);pdf.setTextColor(...palette.muted);pdf.text(`×${category.weight} · ${category.done}/${category.total} contrôlés`,21,y+14);pdf.setFillColor(...palette.line);pdf.roundedRect(104,y+7,66,5,2.5,2.5,'F');pdf.setFillColor(...band.color);if(value)pdf.roundedRect(104,y+7,Math.max(1,66*value/100),5,2.5,2.5,'F');pdf.setTextColor(...band.color);pdf.setFont('helvetica','bold');pdf.text(category.score==null?'—':`${category.score}%`,188,y+8,{align:'right'});pdf.setFont('helvetica','normal');pdf.setFontSize(6.5);pdf.text(band.label,188,y+14,{align:'right'});y+=26;});
  pdf.setFontSize(7);[['Sain > 80 %',[22,163,74]],['Vigilance 50–80 %',[217,119,6]],['À risque < 50 %',[185,28,28]]].forEach(([label,color],index)=>{const x=21+index*55;pdf.setFillColor(...color);pdf.circle(x,y+2,2,'F');pdf.setTextColor(...palette.muted);pdf.text(label,x+5,y+3);});y+=12;
  y+=3;pdf.setFont('helvetica','bold');pdf.setFontSize(12);pdf.setTextColor(...palette.text);pdf.text('Résumé exécutif',16,y);y+=8;pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(...palette.muted);const summary=executiveSummary(model);const summaryLines=pdf.splitTextToSize(summary,178);pdf.text(summaryLines,16,y,{lineHeightFactor:1.45});

  // Page 3 : les défauts majeurs avant le détail exhaustif.
  pdf.addPage();y=setupPage(pdf,palette,english?'Priority findings':'Points d’attention prioritaires',english?'PRIORITY REVIEW':'LECTURE PRIORITAIRE');
  const priorities=model.points.filter(point=>point.status==='defaut').sort((a,b)=>(b.name==='p1000')-(a.name==='p1000') || b.weight-a.weight || SECTION_ORDER.indexOf(a.section)-SECTION_ORDER.indexOf(b.section));
  const missingDocuments=[['Carte grise',model.data.doc_carte_grise],['Contrôle technique',model.data.doc_ct],['Certificat de non-gage',model.data.doc_non_gage],['Factures d’entretien',model.data.doc_factures]].filter(([,provided])=>!provided).map(([label])=>label);
  // L'absence de pièces administratives est un risque de transaction : elle
  // est donc prioritaire uniquement pour les parcours achat / vente, et non
  // pour le carnet de santé d'un propriétaire.
  const allDocumentsMissing=['buyer','seller'].includes(persona)&&missingDocuments.length===4;
  if(allDocumentsMissing){pdf.setFillColor(...STATUS.defaut.color);pdf.roundedRect(16,y,178,27,3,3,'F');pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(10);pdf.text('DOCUMENTS ESSENTIELS ABSENTS',21,y+9);pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.text(pdf.splitTextToSize('Aucune carte grise, contrôle technique, certificat de non-gage ni facture n’a été déclaré. Vérification impérative avant toute décision.',164),21,y+16,{lineHeightFactor:1.25});y+=33;}
  if(!priorities.length&&!allDocumentsMissing){pdf.setFillColor(22,163,74);pdf.roundedRect(16,y,178,22,3,3,'F');pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(11);pdf.text('Aucun défaut majeur identifié sur les points contrôlés',105,y+13,{align:'center'});}
  priorities.forEach(point=>{const photo=point.photos?.[0],height=photo?40:31;if(y+height>273){pdf.addPage();y=setupPage(pdf,palette,'Points d’attention prioritaires','LECTURE PRIORITAIRE · SUITE');}pdf.setFillColor(...STATUS.defaut.color);pdf.roundedRect(16,y,178,height-3,3,3,'F');pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(9);pdf.text(pdf.splitTextToSize(point.label,photo?118:160),22,y+9);pdf.setFontSize(6.5);pdf.text(`${point.sectionLabel} · coefficient ×${point.weight}`,22,y+17);if(point.note){pdf.setFont('helvetica','normal');pdf.text(pdf.splitTextToSize(firstLines(point.note,1),photo?112:160).slice(0,2),22,y+24);}if(photo)addImageSafe(pdf,photo,151,y+6,35,26);y+=height;});

  // Contexte et historique de vente, issu exclusivement des champs saisis.
  const contextTitle=english
    ? (persona==='mechanic'?'Intake & return':persona==='rental'?'Rental check-out & return':persona==='seller'?'Transparency & history':persona==='owner'?'History & maintenance':'Purchase context & history')
    : (persona==='mechanic'?'Prise en charge & restitution':persona==='rental'?'État des lieux départ & retour':persona==='seller'?'Transparence & historique':persona==='owner'?'Historique & entretien':'Contexte & historique de vente');
  pdf.addPage();y=setupPage(pdf,palette,contextTitle);
  pdf.setTextColor(...palette.text);pdf.setFont('helvetica','bold');pdf.setFontSize(12);pdf.text('Documents vérifiés',16,y);y+=9;
  [['Carte grise',model.data.doc_carte_grise],['Contrôle technique valide',model.data.doc_ct],['Certificat de non-gage',model.data.doc_non_gage],['Factures d’entretien',model.data.doc_factures]].forEach(([label,checked],index)=>{const x=16+(index%2)*90,cy=y+Math.floor(index/2)*16;pdf.setFillColor(...(checked?[22,163,74]:palette.surface));pdf.roundedRect(x,cy,84,12,2,2,'F');pdf.setTextColor(...(checked?[255,255,255]:palette.muted));pdf.setFont('helvetica','bold');pdf.setFontSize(7);pdf.text(checked?'OK':'NON',x+6,cy+8);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text(label,x+20,cy+8);});
  y+=40;const history=model.data.q_historique==='ok'?'Complet':model.data.q_historique==='moyen'?'Partiel':model.data.q_historique==='defaut'?'Absent':'Non renseigné';
  const contextRows=[['Historique d’entretien déclaré',history],['Propriétaires précédents',model.data.proprietaires||'Non renseigné'],['Raison de la vente',model.data.raison_vente||'Non renseignée'],['Type d’utilisation déclaré',model.data.usage_type||'Non renseigné'],['Date et heure de l’inspection',model.data.date_expertise?new Date(model.data.date_expertise).toLocaleString('fr-FR'):'Non renseignées'],['Localisation',model.data.geoloc||'Non renseignée']];
  if(model.data.usage_scenario==='mechanic')contextRows.push(
    ['Ordre de réparation',model.data.work_order_reference||'Non renseigné'],['Kilométrage réception / restitution',[model.data.intake_mileage,model.data.release_mileage].filter(Boolean).map(value=>`${value} km`).join(' → ')||'Non renseigné'],['État à la réception',model.data.mechanic_intake_condition||'Non renseigné'],['Travaux réalisés',model.data.repair_work_completed||'Non renseigné'],['Contrôles après réparation',model.data.post_repair_checks||'Non renseigné'],['État à la restitution',model.data.mechanic_release_condition||'Non renseigné']
  );
  if(model.data.usage_scenario==='rental'){
    const out=Number(model.data.rental_mileage_out)||0,incoming=Number(model.data.rental_mileage_in)||0;
    contextRows.push(['Identifiant flotte',model.data.fleet_vehicle_id||'Non renseigné'],['Contrat / locataire',[model.data.rental_contract_reference,model.data.renter_reference].filter(Boolean).join(' · ')||'Non renseigné'],['Départ / retour',[model.data.rental_start,model.data.rental_end].filter(Boolean).join(' → ')||'Non renseigné'],['Kilométrage départ / retour',[out,incoming].filter(Boolean).map(value=>`${value} km`).join(' → ')||'Non renseigné'],['Distance parcourue',out&&incoming>=out?`${incoming-out} km`:'À vérifier'],['Énergie départ / retour',[model.data.rental_energy_out,model.data.rental_energy_in].filter(Boolean).join(' → ')||'Non renseigné'],['État avant location',model.data.rental_condition_out||'Non renseigné'],['État après location',model.data.rental_condition_in||'Non renseigné'],['Nouveaux dommages / écarts',model.data.rental_damage_delta||'Aucun écart déclaré']);
  }
  contextRows.forEach(([label,value])=>{const lines=pdf.splitTextToSize(String(value),108).slice(0,3),height=Math.max(17,7+lines.length*4);if(y+height>273){pdf.addPage();y=setupPage(pdf,palette,'Contexte & historique — suite');}pdf.setFillColor(...palette.surface);pdf.roundedRect(16,y,178,height-2,2,2,'F');pdf.setTextColor(...palette.muted);pdf.setFont('helvetica','bold');pdf.setFontSize(7);pdf.text(label.toUpperCase(),21,y+6);pdf.setTextColor(...palette.text);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text(lines,80,y+6,{lineHeightFactor:1.3});y+=height;});
  const contextPhotoLabels={mechanic_intake_condition:'État du véhicule à la réception',mechanic_release_condition:'État du véhicule à la restitution',rental_condition_out:'État des lieux avant location',rental_condition_in:'État des lieux après location',rental_damage_delta:'Nouveaux dommages / écarts constatés'};
  Object.entries(contextPhotoLabels).forEach(([key,label])=>{const photos=(model.photos||[]).filter(photo=>photo.key===`context:${key}`);if(photos.length)y=drawPhotoGallery(pdf,photos,y+3,palette,{title:`${label} — photos liées (${photos.length})`,pageTitle:'Contexte & état contradictoire'});});

  // Détails par section
  SECTION_ORDER.forEach(section=>{
    const points=model.points.filter(point=>point.section===section);if(!points.length)return;
    pdf.addPage();let py=setupPage(pdf,palette,points[0].sectionLabel||section,'DÉTAIL DES CONTRÔLES');
    const sectionNote=String(model.sectionNotes?.[section]||'').trim();
    if(sectionNote){const lines=pdf.splitTextToSize(sectionNote,166).slice(0,4),height=Math.max(18,10+lines.length*4);pdf.setFillColor(...palette.surface);pdf.roundedRect(16,py,178,height,3,3,'F');pdf.setTextColor(...palette.muted);pdf.setFont('helvetica','bold');pdf.setFontSize(7);pdf.text('OBSERVATION GÉNÉRALE DE LA SECTION',21,py+6);pdf.setTextColor(...palette.text);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text(lines,21,py+12,{lineHeightFactor:1.25});py+=height+6;}
    const photoGroups=photoGroupsForSection(model,section);
    const documented=points.filter(point=>point.status || point.photos?.length),unchecked=points.filter(point=>!point.status && !point.photos?.length);
    documented.forEach(point=>{
      const pointPhotos=Array.isArray(point.photos)?point.photos:[];const blockHeight=22;
      if(py+blockHeight>274){pdf.addPage();py=setupPage(pdf,palette,points[0].sectionLabel||section,'DÉTAIL DES CONTRÔLES · SUITE');}
      const status=STATUS[point.status]||STATUS[''];pdf.setFillColor(...palette.surface);pdf.roundedRect(16,py,178,blockHeight-3,3,3,'F');pdf.setFillColor(...status.color);pdf.circle(22,py+7,2.2,'F');pdf.setTextColor(...palette.text);pdf.setFont('helvetica','bold');pdf.setFontSize(9);pdf.text(pdf.splitTextToSize(point.label,118),28,py+7);pdf.setFillColor(...status.color);pdf.roundedRect(154,py+3,34,8,2,2,'F');pdf.setTextColor(255,255,255);pdf.setFontSize(7);pdf.text(status.label,171,py+8.2,{align:'center'});
      if(point.note){pdf.setTextColor(...palette.muted);pdf.setFont('helvetica','normal');pdf.setFontSize(7);pdf.text(pdf.splitTextToSize(firstLines(point.note,2),118).slice(0,2),28,py+15);}
      if(point.name==='p1000'&&point.status==='defaut'){pdf.setDrawColor(185,28,28);pdf.setLineWidth(1);pdf.roundedRect(16,py,178,blockHeight-3,3,3,'S');}
      py+=blockHeight;
      if(pointPhotos.length){
        py=drawPhotoGallery(pdf,pointPhotos,py,palette,{title:`Photos liées au contrôle « ${point.label} » (${pointPhotos.length})`,pageTitle:points[0].sectionLabel||section});
      }
    });
    if(!documented.length){pdf.setFillColor(...palette.surface);pdf.roundedRect(16,py,178,18,3,3,'F');pdf.setTextColor(...palette.muted);pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text('Aucun point renseigné dans cette section.',21,py+11);py+=24;}
    if(photoGroups.general.length){
      py=drawPhotoGallery(pdf,photoGroups.general,py+3,palette,{title:`Photos générales de la section (${photoGroups.general.length})`,pageTitle:points[0].sectionLabel||section});
    }
    if(section==='diagnostic'){
      const obdRows=[['Codes ECM (moteur)',model.data.codes_ecm],['Codes ABS',model.data.codes_abs],['Codes boîte de vitesses',model.data.codes_boite||model.data.codes_boitier],['Observations diagnostic',model.data.notes_diagnostic]].filter(([,value])=>String(value||'').trim());
      if(obdRows.length){py+=6;if(py>220){pdf.addPage();py=setupPage(pdf,palette,'Diagnostic électronique (OBD2)');}pdf.setTextColor(...palette.text);pdf.setFont('helvetica','bold');pdf.setFontSize(11);pdf.text('Relevé électronique saisi',16,py);py+=7;obdRows.forEach(([label,value])=>{const lines=pdf.splitTextToSize(String(value),112).slice(0,3),height=Math.max(16,7+lines.length*4);pdf.setFillColor(...palette.surface);pdf.roundedRect(16,py,178,height-2,2,2,'F');pdf.setTextColor(...palette.muted);pdf.setFontSize(7);pdf.text(label.toUpperCase(),21,py+6);pdf.setTextColor(...palette.text);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text(lines,75,py+6,{lineHeightFactor:1.25});py+=height;});}
    }
    if(section==='diagnostic' && model.data.p1000==='defaut'){
      if(py>248){pdf.addPage();py=setupPage(pdf,palette,'Alerte électronique');}
      pdf.setFillColor(185,28,28);pdf.roundedRect(16,py,178,24,3,3,'F');pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(9);pdf.text('ALERTE P1000 — MÉMOIRE DÉFAUTS RÉCEMMENT EFFACÉE',21,py+8);pdf.setFont('helvetica','normal');pdf.setFontSize(7);pdf.text(pdf.splitTextToSize('Ce signal peut masquer une panne non résolue. Recroiser impérativement avec les cycles de conduite, l’historique et un nouveau scan OBD.',168),21,py+14);
      py+=30;
    }
    if(unchecked.length){if(py+18+unchecked.length*5>274){pdf.addPage();py=setupPage(pdf,palette,points[0].sectionLabel||section,'DÉTAIL DES CONTRÔLES · SUITE');}pdf.setTextColor(...palette.muted);pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.text('NON CONTRÔLÉS LORS DE CETTE INSPECTION',16,py);py+=7;pdf.setFont('helvetica','normal');pdf.setFontSize(7);unchecked.forEach(point=>{pdf.setFillColor(...palette.line);pdf.circle(19,py-1.3,1,'F');pdf.text(point.label,24,py);py+=5;});}
  });

  // La page financière emploie le vocabulaire propre au parcours actif.
  pdf.addPage();y=setupPage(pdf,palette,english?reportMeta.financeTitleEn:reportMeta.financeTitle);
  const price=Number(model.data.valeur)||0,repairs=Number(model.data.frais_estimation)||0,budget=Number(model.data.budget_max)||0;const hasRepairs=repairs>0,hasBudget=budget>0;const suggested=negotiation?.amount ? `-${numberLabel(negotiation.amount)} €` : String(model.data.marge_negociation||'').trim()|| (hasRepairs?`-${numberLabel(repairs)} €`:'—');
  const financialRows=[
    [persona==='mechanic'?'Valeur du véhicule déclarée':persona==='rental'?'Valeur de référence du véhicule':'Valeur affichée',euro(price)],
    [persona==='mechanic'?'Pièces et main-d’œuvre estimées':persona==='owner'?'Travaux et entretien estimés':'Frais de remise en état estimés',hasRepairs?euro(repairs):(english?'Not specified':'Non renseignés')],
  ];
  if(['buyer','seller'].includes(persona))financialRows.push(['Marge de négociation basée sur l’état',suggested]);
  if(['buyer','seller'].includes(persona)&&negotiation?.targetPrice)financialRows.push(['Prix cible conseillé',euro(negotiation.targetPrice)]);
  financialRows.push([persona==='mechanic'?'Plafond autorisé par le client':persona==='rental'?'Provision / franchise de référence':'Budget maximum',hasBudget?euro(budget):(english?'Not specified':'Non renseigné')]);
  financialRows.forEach(([label,value],index)=>{pdf.setFillColor(...(index%2?palette.page:palette.surface));pdf.rect(16,y,178,18,'F');pdf.setTextColor(...palette.muted);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text(label,21,y+11);pdf.setTextColor(...palette.text);pdf.setFont('helvetica','bold');pdf.setFontSize(11);pdf.text(value,188,y+11,{align:'right'});y+=18;});
  y+=14;pdf.setTextColor(...palette.text);pdf.setFontSize(12);pdf.text(english?'Financial review':'Lecture financière',16,y);y+=9;pdf.setTextColor(...palette.muted);pdf.setFont('helvetica','normal');pdf.setFontSize(9);const financial=(price&&hasRepairs&&hasBudget)?`Coût d’acquisition projeté après remise en état : ${numberLabel(price+repairs)} €. ${(price+repairs)<=budget?'Le projet reste dans le budget annoncé.':`Le budget est dépassé de ${numberLabel(price+repairs-budget)} €.`}${negotiation?.label?` ${negotiation.label}`:''}${negotiation?.arguments?.length?` Arguments factuels : ${negotiation.arguments.join(', ')}.`:''}`:(english?'Budget section incomplete — enter the advertised price, repair estimate and maximum budget before relying on a financial conclusion.':'Section budget incomplète — renseignez la valeur affichée, les frais estimés et le budget maximum avant de vous appuyer sur une conclusion financière.');pdf.text(pdf.splitTextToSize(financial,178),16,y,{lineHeightFactor:1.5});

  // Distincte des défauts relevés : cette annexe reprend uniquement les
  // points de vigilance documentés après l'identification du véhicule.
  drawModelSpecificAlertsAppendix(pdf,modelSpecificAlerts(model.data),palette,english);

  // Signatures et validation
  pdf.addPage();y=setupPage(pdf,palette,english?'Signatures & approval':'Signatures & validation');
  ['acheteur','vendeur'].forEach((name,index)=>{const x=index?110:16,label=(english?reportMeta.signatureLabelsEn:reportMeta.signatureLabels)[index];const signature=model.signatures?.[name];const declared=model.data?.[`signature_confirmed_${name}`];const signer=String(model.data?.[`signature_name_${name}`]||label).slice(0,60);pdf.setFillColor(...palette.surface);pdf.roundedRect(x,y,84,48,3,3,'F');if(!addImageSafe(pdf,signature,x+7,y+7,70,25)&&declared){pdf.setTextColor(...palette.muted);pdf.setFont('helvetica','italic');pdf.setFontSize(8);pdf.text(pdf.splitTextToSize(english?`Declared validation: ${signer}`:`Validation déclarée : ${signer}`,68).slice(0,2),x+7,y+18,{align:'center'});}pdf.setTextColor(...palette.muted);pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.text(`SIGNATURE ${label.toUpperCase()}`,x+7,y+40);});
  y+=68;pdf.setTextColor(...palette.text);pdf.setFontSize(12);pdf.text('Limites du rapport',16,y);y+=9;pdf.setTextColor(...palette.muted);pdf.setFont('helvetica','normal');pdf.setFontSize(8);const disclaimer='Ce rapport reflète un contrôle principalement visuel et fonctionnel réalisé à un instant T, dans les conditions décrites. Il ne constitue ni un contrôle technique officiel, ni une garantie contre les défauts non visibles, intermittents ou postérieurs à l’inspection. Les valeurs et réparations estimées doivent être confirmées par un professionnel qualifié et la documentation constructeur.';pdf.text(pdf.splitTextToSize(disclaimer,178),16,y,{lineHeightFactor:1.5});
  if(model.shareUrl){y+=34;const qr=qrDataUrl(model.shareUrl);if(qr)addImageSafe(pdf,qr,154,y-7,32,32);pdf.setTextColor(...palette.accent);pdf.setFont('helvetica','bold');pdf.setFontSize(9);pdf.text('VERSION EN LIGNE EN LECTURE SEULE',16,y);pdf.setFont('helvetica','normal');pdf.setTextColor(...palette.muted);pdf.setFontSize(8);pdf.text(pdf.splitTextToSize(model.shareUrl,128),16,y+7);pdf.setFontSize(7);pdf.text('Scannez le QR code pour ouvrir le rapport partagé.',16,y+20);}

  const total=pdf.getNumberOfPages();for(let page=1;page<=total;page++){pdf.setPage(page);addFooter(pdf,palette,ref,page,total,generatedAt,decision);}
  return { pdf, reference:ref };
}

export function initializePremiumReport() {
  const button=document.getElementById('generateBtn');const shortButton=document.getElementById('shortPrintBtn');
  shortButton?.addEventListener('click',()=>window.cardiagDataBridge?.printShort?.());
  const translate=(key,fallback)=>window.cardiagI18n?.t?.(key,fallback)||fallback;

  function filenameFor(model){return `CarDiag_${model.title||model.id}`.replace(/[^a-z0-9_-]+/gi,'_')+'.pdf';}

  function chooseAction(){
    return new Promise((resolve)=>{
      const layer=document.createElement('section');layer.className='report-action-sheet';
      layer.innerHTML=`<div role="dialog" aria-modal="true" aria-labelledby="reportActionTitle"><p class="panel-kicker">RAPPORT PDF PREMIUM</p><h2 id="reportActionTitle">${translate('report.choose','Que souhaitez-vous faire avec le rapport ?')}</h2><div class="report-action-options"><button type="button" data-report-action="download">⬇ <span>${translate('report.download','Télécharger le PDF')}</span></button><button type="button" data-report-action="share">↗ <span>${translate('report.share','Partager le PDF')}</span></button><button type="button" data-report-action="link">🔗 <span>${translate('report.link','Partager un lien privé')}</span></button><button type="button" class="report-action-cancel" data-report-action="cancel">${translate('report.cancel','Annuler')}</button></div></div>`;
      const finish=(value)=>{layer.remove();resolve(value)};
      layer.addEventListener('click',(event)=>{const action=event.target.closest('[data-report-action]')?.dataset.reportAction;if(action)finish(action==='cancel'?'':action);else if(event.target===layer)finish('')});
      document.body.append(layer);layer.querySelector('[data-report-action="download"]')?.focus();
    });
  }

  function markGenerated(model){
    window.cardiagDataBridge?.markReportGenerated?.(model.id);
    window.dispatchEvent(new CustomEvent('cardiag:report-generated',{detail:{id:model.id}}));
  }

  async function perform(action,id){
    const model=window.cardiagDataBridge?.getReportModel?.(id);if(!model)return false;
    if(action==='link'){
      markGenerated(model);
      document.getElementById('shareReportBtn')?.click();
      return true;
    }
    const branding=window.cardiagBranding?.current||{theme:'carbon',workshopName:'CarDiag'};
    const {pdf}=await createPdf(model,branding);const filename=filenameFor(model);
    if(action==='share'){
      const blob=pdf.output('blob');const file=new File([blob],filename,{type:'application/pdf'});
      if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'Rapport CarDiag'});
      else {pdf.save(filename);window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback',{detail:{type:'selection',message:'Le partage de fichiers n’est pas disponible : le PDF a été téléchargé.'}}));}
    }else{
      pdf.save(filename);
    }
    markGenerated(model);
    window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback',{detail:{type:'success',message:action==='share'?'Rapport prêt à partager':'Rapport PDF téléchargé'}}));
    return true;
  }

  async function run(action,id){
    const original=button?.textContent; if(button){button.disabled=true;button.textContent='⏳ Composition du rapport…';}
    try{return await perform(action,id)}catch(error){console.error('PDF premium:',error);window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback',{detail:{type:'error',message:'Rapport premium temporairement indisponible'}}));return false}finally{if(button){button.disabled=false;button.textContent=original}}
  }

  window.cardiagPremiumReport={
    async generate(id){const action=await chooseAction();return action?run(action,id):false},
    download:(id)=>run('download',id),
    share:(id)=>run('share',id),
    createPdf,
  };
}
