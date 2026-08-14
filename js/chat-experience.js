const MAX_MESSAGES = 30;
const RENDER_API_URL = 'https://fiche-expert-auto.onrender.com/';
const IS_NATIVE_APP = window.Capacitor?.isNativePlatform?.() === true;
const API_BASE_URL = !IS_NATIVE_APP && (['localhost', '127.0.0.1'].includes(window.location.hostname)
  || window.location.hostname.endsWith('.onrender.com')
  ) ? `${window.location.origin}/`
  : RENDER_API_URL;
const API_TIMEOUT_MS = 60_000;
const USAGE_SCENARIOS = {
  buyer: {
    label: 'Acheteur — contrôle avant achat',
    eyebrow: 'Contrôle terrain • Achat de véhicule d’occasion',
    subtitle: 'Vérifiez les organes critiques, identifiez les risques et préparez une décision d’achat argumentée.',
    reportTitle: 'Rapport d’aide à l’achat',
    context: 'Inspection guidée avant achat : risques, contrôles prioritaires et éléments de négociation.',
    placeholder: 'Défaut observé, point à vérifier, code OBD ou réponse du vendeur…',
    options: ['Démarrage à froid', 'Historique d’entretien incomplet', 'Voyant moteur allumé', 'Bruit moteur anormal', 'Fumée à l’échappement', 'Traces d’accident', 'Essai routier anormal', 'Codes OBD effacés'],
  },
  mechanic: {
    label: 'Garagiste — prise en charge atelier',
    eyebrow: 'Atelier • État initial contradictoire',
    subtitle: 'Consignez la plainte client, l’état d’entrée, les codes et les premières mesures avant intervention.',
    reportTitle: 'Rapport de prise en charge',
    context: 'État initial contradictoire, plainte client, codes et premières mesures avant intervention.',
    placeholder: 'Plainte client, condition d’apparition, code défaut ou première mesure…',
    options: ['Consigner la plainte client', 'Relever les codes défaut', 'État initial carrosserie', 'Bruit à reproduire', 'Fuite ou niveau anormal', 'Démarrage difficile', 'Vibrations ou à-coups', 'Intervention antérieure'],
  },
  rental: {
    label: 'Agence de location — gestion de flotte',
    eyebrow: 'FLOTTE · ÉTAT AVANT / APRÈS LOCATION',
    subtitle: 'Comparez le kilométrage, les niveaux et l’état précis du véhicule entre le départ et le retour.',
    reportTitle: 'Rapport de suivi de location',
    context: 'Traçabilité de flotte : état contradictoire, kilométrage, énergie, dommages nouveaux et actions requises.',
    placeholder: 'Dommage, écart kilométrique, voyant, niveau ou anomalie constatée au retour…',
    options: ['État avant location', 'État au retour', 'Kilométrage départ / retour', 'Niveau carburant ou charge', 'Nouveau dommage carrosserie', 'Jante ou pneu endommagé', 'Voyant apparu pendant la location', 'Accessoire manquant'],
  },
  seller: {
    label: 'Vendeur — rapport avant vente',
    eyebrow: 'Transparence • Dossier avant vente',
    subtitle: 'Documentez objectivement l’entretien, les contrôles et les défauts connus à transmettre à l’acheteur.',
    reportTitle: 'Rapport de transparence vendeur',
    context: 'Dossier factuel à transmettre : état, entretien, défauts connus et contrôles réalisés.',
    placeholder: 'Entretien effectué, défaut connu, réparation, mesure ou document disponible…',
    options: ['Créer un état général', 'Ajouter l’historique d’entretien', 'Déclarer un défaut connu', 'Ajouter une réparation récente', 'Contrôler les voyants', 'Ajouter les codes OBD', 'Documenter les pneus et freins', 'Préparer les photos du rapport'],
  },
  owner: {
    label: 'Propriétaire — suivi du véhicule',
    eyebrow: 'Carnet de bord • Suivi technique',
    subtitle: 'Conservez l’historique, comprenez les symptômes et réalisez les vérifications simples en sécurité.',
    reportTitle: 'Carnet de suivi technique',
    context: 'Comprendre un problème, conserver son évolution et réaliser uniquement les contrôles accessibles en sécurité.',
    placeholder: 'Décrivez ce que vous voyez, entendez ou ressentez et quand cela arrive…',
    options: ['Voyant moteur allumé', 'Démarrage difficile', 'Bruit nouveau', 'Perte de puissance', 'Fumée ou odeur', 'Consommation anormale', 'Vibrations ou à-coups', 'Ajouter une opération d’entretien'],
  },
};

