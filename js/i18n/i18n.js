const SETTINGS_KEY = 'cardiag_app_settings_v1';

const EN = {
  'wizard.profile': 'Your goal',
  'wizard.vehicle': 'Vehicle identification',
  'wizard.context': 'Case context',
  'wizard.expertise': 'Inspection and summary',
  'wizard.next': 'Next',
  'wizard.start': 'Start',
  'wizard.inspect': 'Start inspection',
  'wizard.generate': 'Generate report',
  'wizard.back': 'Back',
  'wizard.step': 'Step {step} of {total} · {title}',
  'vehiclePicker.title': 'Choose a saved vehicle',
  'vehiclePicker.intro': 'Reuse an existing vehicle or create a new report.',
  'vehiclePicker.add': '＋ Add a new vehicle',
  'vehiclePicker.empty': 'No saved vehicle yet. Add your first vehicle below.',
  'vehiclePicker.saved': 'Saved vehicle',
  'vehiclePicker.active': 'Current',
  'vehiclePicker.compareChoose': 'Choose another vehicle',
  'vehiclePicker.compare': 'Compare with another vehicle',
  'vehiclePicker.compareIntro': 'Add a second vehicle to your pre-purchase analysis.',
  'vehiclePicker.compareRun': 'View comparison',
  'profile.heading': 'What would you like to do today?',
  'profile.intro': 'The checklist, assistant and final report adapt automatically to your situation.',
  'profile.buyer': 'Buyer',
  'profile.buyer.description': 'Inspect a vehicle before purchase, identify risks and prepare the negotiation.',
  'profile.mechanic': 'Mechanic',
  'profile.mechanic.description': 'Document the initial condition and customer complaint before workshop intake.',
  'profile.seller': 'Seller',
  'profile.seller.description': 'Create a transparent, complete report to share with a future buyer.',
  'profile.owner': 'Owner',
  'profile.owner.description': 'Track the vehicle, understand faults and perform simple checks safely.',
  'context.heading': 'Describe your situation',
  'context.buyer': 'Add the listing details and seller statements to frame the pre-purchase audit.',
  'context.mechanic': 'Record the customer complaint and initial data before clearing faults, dismantling or repairs.',
  'context.seller': 'Document maintenance, repairs and known defects as transparently as possible.',
  'context.owner': 'Describe how the vehicle behaves to build a useful long-term health record.',
  'expertise.kicker': 'FIELD INSPECTION',
  'expertise.title': 'Complete the vehicle report',
  'expertise.description': 'Record each verified item. The final report can be generated without using the assistant.',
  'assistant.kicker': 'OPTIONAL ASSISTANT',
  'assistant.question': 'Do you have any questions?',
  'assistant.description': 'The report is ready. Ask a question only if you want help interpreting a result.',
  'assistant.open': 'Open assistant',
  'records.title': 'My reports',
  'records.new': '＋ New inspection',
  'records.open': 'Open',
  'records.download': 'Download PDF',
  'records.empty': 'No saved report yet.',
  'report.choose': 'What would you like to do with the report?',
  'report.download': 'Download PDF',
  'report.share': 'Share PDF',
  'report.link': 'Share a private link',
  'report.cancel': 'Cancel',
  'report.short': 'Print summary',
  'settings.language': 'Language',
  'chat.title': 'Investigation console',
  'chat.placeholder': 'Symptom, measurement, fault code or inspection result…',
  'chat.submit': 'Analyze →',
};

function readSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
}

let language = 'fr';

export function t(key, fallback = key, variables = {}) {
  const template = language === 'en' ? (EN[key] || fallback) : fallback;
  return String(template).replace(/\{(\w+)\}/g, (_, name) => variables[name] ?? '');
}

export function currentLanguage() { return language; }

function setText(selector, key, fallback) {
  const element = document.querySelector(selector);
  if (element) element.textContent = t(key, fallback);
}

