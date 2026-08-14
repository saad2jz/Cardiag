const pointDefinitions = [
  ['huile','Huile moteur','moteur','Compartiment moteur','vital',5],
  ['ldr','Liquide de refroidissement','moteur','Compartiment moteur','vital',5],
  ['fuites','Fuites sous le véhicule','moteur','Compartiment moteur','vital',5],
  ['bruits','Bruits anormaux moteur','moteur','Compartiment moteur','vital',5],
  ['fumee',"Fumée à l'échappement",'moteur','Compartiment moteur','vital',5],
  ['ralenti','Stabilité du ralenti','moteur','Compartiment moteur','vital',5],
  ['culasse','Joint de culasse','moteur','Compartiment moteur','vital',5],
  ['supports','Supports moteur','moteur','Compartiment moteur','vital',5],
  ['rouille_plancher','Rouille plancher','chassis','Châssis, suspension & roues','chassis',3],
  ['longerons',"Longerons / points d'ancrage",'chassis','Châssis, suspension & roues','chassis',3],
  ['pont','Fuites pont / différentiel','chassis','Châssis, suspension & roues','chassis',3],
  ['rotules','Jeu rotules / triangles','chassis','Châssis, suspension & roues','chassis',3],
  ['amortos','Amortisseurs','chassis','Châssis, suspension & roues','chassis',3],
  ['pneus','Pneus','chassis','Châssis, suspension & roues','chassis',3],
  ['jantes','Jantes','chassis','Châssis, suspension & roues','chassis',3],
  ['panneaux','Alignement panneaux','carrosserie','Carrosserie & éclairage','esthetique',1],
  ['mastic','Mastic / bondo','carrosserie','Carrosserie & éclairage','esthetique',1],
  ['peinture','Peinture','carrosserie','Carrosserie & éclairage','esthetique',1],
  ['feux_av','Feux avant','carrosserie','Carrosserie & éclairage','esthetique',1],
  ['feux_ar','Feux arrière','carrosserie','Carrosserie & éclairage','esthetique',1],
  ['feux_recul','Feux recul / antibrouillard','carrosserie','Carrosserie & éclairage','esthetique',1],
  ['sieges','Sièges','habitacle','Habitacle & équipements','esthetique',1],
  ['ciel','Ciel de toit','habitacle','Habitacle & équipements','esthetique',1],
  ['clim','Climatisation','habitacle','Habitacle & équipements','esthetique',1],
  ['vitres','Vitres électriques','habitacle','Habitacle & équipements','esthetique',1],
  ['humidite','Humidité / odeurs','habitacle','Habitacle & équipements','esthetique',1],
  ['accel','Accélération','essai','Essai routier','chassis',3],
  ['vitesses','Passage des vitesses','essai','Essai routier','chassis',3],
  ['braquage','Test de braquage','essai','Essai routier','chassis',3],
  ['freinage','Freinage','essai','Essai routier','chassis',3],
  ['stabilite','Stabilité à vitesse stabilisée','essai','Essai routier','chassis',3],
  ['p1000','Code P1000','diagnostic','Diagnostic électronique','vital',5],
  ['q_historique',"Historique d'entretien",'info','Informations du véhicule','chassis',3],
];

const statuses = {
  fuites:'defaut', fumee:'moyen', longerons:'defaut', pneus:'moyen',
  peinture:'defaut', p1000:'defaut',
};

const notes = {
  fuites:'Fuite active localisée au carter inférieur, contrôle sur pont requis.',
  longerons:'Déformation visible sur le point de levage avant droit.',
  peinture:'Écart de teinte et surépaisseur mesurée sur aile arrière gauche.',
  p1000:'P1000 présent au premier scan, cycles de validation non terminés.',
};

function scoreFor(points) {
  const relevant=points.filter(point=>point.status);
  const maximum=relevant.reduce((sum,point)=>sum+point.weight,0);
  const obtained=relevant.reduce((sum,point)=>sum+point.weight*(point.status==='ok'?1:point.status==='moyen'?0.55:0),0);
  return maximum ? Math.round(obtained/maximum*100) : null;
}

function categoriesFor(points) {
  return [
    ['vital','Organes vitaux (moteur / électronique)',5],
    ['chassis','Châssis / trains roulants / dynamique',3],
    ['esthetique','Esthétique / confort',1],
  ].map(([category,label,weight])=>{
    const values=points.filter(point=>point.category===category);
    return { category,label,weight,score:scoreFor(values),done:values.filter(point=>point.status).length,total:values.length };
  });
}

export function buildCompleteReportModel(photoDataUrls=[]) {
  const photoByPoint={fuites:photoDataUrls[0],longerons:photoDataUrls[1],peinture:photoDataUrls[2]};
  const points=pointDefinitions.map(([name,label,section,sectionLabel,category,weight])=>({
    name,label,section,sectionLabel,category,weight,
    status:statuses[name] || 'ok',
    note:notes[name] || 'Contrôle réalisé, aucun écart complémentaire constaté.',
    photos:photoByPoint[name] ? [{ dataUrl:photoByPoint[name], name:`preuve-${name}.png` }] : [],
  }));
  const photos=points.flatMap(point=>point.photos.map(photo=>({ ...photo,key:`point:${point.name}` })));
  return {
    id:'t33001',
    title:'BMW Série 3 320d B47',
    createdAt:'2026-08-13T14:30:00+02:00',
    data:{
      annee:'2020',kilometrage:'98240',vin:'WBA8A51070K123456',valeur:'21900',
      date_expertise:'2026-08-13T14:30',geoloc:'Lyon, France',
      doc_carte_grise:true,doc_ct:true,doc_non_gage:true,doc_factures:true,
      q_historique:'ok',proprietaires:'2',raison_vente:'Remplacement par un véhicule familial.',usage_type:'Trajets mixtes ville et autoroute.',
      codes_ecm:'P1000, P0171 mémorisé',codes_abs:'Aucun code actif',codes_boite:'Aucun code actif',
      notes_diagnostic:'Lecture à froid puis après essai. P1000 confirmé ; refaire un scan après cycles complets.',p1000:'defaut',
      frais_estimation:'1850',marge_negociation:'-2500 €',budget_max:'22500',verdict:'negociation',
    },
    score:scoreFor(points),done:33,total:33,categories:categoriesFor(points),
    verdict:'negociation',verdictLabel:'NÉGOCIATION',points,photos,
    mainPhoto:photos[0] || null,signatures:{},shareUrl:'',assistantSummary:'',
  };
}