const USAGE_SCENARIOS_EN = {
  buyer: {
    label: 'Buyer — pre-purchase inspection',
    eyebrow: 'FIELD CHECK · USED-VEHICLE PURCHASE',
    subtitle: 'Check critical components, identify risks and prepare a documented purchase decision.',
    reportTitle: 'Pre-purchase inspection report',
    context: 'Guided pre-purchase inspection: risks, priority checks and negotiation points.',
    placeholder: 'Observed fault, item to check, OBD code or seller statement…',
    options: ['Cold start', 'Incomplete service history', 'Check-engine light on', 'Abnormal engine noise', 'Exhaust smoke', 'Signs of collision', 'Abnormal road test', 'Cleared OBD codes'],
  },
  mechanic: {
    label: 'Mechanic — workshop intake',
    eyebrow: 'WORKSHOP · INITIAL CONDITION REPORT',
    subtitle: 'Record the customer complaint, intake condition, codes and first measurements before work begins.',
    reportTitle: 'Workshop intake report',
    context: 'Initial condition, customer complaint, fault codes and first measurements before any repair.',
    placeholder: 'Customer complaint, occurrence conditions, fault code or first measurement…',
    options: ['Record the customer complaint', 'Read fault codes', 'Initial bodywork condition', 'Noise to reproduce', 'Leak or abnormal level', 'Difficult starting', 'Vibration or jerking', 'Previous repair'],
  },
  rental: {
    label: 'Rental agency — fleet management',
    eyebrow: 'FLEET · PRE / POST-RENTAL CONDITION',
    subtitle: 'Compare mileage, levels and the precise vehicle condition between check-out and return.',
    reportTitle: 'Rental tracking report',
    context: 'Fleet traceability: condition report, mileage, energy, new damage and required action.',
    placeholder: 'Damage, mileage discrepancy, warning light, level or issue found on return…',
    options: ['Pre-rental condition', 'Return condition', 'Check-out / return mileage', 'Fuel or charge level', 'New bodywork damage', 'Damaged wheel or tyre', 'Warning light during rental', 'Missing accessory'],
  },
  seller: {
    label: 'Seller — pre-sale report',
    eyebrow: 'TRANSPARENCY · PRE-SALE FILE',
    subtitle: 'Document maintenance, checks and known faults objectively for the future buyer.',
    reportTitle: 'Seller transparency report',
    context: 'Factual file to share: condition, servicing, known faults and completed checks.',
    placeholder: 'Completed maintenance, known fault, repair, measurement or available document…',
    options: ['Create an overall condition report', 'Add service history', 'Disclose a known fault', 'Add a recent repair', 'Check warning lights', 'Add OBD codes', 'Document tyres and brakes', 'Prepare report photos'],
  },
  owner: {
    label: 'Owner — vehicle monitoring',
    eyebrow: 'VEHICLE LOG · TECHNICAL MONITORING',
    subtitle: 'Keep the history, understand symptoms and carry out simple checks safely.',
    reportTitle: 'Vehicle health record',
    context: 'Understand a problem, track its development and perform only checks that are safely accessible.',
    placeholder: 'Describe what you see, hear or feel and when it occurs…',
    options: ['Check-engine light on', 'Difficult starting', 'New noise', 'Loss of power', 'Smoke or smell', 'Abnormal consumption', 'Vibration or jerking', 'Add a maintenance operation'],
  },
};

