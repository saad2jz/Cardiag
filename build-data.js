// build-data.js
// Construit /data à partir de tous les fichiers JSON placés dans source-data/.
//
// Chaque fichier source doit être un TABLEAU de marques au format riche :
//   [
//     {
//       "marque": "Peugeot",
//       "modeles": [
//         {
//           "nom": "205",
//           "generations": [
//             {
//               "code_chassis": "205 (Type 20)",
//               "annees": "1983-1998",
//               "phases": ["Phase 1 (1983-1988)", "Phase 2 (1988-1998)"],
//               "motorisations": [
//                 {
//                   "type": "Essence",
//                   "nom": "1.0 XV8 - 45ch",
//                   "code_moteur": "XV8",
//                   "cylindree": "954cm3",
//                   "puissance_ch": 45,
//                   "boite": ["BVM4"],
//                   "points_faibles": [ { "probleme": "...", "symptomes": [...],
//                     "kilometrage_apparition": "...", "diagnostic": "...",
//                     "piece_concernee": "...", "gravite": "...",
//                     "frequence": "...", "cout_reparation_estime": "..." } ]
//                 }
//               ]
//             }
//           ]
//         }
//       ]
//     }
//   ]
//
// Tu peux déposer plusieurs fichiers dans source-data/ (un par lot de marques,
// par exemple un fichier "marques_francaises.json", un autre
// "marques_allemandes.json", etc.) — ce script les fusionne tous. Si une même
// marque apparaît dans plusieurs fichiers, ses modèles sont fusionnés
// (concaténés ; en cas de même nom de modèle exact dans deux fichiers, les
// deux entrées sont conservées telles quelles — dédoublonne tes sources en
// amont si besoin).
//
// Usage : node build-data.js
'use strict';
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, 'source-data');
const OUT_DATA = path.join(__dirname, 'data');
const OUT_MODELES = path.join(OUT_DATA, 'modeles');

function slugify(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function loadSourceFiles() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error('Dossier source-data/ introuvable. Crée-le et place-y tes fichiers JSON.');
    process.exit(1);
  }
  const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.json'));
  if (!files.length) {
    console.error('Aucun fichier .json trouvé dans source-data/.');
    process.exit(1);
  }
  const brandsByName = new Map(); // marque -> modeles[]
  files.forEach(file => {
    const full = path.join(SOURCE_DIR, file);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (err) {
      console.error('Erreur de parsing JSON dans ' + file + ' :', err.message);
      process.exit(1);
    }
    const brandList = Array.isArray(parsed) ? parsed : [parsed];
    brandList.forEach(brandEntry => {
      if (!brandEntry || !brandEntry.marque) {
        console.warn('  \u26a0 Entrée sans champ "marque" ignorée dans ' + file);
        return;
      }
      const marque = brandEntry.marque;
      const modeles = Array.isArray(brandEntry.modeles) ? brandEntry.modeles : [];
      if (!brandsByName.has(marque)) brandsByName.set(marque, []);
      brandsByName.get(marque).push(...modeles);
    });
    console.log('Lu ' + file + ' (' + brandList.length + ' marque(s))');
  });
  return brandsByName;
}

function main() {
  fs.mkdirSync(OUT_MODELES, { recursive: true });
  const brandsByName = loadSourceFiles();

  const marques = Array.from(brandsByName.keys()).sort((a, b) => a.localeCompare(b, 'fr'));
  const marquesIndex = marques.map(m => ({ id: slugify(m), label: m }));
  fs.writeFileSync(path.join(OUT_DATA, 'marques.json'), JSON.stringify(marquesIndex, null, 2), 'utf8');

  let totalModeles = 0, totalGenerations = 0, totalMotorisations = 0, totalPointsFaibles = 0;

  marques.forEach(marque => {
    const modeles = brandsByName.get(marque);
    totalModeles += modeles.length;
    modeles.forEach(mo => {
      (mo.generations || []).forEach(g => {
        totalGenerations++;
        (g.motorisations || []).forEach(mt => {
          totalMotorisations++;
          totalPointsFaibles += (mt.points_faibles || []).length;
        });
      });
    });

    const fileData = { marque, modeles };
    fs.writeFileSync(
      path.join(OUT_MODELES, slugify(marque) + '.json'),
      JSON.stringify(fileData, null, 2),
      'utf8'
    );
  });

  const precacheList = ['data/marques.json']
    .concat(marques.map(m => 'data/modeles/' + slugify(m) + '.json'));
  fs.writeFileSync(
    path.join(OUT_DATA, 'precache-manifest.json'),
    JSON.stringify(precacheList, null, 2),
    'utf8'
  );

  console.log('');
  console.log('Marques : ' + marques.length);
  console.log('Modèles : ' + totalModeles);
  console.log('Générations : ' + totalGenerations);
  console.log('Motorisations : ' + totalMotorisations);
  console.log('Points faibles documentés : ' + totalPointsFaibles);
  console.log('Fichiers écrits dans data/modeles/ : ' + marques.length);
  console.log('Manifeste de précache : data/precache-manifest.json (' + precacheList.length + ' entrées)');
}

main();
