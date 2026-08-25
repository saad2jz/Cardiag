/**
 * Points de vigilance associés à une combinaison marque / modèle / moteur.
 *
 * Ces données ne constituent pas un diagnostic : elles servent à préparer
 * l'inspection terrain et sont volontairement limitées aux combinaisons où
 * la motorisation permet un rapprochement suffisamment précis.
 */
export const MODEL_SPECIFIC_ALERTS = [
  {
    id: 'bmw-n47-distribution',
    brand: 'BMW',
    models: ['Série 1', 'Serie 1', 'Série 3', 'Serie 3', 'Série 5', 'Serie 5', 'X1', 'X3'],
    engineTerms: ['N47', '18d', '20d', '23d', '25d'],
    years: [2007, 2015],
    fr: {
      title: 'Chaîne de distribution diesel N47',
      symptomes: ['Cliquetis métallique au ralenti, surtout à froid', 'Bruit de chaîne côté boîte', 'Démarrage difficile ou défaut de synchronisation'],
      kilometrage_apparition: '80 000 à 180 000 km',
      diagnostic: 'Écoute à froid et contrôle de la distribution par un professionnel selon la procédure BMW ; vérifier l’historique des remplacements.',
      piece_concernee: 'Chaîne de distribution, tendeur et guides',
      gravite: 'Majeure',
      frequence: 'À surveiller',
      cout_reparation_estime: '1 500 à 3 500 €',
    },
    en: {
      title: 'N47 diesel timing chain',
      symptomes: ['Metallic rattle at idle, especially cold', 'Chain noise from the gearbox side', 'Hard starting or timing correlation fault'],
      kilometrage_apparition: '80,000 to 180,000 km',
      diagnostic: 'Cold-start listening check and professional timing inspection following BMW procedure; verify replacement records.',
      piece_concernee: 'Timing chain, tensioner and guides',
      gravite: 'Major',
      frequence: 'Monitor closely',
      cout_reparation_estime: '€1,500 to €3,500',
    },
  },
  {
    id: 'stellantis-puretech-wet-belt',
    brand: 'Peugeot|Citroën|Citroen|DS Automobiles|Opel',
    models: ['208', '308', '2008', '3008', 'C3', 'C4', 'DS 3', 'DS 4', 'Corsa', 'Mokka'],
    engineTerms: ['PureTech', '1.2', 'EB2'],
    years: [2013, 2022],
    fr: {
      title: 'Courroie de distribution en bain d’huile PureTech',
      symptomes: ['Alerte de pression d’huile', 'Bruit anormal à froid', 'Entretien huile/courroie insuffisamment documenté'],
      kilometrage_apparition: '60 000 à 120 000 km',
      diagnostic: 'Contrôler visuellement l’état de la courroie selon la procédure constructeur, vérifier les vidanges et contrôler le circuit de lubrification.',
      piece_concernee: 'Courroie de distribution humide et circuit de lubrification',
      gravite: 'Majeure',
      frequence: 'Fréquent',
      cout_reparation_estime: '800 à 2 500 €',
    },
    en: {
      title: 'PureTech wet timing belt',
      symptomes: ['Oil-pressure warning', 'Abnormal cold-start noise', 'Poorly documented oil and belt service'],
      kilometrage_apparition: '60,000 to 120,000 km',
      diagnostic: 'Visually inspect the belt using the manufacturer procedure, verify oil changes and check the lubrication circuit.',
      piece_concernee: 'Wet timing belt and lubrication circuit',
      gravite: 'Major',
      frequence: 'Frequent',
      cout_reparation_estime: '€800 to €2,500',
    },
  },
  {
    id: 'ford-ecoboost-wet-belt',
    brand: 'Ford',
    models: ['Fiesta', 'Focus', 'EcoSport', 'Puma', 'B-Max', 'C-Max'],
    engineTerms: ['EcoBoost', '1.0'],
    years: [2012, 2020],
    fr: {
      title: 'Distribution 1.0 EcoBoost',
      symptomes: ['Bruit de courroie ou de poulie', 'Alerte de pression d’huile', 'Historique de vidange incomplet'],
      kilometrage_apparition: '80 000 à 160 000 km',
      diagnostic: 'Vérifier le plan d’entretien, l’état de la courroie et les particules dans l’huile selon le protocole Ford.',
      piece_concernee: 'Courroie de distribution et crépine de pompe à huile',
      gravite: 'Majeure',
      frequence: 'À surveiller',
      cout_reparation_estime: '900 à 2 800 €',
    },
    en: {
      title: '1.0 EcoBoost timing system',
      symptomes: ['Belt or pulley noise', 'Oil-pressure warning', 'Incomplete oil-service history'],
      kilometrage_apparition: '80,000 to 160,000 km',
      diagnostic: 'Verify the maintenance schedule, belt condition and debris in the oil under the Ford procedure.',
      piece_concernee: 'Timing belt and oil-pump pickup',
      gravite: 'Major',
      frequence: 'Monitor closely',
      cout_reparation_estime: '€900 to €2,800',
    },
  },
  {
    id: 'renault-h5ft-tce',
    brand: 'Renault|Dacia',
    models: ['Clio', 'Captur', 'Mégane', 'Megane', 'Scénic', 'Scenic', 'Kadjar', 'Duster'],
    engineTerms: ['1.2 TCe', 'H5Ft', 'H5FT'],
    years: [2012, 2018],
    fr: {
      title: 'Consommation d’huile 1.2 TCe',
      symptomes: ['Niveau d’huile qui baisse entre deux entretiens', 'Fumée bleutée ponctuelle', 'Voyant moteur ou ralenti irrégulier'],
      kilometrage_apparition: '50 000 à 120 000 km',
      diagnostic: 'Contrôler le niveau et l’historique de consommation d’huile, rechercher les fuites et demander un contrôle compression si nécessaire.',
      piece_concernee: 'Moteur 1.2 TCe H5Ft — segmentation et circuit de reniflard',
      gravite: 'Majeure',
      frequence: 'À surveiller',
      cout_reparation_estime: '600 à 4 000 € selon diagnostic',
    },
    en: {
      title: '1.2 TCe oil consumption',
      symptomes: ['Oil level drops between services', 'Occasional blue smoke', 'Engine warning or unstable idle'],
      kilometrage_apparition: '50,000 to 120,000 km',
      diagnostic: 'Check oil level and consumption history, inspect for leaks and request a compression test if required.',
      piece_concernee: '1.2 TCe H5Ft engine — piston rings and breather system',
      gravite: 'Major',
      frequence: 'Monitor closely',
      cout_reparation_estime: '€600 to €4,000 depending on diagnosis',
    },
  },
];

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function termsMatch(value, terms) {
  const source = normalize(value);
  return terms.some((term) => source.includes(normalize(term)));
}