function isEnglish() {
  return window.cardiagI18n?.language === 'en';
}

function selectedUsageScenario() {
  return document.querySelector('[name="usage_scenario"]:checked')?.value || 'buyer';
}

function usageScenarioConfig() {
  const scenarios = isEnglish() ? USAGE_SCENARIOS_EN : USAGE_SCENARIOS;
  return scenarios[selectedUsageScenario()] || scenarios.buyer;
}

function carContext() {
  const selectOrManual = (selectId, manualId) => {
    const manualValue = document.getElementById(manualId)?.value.trim();
    return manualValue || document.getElementById(selectId)?.value || '';
  };

  const fieldValue = (name) => document.querySelector(`[name="${name}"]`)?.value?.trim?.() || '';
  return {
    marque: selectOrManual('marqueSelect', 'marqueManualInput'),
    modele: selectOrManual('modeleSelect', 'modeleManualInput'),
    generation: document.getElementById('generationSelect')?.value || '',
    annee: document.getElementById('anneeSelect')?.value || '',
    motorisation: selectOrManual('motorisationSelect', 'motorisationManualInput'),
    vin: document.querySelector('[name="vin"]')?.value.trim() || '',
    usageScenario: selectedUsageScenario(),
    language: window.cardiagI18n?.language === 'en' ? 'en' : 'fr',
    workOrderReference: fieldValue('work_order_reference'),
    intakeMileage: fieldValue('intake_mileage'),
    releaseMileage: fieldValue('release_mileage'),
    intakeCondition: fieldValue('mechanic_intake_condition'),
    repairWorkCompleted: fieldValue('repair_work_completed'),
    postRepairChecks: fieldValue('post_repair_checks'),
    releaseCondition: fieldValue('mechanic_release_condition'),
    fleetVehicleId: fieldValue('fleet_vehicle_id'),
    rentalContractReference: fieldValue('rental_contract_reference'),
    rentalStart: fieldValue('rental_start'),
    rentalEnd: fieldValue('rental_end'),
    rentalMileageOut: fieldValue('rental_mileage_out'),
    rentalMileageIn: fieldValue('rental_mileage_in'),
    rentalEnergyOut: fieldValue('rental_energy_out'),
    rentalEnergyIn: fieldValue('rental_energy_in'),
    rentalConditionOut: fieldValue('rental_condition_out'),
    rentalConditionIn: fieldValue('rental_condition_in'),
    rentalDamageDelta: fieldValue('rental_damage_delta'),
  };
}

function canUseAssistant() {
  const context = carContext();
  return [context.marque, context.modele, context.motorisation].every(Boolean);
}

function formatActiveVehicle() {
  const context = carContext();
  return [context.marque, context.modele, context.annee ? `(${context.annee})` : '', context.motorisation].filter(Boolean).join(' ') || (isEnglish() ? 'Not provided' : 'Non renseigné');
}

function getCheckItemState(element) {
  const item = element?.closest('.check-item');
  if (!item) return 'Non renseigné';
  const checked = item.querySelector('.badge-group input[type="radio"]:checked');
  if (!checked) return 'Non renseigné';
  const label = item.querySelector(`label[for="${checked.id}"]`);
  return label?.textContent.trim() || checked.value;
}

function buildCombinedPrompt(pointDeControle, etat) {
  if (isEnglish()) return `Vehicle: ${formatActiveVehicle()}. Inspection item: ${pointDeControle}. Status: ${etat}. Explain how to check it on this exact model.`;
  return `Véhicule : ${formatActiveVehicle()}. Point de contrôle : ${pointDeControle}. État : ${etat}. Explique-moi comment vérifier cela sur ce modèle précis.`;
}

