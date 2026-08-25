(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.buildData = api.buildData;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function identity(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('fr-FR')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  // Regroupe les déclinaisons de marché sous la marque affichée à l'utilisateur.
  // Le catalogue reste complet, mais une voiture n'apparaît plus deux fois sous
  // « Ford » / « Ford USA », « DS » / « DS Automobiles » ou « BMW Alpina ».
  const BRAND_ALIASES = new Map([
    ['bmw alpina', 'Alpina'],
    ['ford usa', 'Ford'],
    ['ds', 'DS Automobiles'],
  ]);
  const BMW_MINI_MODELS = new Set([
    'clubman cooper', 'cooper', 'cooper s', 'john cooper works',
    'mini', 'mini cooper', 'mini one', 'one',
  ]);

  // La CL 600 atmosphérique 1999–2002 est une C215 (M137), et non une
  // C140. Cette fiche enrichie complète le catalogue importé, qui ne
  // référençait jusqu'ici que le V12 biturbo C215 postérieur.
  const CURATED_MOTORS = [{
    brand: 'Mercedes-Benz',
    model: 'CL',
    chassis: 'C215',
    motor: {
      type: 'Essence atmosphérique',
      nom: 'CL 600 V12 atmosphérique — 367 ch',
      identifiant_catalogue: 'CL 600 C215 V12 atmosphérique — 367 ch (270 kW / 5786 cm³ / code M137.970 / 10/1999-05/2002)',
      code_moteur: 'M137.970',
      cylindree: '5786 cm³',
      cylindree_cm3: 5786,
      puissance_kw: 270,
      puissance_ch: 367,
      couple_nm: 530,
      date_debut: '10/1999',
      date_fin: '05/2002',
      carrosserie_catalogue: 'Classe CL C215 coupé',
      codes_type: ['C215', 'C215.378', 'C215-M137.970'],
      architecture_moteur: 'V12 à 60°, 36 soupapes, double allumage, injection atmosphérique',
      alimentation: 'Injection essence atmosphérique',
      transmission: 'Propulsion',
      boite: ['5G-Tronic automatique 5 rapports (722.6)'],
      performances: { '0_100_kmh': '5,6 s environ', vitesse_max_kmh: 250 },
      dimensions: {
        longueur_mm: 4993,
        largeur_mm: 1857,
        empattement_mm: 2885,
        masse_a_vide_kg: 'environ 2065 à 2110 selon équipement',
      },
      historique_modele: 'CL 600 C215 de première phase : V12 M137 5,8 L atmosphérique, produit d’octobre 1999 à mai 2002. Il précède le CL 600 V12 biturbo M275, commercialisé à partir de 2002.',
      equipements_a_confirmer_par_vin: [
        'Suspension Active Body Control (ABC)',
        'Distronic',
        'COMAND et téléphonie',
        'Soft-close et pompe pneumatique PSE',
        'Sièges chauffants/ventilés et réglages mémoire',
      ],
      points_faibles: [
        {
          probleme: 'V12 M137 : allumage, injection et gestion moteur',
          symptomes: ['Ratés à chaud ou au ralenti', 'Voyant moteur', 'Perte de puissance ou surconsommation', 'Odeur d’essence ou démarrage difficile'],
          kilometrage_apparition: 'Vigilance dès 80 000 km et systématiquement en l’absence de factures d’entretien',
          diagnostic: 'Confirmer le code M137.970 par VIN. Faire un diagnostic Mercedes STAR, contrôler défauts d’allumage par cylindre, corrections de richesse, pression carburant, faisceaux et l’état des 24 bougies avant tout remplacement.',
          piece_concernee: 'Bobines, bougies, injecteurs, faisceaux et calculateurs moteur',
          gravite: 'Majeure',
          frequence: 'À surveiller sur les exemplaires peu entretenus',
          cout_reparation_estime: 'Environ 500 à 6 000 € selon le nombre de composants et la disponibilité',
        },
        {
          probleme: 'Refroidissement et étanchéité du V12',
          symptomes: ['Température moteur anormale', 'Perte de liquide de refroidissement', 'Ventilateur bruyant ou permanent', 'Traces de liquide sous le moteur'],
          kilometrage_apparition: 'À contrôler à chaque entretien et impérativement avant achat',
          diagnostic: 'Moteur froid puis à température : contrôler niveau, pression du circuit, radiateur, durites, pompe à eau, thermostat, ventilateur et traces de fuite. Vérifier que la température reste stable durant un essai long.',
          piece_concernee: 'Radiateur, pompe à eau, thermostat, durites et ventilateur',
          gravite: 'Critique en cas de surchauffe',
          frequence: 'Variable avec l’âge',
          cout_reparation_estime: 'Environ 300 à 3 500 € ; davantage si le moteur a surchauffé',
        },
        {
          probleme: 'Suspension Active Body Control (ABC)',
          symptomes: ['Véhicule affaissé après arrêt', 'Alerte ABC', 'Suspension dure ou rebonds', 'Fuite de fluide hydraulique'],
          kilometrage_apparition: 'Souvent avec l’âge ; contrôle visuel et essai dynamique systématiques',
          diagnostic: 'Contrôler niveau et propreté du fluide, fuites aux vérins, blocs hydrauliques, conduites et pompe. Lire les défauts ABC et vérifier le maintien d’assiette après stationnement puis la réaction en virage et sur route dégradée.',
          piece_concernee: 'Pompe ABC, vérins, blocs de soupapes, accumulateurs et conduites',
          gravite: 'Majeure à critique',
          frequence: 'Fréquent sur véhicule âgé',
          cout_reparation_estime: 'Environ 800 à 8 000 € selon l’organe ; devis spécialisé recommandé',
        },
        {
          probleme: 'Boîte automatique 5G-Tronic 722.6',
          symptomes: ['À-coups à froid ou à chaud', 'Passages retardés', 'Mode dégradé', 'Huile présente au connecteur de boîte'],
          kilometrage_apparition: 'Vigilance à partir de 100 000 km sans preuve de vidange',
          diagnostic: 'Essai à froid et à chaud, lecture des défauts de boîte, contrôle de l’historique de vidange, de la platine conductrice/capteurs, du connecteur et d’éventuelles remontées d’huile vers le faisceau.',
          piece_concernee: 'Platine conductrice, capteurs de vitesse, connecteur 13 broches, bloc hydraulique et convertisseur',
          gravite: 'Majeure',
          frequence: 'Courante sans entretien documenté',
          cout_reparation_estime: 'Environ 250 à 5 000 € selon diagnostic',
        },
        {
          probleme: 'Équipements de confort, PSE et électronique embarquée',
          symptomes: ['Fermeture assistée inactive', 'Verrouillage, sièges ou vitres intermittents', 'Écran COMAND ou pixels défaillants', 'Batterie qui se décharge'],
          kilometrage_apparition: 'Lié surtout à l’âge et à l’humidité',
          diagnostic: 'Tester chaque fonction avec les deux clés : fermeture, vitres, sièges, climatisation, COMAND, coffre et éclairages. Contrôler pompe PSE, infiltrations d’eau, état des batteries, alternateur, fusibles et défauts réseau.',
          piece_concernee: 'Pompe PSE, modules de portes, COMAND, batteries, alternateur et faisceaux',
          gravite: 'Modérée à majeure',
          frequence: 'Fréquente sur les exemplaires âgés',
          cout_reparation_estime: 'Environ 150 à 3 000 € selon équipement',
        },
        {
          probleme: 'Freinage, trains roulants et corrosion localisée',
          symptomes: ['Vibrations au freinage', 'Claquement sur mauvais revêtement', 'Usure irrégulière des pneus', 'Corrosion sous caisse ou aux bas de caisse'],
          kilometrage_apparition: 'À chaque contrôle et avant achat',
          diagnostic: 'Mettre le véhicule sur pont : contrôler disques, étriers, flexibles, silentblocs, bras, rotules, roulements, géométrie et corrosion des bas de caisse, passages de roue et plancher. Vérifier les rappels/campagnes par VIN, notamment le freinage selon année.',
          piece_concernee: 'Freinage, bras de suspension, silentblocs, roulements et carrosserie basse',
          gravite: 'Majeure',
          frequence: 'Usure liée à l’âge et au kilométrage',
          cout_reparation_estime: 'Environ 400 à 5 000 € selon corrosion et organes',
        },
      ],
      source_periode_motorisation: 'M137 E58 : CL 600 C215, 10/1999-05/2002',
      precision_periode_motorisation: 'Version V12 atmosphérique 367 ch ; ne pas confondre avec le CL 600 M275 biturbo postérieur',
      source_fiche_technique: [
        'https://c215.jimdofree.com/technische-daten/',
        'https://www.automobile-catalog.com/car/1999/1534730/mercedes-benz_cl_600.html',
      ],
    },
  }];

  // Complements for high-demand makes. They are merged with the imported
  // catalog below, never replace an existing generation, and deliberately
  // carry a year range plus identifiable powertrains so every picker step
  // stays usable offline.
  const CURATED_MODELS = [
    { brand: 'Mercedes-Benz', nom: 'GLE Coupe', generations: [
      { code_chassis: 'C292', annees: '2015-2019', motorisations: [{ nom: 'GLE 350 d 4MATIC - 258 ch', type: 'Diesel', puissance_ch: 258 }, { nom: 'AMG GLE 43 4MATIC - 367 ch', type: 'Essence', puissance_ch: 367 }, { nom: 'AMG GLE 63 S 4MATIC - 585 ch', type: 'Essence', puissance_ch: 585 }] },
      { code_chassis: 'C167', annees: '2019-aujourd’hui', motorisations: [{ nom: 'GLE 300 d 4MATIC - 269 ch', type: 'Diesel', puissance_ch: 269 }, { nom: 'GLE 400 d 4MATIC - 330 ch', type: 'Diesel', puissance_ch: 330 }, { nom: 'AMG GLE 53 4MATIC+ - 435 ch', type: 'Essence', puissance_ch: 435 }] },
    ] },
    { brand: 'Mercedes-Benz', nom: 'EQS SUV', generations: [{ code_chassis: 'X296', annees: '2022-aujourd’hui', motorisations: [{ nom: 'EQS 450+ - 360 ch', type: 'Electrique', puissance_ch: 360 }, { nom: 'EQS 580 4MATIC - 544 ch', type: 'Electrique', puissance_ch: 544 }] }] },
    { brand: 'BMW', nom: 'Série 2 Active Tourer', generations: [{ code_chassis: 'F45/F46', annees: '2014-2021', motorisations: [{ nom: '218i - 136 ch', type: 'Essence', puissance_ch: 136 }, { nom: '220i - 192 ch', type: 'Essence', puissance_ch: 192 }, { nom: '218d - 150 ch', type: 'Diesel', puissance_ch: 150 }] }, { code_chassis: 'U06', annees: '2022-aujourd’hui', motorisations: [{ nom: '218i - 136 ch', type: 'Essence mild-hybrid', puissance_ch: 136 }, { nom: '223i - 218 ch', type: 'Essence mild-hybrid', puissance_ch: 218 }, { nom: '230e xDrive - 326 ch', type: 'Hybride rechargeable', puissance_ch: 326 }] }] },
    { brand: 'Volkswagen', nom: 'Golf Sportsvan', generations: [{ code_chassis: 'AM1', annees: '2014-2020', motorisations: [{ nom: '1.0 TSI - 115 ch', type: 'Essence', puissance_ch: 115 }, { nom: '1.4 TSI - 125 ch', type: 'Essence', puissance_ch: 125 }, { nom: '1.6 TDI - 115 ch', type: 'Diesel', puissance_ch: 115 }, { nom: '2.0 TDI - 150 ch', type: 'Diesel', puissance_ch: 150 }] }] },
    { brand: 'Audi', nom: 'Q3 Sportback', generations: [{ code_chassis: 'F3', annees: '2019-aujourd’hui', motorisations: [{ nom: '35 TFSI - 150 ch', type: 'Essence', puissance_ch: 150 }, { nom: '40 TFSI quattro - 190 ch', type: 'Essence', puissance_ch: 190 }, { nom: '35 TDI - 150 ch', type: 'Diesel', puissance_ch: 150 }, { nom: 'RS Q3 - 400 ch', type: 'Essence', puissance_ch: 400 }] }] },
    { brand: 'Audi', nom: 'Q5 Sportback', generations: [{ code_chassis: 'FY', annees: '2020-aujourd’hui', motorisations: [{ nom: '40 TDI quattro - 204 ch', type: 'Diesel mild-hybrid', puissance_ch: 204 }, { nom: '45 TFSI quattro - 265 ch', type: 'Essence mild-hybrid', puissance_ch: 265 }, { nom: '50 TFSI e quattro - 299 ch', type: 'Hybride rechargeable', puissance_ch: 299 }, { nom: 'SQ5 TDI - 341 ch', type: 'Diesel mild-hybrid', puissance_ch: 341 }] }] },
    { brand: 'Toyota', nom: 'GR Yaris', generations: [{ code_chassis: 'XP210', annees: '2020-aujourd’hui', motorisations: [{ nom: '1.6 Turbo GR-Four - 261 ch', type: 'Essence', puissance_ch: 261 }, { nom: '1.6 Turbo GR-Four - 280 ch', type: 'Essence', puissance_ch: 280 }] }] },
    { brand: 'Toyota', nom: 'GR Corolla', generations: [{ code_chassis: 'E210', annees: '2022-aujourd’hui', motorisations: [{ nom: '1.6 Turbo GR-Four - 304 ch', type: 'Essence', puissance_ch: 304 }] }] },
    { brand: 'Porsche', nom: '718', generations: [{ code_chassis: '982', annees: '2016-aujourd’hui', motorisations: [{ nom: 'Boxster/Cayman 2.0 Turbo - 300 ch', type: 'Essence', puissance_ch: 300 }, { nom: 'Boxster S/Cayman S 2.5 Turbo - 350 ch', type: 'Essence', puissance_ch: 350 }, { nom: 'GTS 4.0 - 400 ch', type: 'Essence', puissance_ch: 400 }, { nom: 'GT4/Spyder 4.0 - 420 ch', type: 'Essence', puissance_ch: 420 }] }] },
    { brand: 'Lamborghini', nom: 'Revuelto', generations: [{ code_chassis: 'LB744', annees: '2023-aujourd’hui', motorisations: [{ nom: '6.5 V12 PHEV - 1015 ch', type: 'Hybride rechargeable', puissance_ch: 1015 }] }] },
    { brand: 'Lamborghini', nom: 'Temerario', generations: [{ code_chassis: '634', annees: '2024-aujourd’hui', motorisations: [{ nom: '4.0 V8 biturbo PHEV - 920 ch', type: 'Hybride rechargeable', puissance_ch: 920 }] }] },
    { brand: 'Ferrari', nom: 'SF90 XX', generations: [{ code_chassis: 'F173', annees: '2023-aujourd’hui', motorisations: [{ nom: '4.0 V8 biturbo PHEV - 1030 ch', type: 'Hybride rechargeable', puissance_ch: 1030 }] }] },
    { brand: 'Nissan', nom: 'Z', generations: [{ code_chassis: 'RZ34', annees: '2022-aujourd’hui', motorisations: [{ nom: '3.0 V6 biturbo - 405 ch', type: 'Essence', puissance_ch: 405 }, { nom: 'Nismo 3.0 V6 biturbo - 426 ch', type: 'Essence', puissance_ch: 426 }] }] },
    { brand: 'Volvo', nom: 'EX40', generations: [{ code_chassis: 'EX40', annees: '2024-aujourd’hui', motorisations: [{ nom: 'Single Motor - 238 ch', type: 'Electrique', puissance_ch: 238 }, { nom: 'Twin Motor - 408 ch', type: 'Electrique', puissance_ch: 408 }] }] },
    { brand: 'Citroën', nom: 'e-C3', generations: [{ code_chassis: 'CC21', annees: '2024-aujourd’hui', motorisations: [{ nom: 'Electrique - 113 ch', type: 'Electrique', puissance_ch: 113 }] }] },
    { brand: 'Peugeot', nom: 'e-3008', generations: [{ code_chassis: 'P64', annees: '2024-aujourd’hui', motorisations: [{ nom: 'Electric 210 - 210 ch', type: 'Electrique', puissance_ch: 210 }, { nom: 'Electric 230 Long Range - 230 ch', type: 'Electrique', puissance_ch: 230 }, { nom: 'Electric Dual Motor - 320 ch', type: 'Electrique', puissance_ch: 320 }] }] },
    { brand: 'Renault', nom: 'R5 Turbo 3E', generations: [{ code_chassis: 'R5T3E', annees: '2027-aujourd’hui', motorisations: [{ nom: 'Dual motor electric - 540 ch', type: 'Electrique', puissance_ch: 540 }] }] },
    { brand: 'Honda', nom: 'Prelude', source_fiche_technique: ['https://global.honda/en/newsroom/news/2025/4250731eng.html', 'https://global.honda/en/about/history-digest/75years-history/chapter2/section1_2/'], generations: [
      { code_chassis: 'SN', annees: '1978-1982', motorisations: [{ nom: '1.6 - 80 ch', code_moteur: 'EL', type: 'Essence', puissance_ch: 80 }, { nom: '1.8 - 90 ch', code_moteur: 'EK', type: 'Essence', puissance_ch: 90 }] },
      { code_chassis: 'BA1/BA2', annees: '1982-1987', motorisations: [{ nom: '1.8 - 105 ch', code_moteur: 'ET', type: 'Essence', puissance_ch: 105 }, { nom: '2.0 Si - 137 ch', code_moteur: 'A20A3', type: 'Essence', puissance_ch: 137 }] },
      { code_chassis: 'BA4', annees: '1987-1991', motorisations: [{ nom: '2.0i 16V - 140 ch', code_moteur: 'B20A', type: 'Essence', puissance_ch: 140 }, { nom: '2.0i 16V 4WS - 150 ch', code_moteur: 'B20A9', type: 'Essence', puissance_ch: 150 }] },
      { code_chassis: 'BA8/BA9', annees: '1991-1996', motorisations: [{ nom: '2.0i 16V - 133 ch', code_moteur: 'F20A4', type: 'Essence', puissance_ch: 133 }, { nom: '2.2i VTEC - 185 ch', code_moteur: 'H22A', type: 'Essence', puissance_ch: 185 }] },
      { code_chassis: 'BB5/BB6/BB8', annees: '1996-2001', motorisations: [{ nom: '2.0i - 133 ch', code_moteur: 'F20A4', type: 'Essence', puissance_ch: 133 }, { nom: '2.2i VTEC - 200 ch', code_moteur: 'H22A8', type: 'Essence', puissance_ch: 200 }] },
    ] },
    { brand: 'Toyota', nom: 'Supra', source_fiche_technique: ['https://global.toyota/en/newsroom/toyota/21235480.html', 'https://global.toyota/en/detail/7776580', 'https://global.toyota/en/detail/7868203', 'https://global.toyota/en/newsroom/toyota/30976721.html'], generations: [
      { code_chassis: 'A40/A50 - Mk1', annees: '1978-1981', motorisations: [{ nom: '2.6 4M-E - 110 ch', code_moteur: '4M-E', type: 'Essence', puissance_ch: 110 }, { nom: '2.0 M-EU - 110 ch', code_moteur: 'M-EU', type: 'Essence', puissance_ch: 110 }] },
      { code_chassis: 'A60 - Mk2', annees: '1981-1986', motorisations: [{ nom: '2.8 5M-E - 116 ch', code_moteur: '5M-E', type: 'Essence', puissance_ch: 116 }, { nom: '2.8 5M-GE - 161 ch', code_moteur: '5M-GE', type: 'Essence', puissance_ch: 161 }] },
      { code_chassis: 'A70 - Mk3', annees: '1986-1993', motorisations: [{ nom: '3.0 7M-GE - 200 ch', code_moteur: '7M-GE', type: 'Essence', puissance_ch: 200 }, { nom: '3.0 7M-GTE Turbo - 230 ch', code_moteur: '7M-GTE', type: 'Essence turbo', puissance_ch: 230 }, { nom: '2.0 1G-GTE Twin Turbo - 210 ch', code_moteur: '1G-GTE', type: 'Essence bi-turbo', puissance_ch: 210 }] },
      { code_chassis: 'A80', phase: 'Mk4', annees: '1993-2002', motorisations: [{ nom: '3.0 2JZ-GE - 220 ch', code_moteur: '2JZ-GE', type: 'Essence', puissance_ch: 220 }, { nom: '3.0 2JZ-GTE Twin Turbo - 280 ch', code_moteur: '2JZ-GTE', type: 'Essence bi-turbo', puissance_ch: 280 }, { nom: '3.0 2JZ-GTE Twin Turbo - 326 ch', code_moteur: '2JZ-GTE', type: 'Essence bi-turbo', puissance_ch: 326 }] },
    ] },
    { brand: 'Porsche', nom: '911', source_fiche_technique: ['https://newsroom.porsche.com/en/press-kits/911-s-t/60-years-of-the-Porsche-911.html', 'https://newsroom.porsche.com/en/history/porsche-911-seven-generations-part-2-g-model-16459.html'], generations: [
      { code_chassis: '901 / Original 911', annees: '1963-1973', motorisations: [{ nom: '2.0 flat-six - 130 ch', type: 'Essence', puissance_ch: 130 }, { nom: '2.4 flat-six S - 190 ch', type: 'Essence', puissance_ch: 190 }, { nom: 'Carrera RS 2.7 - 210 ch', type: 'Essence', puissance_ch: 210 }] },
      { code_chassis: 'G-Series / 930', annees: '1973-1989', motorisations: [{ nom: '2.7 flat-six - 150 ch', type: 'Essence', puissance_ch: 150 }, { nom: '3.0 flat-six Turbo - 260 ch', type: 'Essence turbo', puissance_ch: 260 }, { nom: '3.3 flat-six Turbo - 300 ch', type: 'Essence turbo', puissance_ch: 300 }, { nom: '3.2 Carrera - 231 ch', type: 'Essence', puissance_ch: 231 }] },
    ] },
  ];

  function canonicalBrandName(value) {
    const name = String(value || '').trim();
    return BRAND_ALIASES.get(identity(name)) || name;
  }

  function canonicalModelName(brand, value) {
    const name = String(value || '').trim();
    return identity(brand) === 'alpina' ? name.replace(/^alpina\s+/i, '') : name;
  }

  function targetForModel(sourceBrand, model) {
    const brand = canonicalBrandName(sourceBrand);
    const modelName = String(model?.nom || model?.name || '').trim();
    if (identity(brand) === 'bmw') {
      if (BMW_MINI_MODELS.has(identity(modelName))) return null;
      if (/^alpina\b/i.test(modelName)) return 'Alpina';
    }
    return brand;
  }

  function generationIdentity(generation) {
    return `${identity(generation?.code_chassis)}|${identity(generation?.annees)}`;
  }

  function addModel(bucket, model, brand) {
    const name = canonicalModelName(brand, model?.nom || model?.name);
    if (!name) return;
    const candidate = {
      nom: name,
      generations: Array.isArray(model?.generations) ? model.generations : [],
      annees: model?.annees || '',
      motorisations: Array.isArray(model?.motorisations) ? model.motorisations : [],
      source_fiche_technique: Array.isArray(model?.source_fiche_technique) ? model.source_fiche_technique : [],
    };
    const existing = bucket.modeles.find((entry) => identity(entry.nom) === identity(name));
    if (!existing) {
      bucket.modeles.push(candidate);
      return;
    }
    existing.source_fiche_technique = [...new Set([...(existing.source_fiche_technique || []), ...candidate.source_fiche_technique])];
    const known = new Set(existing.generations.map(generationIdentity));
    candidate.generations.forEach((generation) => {
      const key = generationIdentity(generation);
      if (!known.has(key)) {
        existing.generations.push(generation);
        known.add(key);
        return;
      }
      // A supplemental source may describe extra engines for a generation
      // already imported from another catalogue. Merge those engines instead
      // of silently discarding the more precise record.
      const target = existing.generations.find((entry) => generationIdentity(entry) === key);
      if (!target) return;
      const motors = Array.isArray(target.motorisations) ? target.motorisations : (target.motorisations = []);
      const motorIdentity = (motor) => identity(motor?.code_moteur || motor?.code || motor?.nom || motor?.label || motor);
      const knownMotors = new Set(motors.map(motorIdentity));
      (generation.motorisations || []).forEach((motor) => {
        const motorKey = motorIdentity(motor);
        if (motorKey && !knownMotors.has(motorKey)) {
          motors.push(motor);
          knownMotors.add(motorKey);
        }
      });
    });
    existing.generations.sort((left, right) => {
      const start = (generation) => Number.parseInt(String(generation?.annees || '').match(/\d{4}/)?.[0] || '9999', 10);
      return start(left) - start(right);
    });
  }

  function addCuratedMotors(buckets) {
    CURATED_MOTORS.forEach(({ brand, model, chassis, motor }) => {
      const bucket = buckets.get(identity(brand));
      const vehicle = bucket?.modeles.find((entry) => identity(entry.nom) === identity(model));
      const generation = vehicle?.generations.find((entry) => identity(entry.code_chassis || entry.chassis) === identity(chassis));
      if (!generation) return;
      if (!Array.isArray(generation.motorisations)) generation.motorisations = [];
      if (!generation.motorisations.some((entry) => identity(entry.code_moteur) === identity(motor.code_moteur))) {
        generation.motorisations.push(motor);
      }
    });
  }

  function addCuratedModels(buckets) {
    CURATED_MODELS.forEach(({ brand, ...model }) => {
      const key = identity(brand);
      if (!buckets.has(key)) buckets.set(key, { nom: brand, modeles: [] });
      addModel(buckets.get(key), model, brand);
    });
  }

  function buildData(payload) {
    const marques = payload?.marques || [];
    const byMarque = payload?.modelesByMarque || {};
    const buckets = new Map();

    marques.forEach((marque) => {
      const sourceBrand = String(marque?.nom || '').trim();
      if (!sourceBrand) return;
      const modeles = Array.isArray(byMarque[sourceBrand]) ? byMarque[sourceBrand] : [];
      modeles.forEach((modele) => {
        const targetBrand = targetForModel(sourceBrand, modele);
        if (!targetBrand) return;
        const key = identity(targetBrand);
        if (!buckets.has(key)) buckets.set(key, { nom: targetBrand, modeles: [] });
        addModel(buckets.get(key), modele, targetBrand);
      });
    });

    addCuratedModels(buckets);
    addCuratedMotors(buckets);

    return [...buckets.values()]
      .filter((brand) => brand.modeles.length)
      .sort((left, right) => left.nom.localeCompare(right.nom, 'fr'))
      .map((brand) => ({
        ...brand,
        modeles: brand.modeles.sort((left, right) => left.nom.localeCompare(right.nom, 'fr')),
      }));
  }

  return { buildData };
});