/** Returns UI/PDF-ready warnings only for a sufficiently precise match. */
export function findModelSpecificAlerts({ brand, model, engine, year, language = 'fr' } = {}) {
  const selectedYear = Number.parseInt(year, 10);
  const locale = language === 'en' ? 'en' : 'fr';
  return MODEL_SPECIFIC_ALERTS
    .filter((rule) => String(rule.brand).split('|').some((candidate) => normalize(candidate) === normalize(brand)))
    .filter((rule) => termsMatch(model, rule.models))
    .filter((rule) => termsMatch(engine, rule.engineTerms))
    .filter((rule) => !Number.isFinite(selectedYear) || (selectedYear >= rule.years[0] && selectedYear <= rule.years[1]))
    .map((rule) => ({
      id: rule.id,
      marque: brand,
      modele: model,
      motorisation: engine,
      ...rule[locale],
    }));
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function isEligibleScenario() {
  return ['buyer', 'owner'].includes(document.querySelector('[name="usage_scenario"]:checked')?.value || '');
}

export function normalizeCatalogueAlerts(values) {
  if (!Array.isArray(values)) return [];
  const documented = (value) => {
    const text = String(value ?? '').trim();
    return Boolean(text) && !/^n\/?a(?:\b|\s*\()/i.test(text) && !/^(non renseigne|non documente|a confirmer)$/i.test(normalize(text));
  };
  const complete = (value) => value && typeof value === 'object'
    && documented(value.probleme || value.panne || value.description)
    && Array.isArray(value.symptomes) && value.symptomes.length && value.symptomes.every(documented)
    && documented(value.kilometrage_apparition || value.kilometrage_critique)
    && documented(value.diagnostic || value.methode_controle)
    && documented(value.piece_concernee || value.pieces_concernees)
    && documented(value.gravite) && documented(value.frequence)
    && documented(value.cout_reparation_estime || value.cout_estime_eur);
  return values.filter(complete).map((value, index) => ({
      id: `catalogue-${index}-${normalize(value.probleme || value.panne || value.description)}`,
      title: String(value.probleme || value.panne || value.description || 'Point de vigilance documenté'),
      symptomes: Array.isArray(value.symptomes) ? value.symptomes : (value.symptomes ? [value.symptomes] : []),
      kilometrage_apparition: String(value.kilometrage_apparition || value.kilometrage_critique || 'À confirmer selon l’historique'),
      diagnostic: String(value.diagnostic || value.methode_controle || 'Contrôle à confirmer selon la procédure constructeur.'),
      piece_concernee: String(value.piece_concernee || value.pieces_concernees || 'Composant à identifier'),
      gravite: String(value.gravite || 'À évaluer'),
      frequence: String(value.frequence || 'Non précisée'),
      cout_reparation_estime: String(value.cout_reparation_estime || value.cout_estime_eur || 'À chiffrer après diagnostic'),
    }));
}

function catalogueAlerts() {
  try {
    const values = JSON.parse(String(document.querySelector('input[name="motorisation_points_faibles"]')?.value || '[]'));
    return normalizeCatalogueAlerts(values);
  } catch { return []; }
}

export function initializeModelSpecificAlerts() {
  const container = document.getElementById('modelSpecificAlerts');
  const list = document.getElementById('modelSpecificAlertsList');
  const intro = document.getElementById('modelSpecificAlertsIntro');
  const field = document.querySelector('input[name="model_specific_alerts"]');
  const selects = ['marqueSelect', 'modeleSelect', 'generationSelect', 'anneeSelect', 'motorisationSelect']
    .map((id) => document.getElementById(id));
  if (!container || !list || !intro || !field || selects.some((select) => !select)) return;

  let lastNotified = '';
  const translate = (fr, en) => window.cardiagI18n?.language === 'en' ? en : fr;
  const update = () => {
    const [brand, model, chassis, year, engine] = selects.map((select) => select.value.trim());
    const complete = brand && model && chassis && year && engine;
    const genericAlerts = complete && isEligibleScenario()
      ? findModelSpecificAlerts({ brand, model, engine, year, language: window.cardiagI18n?.language })
      : [];
    // The detailed weaknesses embedded in the selected engine record use the
    // same visible card and PDF annex as the curated cross-model rules.
    const alerts = isEligibleScenario() ? [...catalogueAlerts(), ...genericAlerts] : [];
    field.value = alerts.length ? JSON.stringify(alerts) : '';
    field.dispatchEvent(new Event('change', { bubbles: true }));
    list.replaceChildren();
    if (!alerts.length) {
      container.hidden = true;
      lastNotified = '';
      return;
    }
    intro.textContent = translate(
      'Ces points de vigilance sont issus de la base de connaissances pour la combinaison sélectionnée. Ils doivent être confirmés par les contrôles terrain et l’historique d’entretien.',
      'These watch points come from the knowledge base for the selected combination. They must be confirmed with field checks and the maintenance history.',
    );
    list.innerHTML = alerts.map((alert) => `
      <article class="model-specific-alert-card">
        <h4>${escapeHtml(alert.title)}</h4>
        <dl>
          <dt>${translate('Symptômes', 'Symptoms')}</dt><dd><ul>${alert.symptomes.map((symptom) => `<li>${escapeHtml(symptom)}</li>`).join('')}</ul></dd>
          <dt>${translate('Apparition', 'Typical mileage')}</dt><dd>${escapeHtml(alert.kilometrage_apparition)}</dd>
          <dt>${translate('Contrôle conseillé', 'Recommended check')}</dt><dd>${escapeHtml(alert.diagnostic)}</dd>
          <dt>${translate('Pièce concernée', 'Affected component')}</dt><dd>${escapeHtml(alert.piece_concernee)}</dd>
          <dt>${translate('Gravité / fréquence', 'Severity / frequency')}</dt><dd>${escapeHtml(alert.gravite)} · ${escapeHtml(alert.frequence)}</dd>
          <dt>${translate('Coût estimé', 'Estimated repair cost')}</dt><dd>${escapeHtml(alert.cout_reparation_estime)}</dd>
        </dl>
      </article>`).join('');
    const signature = alerts.map((alert) => alert.id).join('|');
    if (signature !== lastNotified) {
      window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', { detail: { type: 'selection', message: translate('Point(s) de vigilance spécifique(s) ajouté(s) à votre fiche et au rapport PDF.', 'Model-specific watch point(s) added to your record and PDF report.') } }));
      lastNotified = signature;
    }
    container.hidden = false;
  };
  selects.forEach((select) => select.addEventListener('change', () => queueMicrotask(update)));
  window.addEventListener('cardiag:scenario-change', update);
  window.addEventListener('cardiag:record-open', () => queueMicrotask(update));
  window.addEventListener('cardiag:new-vehicle', () => queueMicrotask(update));
  window.addEventListener('cardiag:language-change', update);
  update();
}