export function applyTranslations() {
  document.documentElement.lang = language;
  setText('#usageScenarioTitle', 'profile.heading', 'Quel est votre objectif ?');
  setText('.usage-scenario-head > p:last-child', 'profile.intro', 'Le questionnaire, l’assistant et la synthèse s’adaptent automatiquement à votre situation.');
  setText('#profileContextTitle', 'context.heading', 'Précisez votre situation');
  setText('#chatPanel .diagnostic-console-head h2', 'chat.title', "Console d'investigation");
  const chatInput = document.getElementById('chatInput');
  if (chatInput) chatInput.placeholder = t('chat.placeholder', 'Symptôme, mesure, code défaut ou résultat de contrôle…');
  setText('#chatForm .analyze-button', 'chat.submit', 'Analyser →');

  const profiles = {
    buyer: ['profile.buyer', 'Acheteur', 'profile.buyer.description', 'Contrôler le véhicule avant achat, détecter les risques et préparer la négociation.'],
    mechanic: ['profile.mechanic', 'Garagiste', 'profile.mechanic.description', 'Documenter l’état initial et la plainte client avant la prise en charge en atelier.'],
    seller: ['profile.seller', 'Vendeur', 'profile.seller.description', 'Créer un rapport transparent et complet à transmettre à un futur acheteur.'],
    owner: ['profile.owner', 'Propriétaire', 'profile.owner.description', 'Suivre le véhicule, comprendre ses problèmes et effectuer les contrôles simples en sécurité.'],
  };
  Object.entries(profiles).forEach(([profile, values]) => {
    const card = document.querySelector(`[name="usage_scenario"][value="${profile}"]`)?.closest('.usage-scenario-card');
    if (!card) return;
    const strong = card.querySelector('strong');
    const description = card.querySelector('strong + span');
    if (strong) strong.textContent = t(values[0], values[1]);
    if (description) description.textContent = t(values[2], values[3]);
  });

  const fieldLabels = {
    annonce_url: ['Lien de l’annonce', 'Listing URL'], seller_claims: ['Informations annoncées par le vendeur', 'Information provided by the seller'],
    client_complaint: ['Plainte exacte du client', 'Exact customer complaint'], symptom_conditions: ['Conditions d’apparition', 'Operating conditions'],
    measured_values: ['Valeurs déjà mesurées', 'Measurements already taken'], work_authorization: ['Périmètre autorisé', 'Authorized work scope'],
    maintenance_history: ['Historique d’entretien justifiable', 'Documented maintenance history'], recent_repairs: ['Réparations récentes', 'Recent repairs'],
    known_defects: ['Défauts connus à déclarer', 'Known defects to disclose'], report_documents: ['Pièces disponibles pour le rapport', 'Documents available for the report'],
    owner_symptoms: ['Symptômes constatés', 'Observed symptoms'], symptom_history: ['Évolution du problème', 'Symptom history'],
    maintenance_log: ['Derniers entretiens ou réparations', 'Latest maintenance or repairs'], diy_level: ['Niveau d’autonomie', 'DIY experience level'],
    kilometrage: ['Kilométrage', 'Mileage'], vin: ['N° VIN / Immatriculation', 'VIN / registration'], valeur: ['Valeur affichée / négociée (€)', 'Advertised / negotiated price (€)'],
    frais_estimation: ['Frais de remise en état estimés (€)', 'Estimated repair costs (€)'], marge_negociation: ['Marge de négociation suggérée (€)', 'Suggested negotiation margin (€)'],
    budget_max: ['Budget maximum disponible (€)', 'Maximum available budget (€)'],
  };
  Object.entries(fieldLabels).forEach(([name, labels]) => {
    const label = document.querySelector(`[name="${name}"]`)?.closest('.field')?.querySelector('label');
    if (!label) return;
    const required = label.querySelector('.req-star')?.outerHTML || '';
    label.innerHTML = `${language === 'en' ? labels[1] : labels[0]}${required ? ` ${required}` : ''}`;
  });

  setText('#generateBtn', 'wizard.generate', '📄 Générer le rapport');
  setText('#shortPrintBtn', 'report.short', 'Imprimer la synthèse');

  window.dispatchEvent(new CustomEvent('cardiag:i18n-applied', { detail: { language } }));
}

export function setLanguage(nextLanguage) {
  language = nextLanguage === 'en' ? 'en' : 'fr';
  applyTranslations();
  window.dispatchEvent(new CustomEvent('cardiag:language-change', { detail: { language } }));
}

export function initializeI18n() {
  const saved = readSettings().language;
  const system = String(navigator.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
  language = saved === 'auto' ? system : saved === 'en' ? 'en' : 'fr';
  window.cardiagI18n = { t, setLanguage, get language() { return language; } };
  applyTranslations();
}
