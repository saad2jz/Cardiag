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
    };
    const existing = bucket.modeles.find((entry) => identity(entry.nom) === identity(name));
    if (!existing) {
      bucket.modeles.push(candidate);
      return;
    }
    const known = new Set(existing.generations.map(generationIdentity));
    candidate.generations.forEach((generation) => {
      const key = generationIdentity(generation);
      if (!known.has(key)) {
        existing.generations.push(generation);
        known.add(key);
      }
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