function vehicleContextMessage() {
  return isEnglish()
    ? 'Select the make, model and powertrain to receive a vehicle-specific answer.'
    : 'Sélectionnez la marque, le modèle et la motorisation pour obtenir une réponse spécifique à votre véhicule.';
}

async function request(path, body) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(`${API_BASE_URL}${path.replace(/^\//, '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) return payload;

      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt === 0) {
        const retryAfterSeconds = Number.parseInt(response.headers.get('Retry-After') || '0', 10);
        const delay = Math.min(Math.max(retryAfterSeconds * 1000, 1500), 5000);
        await new Promise((resolve) => window.setTimeout(resolve, delay));
        continue;
      }

      const error = new Error(payload.error || `Le service est indisponible (erreur ${response.status}).`);
      error.code = payload.code;
      throw error;
    }
    throw new Error('Le service reste indisponible après une nouvelle tentative.');
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Le service met trop de temps à répondre. Il peut être en cours de démarrage : réessayez dans quelques instants.');
    }
    if (error instanceof TypeError) {
      throw new Error('Impossible de joindre le service de diagnostic. Vérifiez votre connexion puis réessayez.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function appendMessage(list, role, content) {
  const message = document.createElement('article');
  message.className = `chat-message chat-message-${role}`;
  message.textContent = content;
  list.appendChild(message);
  list.scrollTop = list.scrollHeight;
  return message;
}

function parseChatResponse(raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || typeof data !== 'object') return null;
    if (data.type === 'question' || data.type === 'message') {
      return {
        type: data.type,
        content: String(data.content || '').trim(),
        suggestions: normalizeSuggestionList(data.suggestions),
      };
    }
    if (data.type === 'report') {
      return {
        type: 'report',
        content: String(data.content || '').trim(),
        vehicle: String(data.vehicle || '').trim(),
        fault_code: String(data.fault_code || '').trim(),
        root_cause: String(data.root_cause || '').trim(),
        action_plan: String(data.action_plan || '').trim(),
        confidence: ['preliminary', 'probable', 'confirmed'].includes(data.confidence)
          ? data.confidence
          : 'probable',
        suggestions: normalizeSuggestionList(data.suggestions),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeSuggestionList(suggestions, limit = 4) {
  if (!Array.isArray(suggestions)) return [];
  return [...new Set(suggestions
    .filter((suggestion) => typeof suggestion === 'string')
    .map((suggestion) => suggestion.trim().slice(0, 120))
    .filter(Boolean))]
    .slice(0, limit);
}

function splitActionPlan(plan) {
  const normalized = String(plan || '').trim();
  if (!normalized) return [];

  const numberedSteps = normalized
    .split(/\n+|\s+(?=\d+[.)]\s+)/)
    .map((step) => step.replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean);

  if (/^\d+[.)]\s*/.test(normalized) || numberedSteps.length > 1) {
    return numberedSteps;
  }

  return normalized
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/)
    .map((step) => step.trim())
    .filter(Boolean);
}

function reportCard(label, value, className = '', full = false) {
  const card = document.createElement('article');
  card.className = `report-card ${className} ${full ? 'full' : ''}`.trim();
  const title = document.createElement('p');
  title.className = 'report-label';
  title.textContent = label;
  const content = document.createElement('p');
  content.className = 'report-value';
  content.textContent = value || (isEnglish() ? 'Not provided' : 'Non renseigné');
  card.append(title, content);
  return card;
}

function renderReport(target, data) {
  target.replaceChildren();
  const grid = document.createElement('section');
  grid.className = 'report-grid';
  const summary = document.createElement('p');
  summary.className = 'report-summary';
  const summaryLabels = isEnglish() ? {
    preliminary: 'PRELIMINARY TECHNICAL SUMMARY', probable: 'PROBABLE CAUSE — LIVE SUMMARY', confirmed: 'ROOT CAUSE CONFIRMED',
  } : {
    preliminary: 'SYNTHÈSE TECHNIQUE PROVISOIRE', probable: 'CAUSE PROBABLE — SYNTHÈSE ÉVOLUTIVE', confirmed: 'CAUSE RACINE CONFIRMÉE',
  };
  summary.textContent = summaryLabels[data.confidence] || summaryLabels.probable;
  const scenario = usageScenarioConfig();
  grid.append(summary, reportCard(isEnglish() ? 'REPORT PURPOSE' : 'OBJECTIF DU DOSSIER', scenario.label, '', true));
  grid.append(reportCard(isEnglish() ? 'VEHICLE' : 'VÉHICULE', data.vehicle, '', true));
  const fault = reportCard(isEnglish() ? 'FAULT CODE' : 'CODE DÉFAUT', data.fault_code, 'fault');
  fault.querySelector('.report-value').className = 'fault-code';
  grid.append(fault, reportCard(isEnglish() ? 'SYSTEM STATUS' : 'ÉTAT SYSTÈME', isEnglish() ? 'Issue to confirm after inspection' : 'Anomalie à confirmer après contrôle', 'warning'));
  grid.append(reportCard(isEnglish() ? 'ROOT CAUSE' : 'CAUSE RACINE', data.root_cause, 'fault', true));
  const plan = document.createElement('article');
  plan.className = 'report-card full warning';
  const planTitle = document.createElement('p');
  planTitle.className = 'report-label';
  planTitle.textContent = isEnglish() ? 'WORKSHOP ACTION PLAN' : "PLAN D'ACTION ATELIER";
  const list = document.createElement('ol');
  list.className = 'plan-list';
  const steps = splitActionPlan(data.action_plan);
  (steps.length ? steps : [isEnglish() ? 'No detailed operation provided.' : 'Aucune opération détaillée fournie.']).forEach((step) => {
    const item = document.createElement('li');
    item.textContent = step;
    list.append(item);
  });
  plan.append(planTitle, list);
  grid.append(plan);
  target.append(grid);
}

function reportHistoryContent(data) {
  return [
    data.content,
    `Synthèse technique (${data.confidence})`,
    `Objectif du dossier : ${usageScenarioConfig().label}`,
    `Véhicule : ${data.vehicle}`,
    `Code défaut : ${data.fault_code}`,
    `Cause/hypothèses : ${data.root_cause}`,
    `Plan de tests : ${data.action_plan}`,
  ].filter(Boolean).join('\n');
}

function waitingReport() {
  const scenario = usageScenarioConfig();
  const state = document.createElement('div');
  state.className = 'waiting-state';
  state.innerHTML = `<div class="radar" aria-hidden="true"><span></span></div><p class="waiting-kicker">${scenario.reportTitle.toUpperCase()}</p><h3>${isEnglish() ? 'Start your report' : 'Commencez votre dossier'}</h3><p>${scenario.context}</p>`;
  return state;
}

function renderSafeInline(target, html) {
  const allowed = new Set(['STRONG', 'EM', 'CODE', 'BR', 'UL', 'OL', 'LI']);
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const fragment = document.createDocumentFragment();

  function copy(node, parent) {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(document.createTextNode(node.textContent));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (!allowed.has(node.tagName)) {
        node.childNodes.forEach((child) => copy(child, parent));
        return;
      }
      const safeNode = document.createElement(node.tagName.toLowerCase());
      node.childNodes.forEach((child) => copy(child, safeNode));
      parent.appendChild(safeNode);
    }
  }

  parsed.body.childNodes.forEach((node) => copy(node, fragment));
  target.replaceChildren(fragment);
}

export function initializeChatExperience() {
  const toggles = document.querySelectorAll('[data-chat-toggle]');
  const panel = document.getElementById('chatPanel');
  const close = document.getElementById('chatClose');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const messagesElement = document.getElementById('chatMessages');
  const suggestionsElement = document.getElementById('chatSuggestions');
  const status = document.getElementById('chatStatus');
  const reportContent = document.getElementById('reportContent');
  const reset = document.getElementById('chatReset');
  const vehicleReadout = document.getElementById('diagnosticVehicleReadout');
  const scenarioContext = document.getElementById('diagnosticScenarioContext');
  const reportKicker = document.getElementById('diagnosticReportKicker');
  const reportTitle = document.getElementById('diagnosticReportTitle');
  const appEyebrow = document.getElementById('appScenarioEyebrow');
  const appSubtitle = document.getElementById('appScenarioSubtitle');
  const inline = document.getElementById('inlineAssistant');
  const inlineText = document.getElementById('inlineAssistantText');
  const inlineClose = document.getElementById('inlineAssistantClose');
  const inlineAsk = document.getElementById('inlineAssistantAsk');
  const submitButton = form.querySelector('button[type="submit"]');
  let messages = [];
  let selectedText = '';
  let inlineContextElement = null;

  if (!toggles.length || !panel || !form || !input || !messagesElement || !suggestionsElement || !status || !reportContent || !inline || !inlineText) return;

  function renderSuggestions(options = [], initial = false) {
    suggestionsElement.replaceChildren();
    const normalizedOptions = normalizeSuggestionList(options, initial ? 8 : 4);
    const heading = document.createElement('p');
    heading.className = 'chat-suggestions-label';
    heading.textContent = initial
      ? (isEnglish() ? 'Choose a common symptom or describe it in your own words' : 'Choisissez un symptôme fréquent ou décrivez-le avec vos mots')
      : (isEnglish() ? 'Suggested answers' : 'Réponses proposées');
    suggestionsElement.append(heading);

    const choices = document.createElement('div');
    choices.className = 'chat-suggestion-list';
    normalizedOptions.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chat-suggestion-chip';
      button.textContent = option;
      button.addEventListener('click', () => {
        input.value = option;
        form.requestSubmit();
      });
      choices.append(button);
    });

    const customButton = document.createElement('button');
    customButton.type = 'button';
    customButton.className = 'chat-suggestion-chip chat-suggestion-custom';
    customButton.textContent = isEnglish() ? '✎ Describe another symptom' : '✎ Décrire un autre symptôme';
    customButton.addEventListener('click', () => {
      input.value = '';
      input.placeholder = isEnglish() ? 'Describe freely what you see, hear or feel…' : 'Décrivez librement ce que vous voyez, entendez ou ressentez…';
      input.focus();
    });
    choices.append(customButton);
    suggestionsElement.append(choices);
  }

  function showInitialSuggestions() {
    renderSuggestions(usageScenarioConfig().options, true);
  }

  function applyUsageScenario() {
    const scenario = usageScenarioConfig();
    document.body.dataset.usageScenario = selectedUsageScenario();
    if (scenarioContext) scenarioContext.textContent = scenario.context;
    if (reportKicker) reportKicker.textContent = scenario.label.toUpperCase();
    if (reportTitle) reportTitle.textContent = scenario.reportTitle;
    if (appEyebrow) appEyebrow.textContent = scenario.eyebrow;
    if (appSubtitle) appSubtitle.textContent = scenario.subtitle;
    input.placeholder = scenario.placeholder;
    if (!messages.length) {
      showInitialSuggestions();
      reportContent.replaceChildren(waitingReport());
    }
    updateVehicleReadout();
  }

  function updateVehicleReadout() {
    const context = carContext();
    const title = [context.marque, context.modele, context.annee ? `(${context.annee})` : '', context.motorisation].filter(Boolean).join(' · ');
    vehicleReadout.textContent = title
      ? `${usageScenarioConfig().label} · ${isEnglish() ? 'Active vehicle' : 'Véhicule actif'} : ${title}`
      : `${usageScenarioConfig().label} · ${isEnglish() ? 'Select a vehicle in the report' : 'Véhicule à sélectionner dans la fiche'}`;
  }

  function openPanel() {
    panel.hidden = false;
    updateVehicleReadout();
    if (!messages.length && !suggestionsElement.childElementCount) showInitialSuggestions();
    input.focus();
  }

  toggles.forEach((toggle) => toggle.addEventListener('click', openPanel));
  window.addEventListener('cardiag:scenario-change', applyUsageScenario);
  window.addEventListener('cardiag:language-change', applyUsageScenario);
  close?.addEventListener('click', () => { panel.hidden = true; });
  reset?.addEventListener('click', () => {
    messages = [];
    messagesElement.replaceChildren();
    showInitialSuggestions();
    reportContent.replaceChildren(waitingReport());
    input.disabled = false;
    submitButton.disabled = false;
    status.textContent = '';
    updateVehicleReadout();
    input.focus();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    panel.hidden = false;
    const content = input.value.trim();
    if (!content) return;
    if (!canUseAssistant()) {
      status.textContent = vehicleContextMessage();
      return;
    }

    input.value = '';
    suggestionsElement.replaceChildren();
    appendMessage(messagesElement, 'user', content);
    const promptCombine = buildCombinedPrompt(content, 'Général');
    messages.push({ role: 'user', content: promptCombine });
    messages = messages.slice(-MAX_MESSAGES);
    const pendingMessage = appendMessage(messagesElement, 'assistant', 'Analyse des schémas électriques en cours…');
    pendingMessage.classList.add('chat-message-pending');
    const thinkingSteps = [
      'Analyse des schémas électriques en cours…',
      'Recoupement des symptômes et des mesures…',
      'Préparation du prochain contrôle atelier…',
    ];
    let thinkingStep = 0;
    const thinkingTimer = window.setInterval(() => {
      thinkingStep = (thinkingStep + 1) % thinkingSteps.length;
      pendingMessage.textContent = thinkingSteps[thinkingStep];
      messagesElement.scrollTop = messagesElement.scrollHeight;
    }, 2_500);
    status.textContent = 'L’assistant prépare une réponse spécifique à votre véhicule.';
    submitButton.disabled = true;
    messagesElement.setAttribute('aria-busy', 'true');
    try {
      const raw = await request('/api/chat', { messages, carContext: carContext() });
      const data = parseChatResponse(raw);
      pendingMessage.classList.remove('chat-message-pending');
      if (!data) {
        throw new Error('La réponse de l’IA est mal formatée.');
      }
      if (data.type === 'message' || data.type === 'question') {
        renderSafeInline(pendingMessage, data.content);
        messages.push({ role: 'assistant', content: data.content });
        messages = messages.slice(-MAX_MESSAGES);
        status.textContent = data.type === 'question'
          ? 'Contrôle complémentaire requis avant d’établir le rapport.'
          : 'Réponse adaptée à votre véhicule.';
        renderSuggestions(data.suggestions);
      } else if (data.type === 'report') {
        const assistantContent = data.content
          || 'Synthèse technique mise à jour. Ajoutez une observation ou une mesure pour poursuivre l’analyse.';
        renderSafeInline(pendingMessage, assistantContent);
        messages.push({ role: 'assistant', content: reportHistoryContent(data) });
        messages = messages.slice(-MAX_MESSAGES);
        renderReport(reportContent, data);
        input.disabled = false;
        status.textContent = data.confidence === 'confirmed'
          ? 'Cause racine confirmée. Vous pouvez encore ajouter une mesure pour documenter le dossier.'
          : 'Synthèse technique mise à jour. Ajoutez vos observations pour affiner la cause racine.';
        renderSuggestions(data.suggestions);
      } else {
        throw new Error('Format de réponse IA non reconnu.');
      }
    } catch (error) {
      pendingMessage.textContent = `Réponse non disponible : ${error.message}`;
      pendingMessage.classList.remove('chat-message-pending');
      pendingMessage.classList.add('chat-message-error');
      status.textContent = error.code === 'LLM_RATE_LIMITED'
        ? 'Quota Gemini atteint. Patientez avant de relancer la même analyse.'
        : 'Vous pouvez réessayer dans quelques instants.';
      renderSuggestions([], false);
    } finally {
      window.clearInterval(thinkingTimer);
      submitButton.disabled = false;
      messagesElement.removeAttribute('aria-busy');
      panel.hidden = false;
      input.focus();
    }
  });

  applyUsageScenario();

  function showInlineForSelection() {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';
    const anchor = selection?.anchorNode?.parentElement;
    if (!anchor?.closest('main') || text.length < 2 || text.length > 1_000) return;
    inlineContextElement = anchor;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    selectedText = text;
    inlineText.textContent = canUseAssistant()
      ? `Comprendre la vérification : « ${text.slice(0, 120)}${text.length > 120 ? '…' : ''} »`
      : vehicleContextMessage();
    inline.hidden = false;
    inlineAsk.hidden = false;
    inlineAsk.textContent = 'Voir comment vérifier';
    const actionBarHeight = document.querySelector('.action-bar')?.getBoundingClientRect().height || 0;
    const inlineRect = inline.getBoundingClientRect();
    const safeBottom = actionBarHeight + 12;
    const preferredTop = rect.bottom + 8;
    const top = preferredTop + inlineRect.height <= window.innerHeight - safeBottom
      ? preferredTop
      : Math.max(12, rect.top - inlineRect.height - 8);
    const left = Math.min(
      window.innerWidth - inlineRect.width - 12,
      Math.max(12, rect.left + (rect.width / 2) - (inlineRect.width / 2)),
    );
    inline.style.left = `${left}px`;
    inline.style.top = `${top}px`;
  }

  async function loadInlineExplanation() {
    if (!selectedText) return;
    inlineAsk.hidden = true;
    if (!canUseAssistant()) {
      inlineText.textContent = vehicleContextMessage();
      return;
    }
    inlineAsk.disabled = true;
    inlineText.textContent = 'Explication et méthode de vérification en cours…';
    try {
      const { explanation } = await request('/api/inline', { selectedText, carContext: carContext() });
      renderSafeInline(inlineText, explanation);
    } catch (error) {
      inlineText.textContent = `Explication non disponible : ${error.message}`;
    } finally {
      inlineAsk.disabled = false;
    }
  }

  function showInlineHelp(text, target) {
    if (!text) return;
    selectedText = text;
    inlineContextElement = target;
    inlineText.textContent = 'Ouverture de la procédure de contrôle…';
    inline.hidden = false;
    inlineAsk.hidden = true;
    const actionBarHeight = document.querySelector('.action-bar')?.getBoundingClientRect().height || 0;
    const inlineRect = inline.getBoundingClientRect();
    const safeBottom = actionBarHeight + 12;
    const rect = target?.getBoundingClientRect ? target.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const preferredTop = rect.bottom + 8;
    const top = preferredTop + inlineRect.height <= window.innerHeight - safeBottom
      ? preferredTop
      : Math.max(12, rect.top - inlineRect.height - 8);
    const left = Math.min(
      window.innerWidth - inlineRect.width - 12,
      Math.max(12, rect.left + (rect.width / 2) - (inlineRect.width / 2)),
    );
    inline.style.left = `${left}px`;
    inline.style.top = `${top}px`;
    void loadInlineExplanation();
  }
  window.showInlineHelp = showInlineHelp;
  window.addEventListener('cardiag:inline-help', (event) => {
    showInlineHelp(event.detail?.text, event.detail?.target);
  });

  document.addEventListener('selectionchange', showInlineForSelection);
  document.addEventListener('pointerup', showInlineForSelection);

  inlineClose?.addEventListener('click', () => { inline.hidden = true; });
  inlineAsk?.addEventListener('click', loadInlineExplanation);
}
