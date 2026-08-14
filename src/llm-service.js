import { INLINE_PROCEDURES, SYMPTOMS_DATABASE, OBD_SCENARIOS } from './knowledge-base.js';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { buildChatInstructions } from './prompts.js';

const SUPPORTED_PROVIDERS = new Set(['gemini', 'openai']);
const DEFAULT_MODELS = {
  gemini: 'gemini-3.5-flash-lite',
  openai: 'gpt-4o',
};
const ADVANCED_GEMINI_MODEL = 'gemini-3.6-flash';
const MAX_LLM_OUTPUT_TOKENS = 1800;
const MAX_LLM_HISTORY_MESSAGES = 6;
const MAX_LLM_MESSAGE_LENGTH = 3500;

const INLINE_FALLBACK = '<i>Procédure non standardisée. Veuillez vous référer à la documentation technique constructeur.</i>';

const CHAT_SAFETY_FALLBACK = {
  type: 'question',
  content: "Désolé, j'ai rencontré une anomalie lors de l'analyse. Pouvez-vous reformuler vos symptômes ou vérifier le code ?",
};

const AMBIGUOUS_INPUT_FALLBACK = {
  type: 'question',
  content: 'Je n’ai pas assez d’éléments pour identifier le symptôme. Indiquez ce que vous voyez, entendez ou ressentez, et dans quelles conditions cela apparaît.',
  suggestions: [
    'Un bruit anormal',
    'Un voyant est allumé',
    'Une vibration ou un à-coup',
    'Une fumée ou une odeur',
  ],
};

const CHAT_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ['report'] },
    content: {
      type: 'string',
      description: 'Message destiné à poursuivre le diagnostic, avec au maximum une question technique ciblée.',
    },
    vehicle: { type: 'string' },
    fault_code: { type: 'string' },
    root_cause: {
      type: 'string',
      description: 'Synthèse technique évolutive : hypothèses au début, puis cause probable lorsque les preuves convergent.',
    },
    action_plan: {
      type: 'string',
      description: 'Tests numérotés, sûrs et discriminants, adaptés aux informations déjà collectées.',
    },
    confidence: {
      type: 'string',
      enum: ['preliminary', 'probable', 'confirmed'],
    },
    suggestions: {
      type: 'array',
      description: 'Deux à quatre réponses courtes que l’utilisateur peut choisir pour répondre à la question de suivi.',
      minItems: 2,
      maxItems: 4,
      items: { type: 'string' },
    },
  },
  required: ['type', 'content', 'vehicle', 'fault_code', 'root_cause', 'action_plan', 'confidence', 'suggestions'],
};

const DEFAULT_FOLLOW_UP_SUGGESTIONS = [
  'Le symptôme est permanent',
  'Le symptôme est intermittent',
  'Un voyant est allumé',
  'J’ai un code défaut',
];

const LOCAL_SCENARIO_GUIDANCE = {
  buyer: {
    content: 'Première synthèse avant achat disponible. Précisez les conditions d’apparition et demandez les justificatifs ou mesures disponibles.',
    suggestions: ['Présent à froid', 'Présent à chaud', 'Un justificatif est disponible', 'Aucun contrôle encore effectué'],
  },
  mechanic: {
    content: 'État initial enregistré. Complétez avec la plainte exacte du client, les conditions de reproduction et les premières mesures atelier.',
    suggestions: ['Défaut permanent', 'Défaut intermittent', 'Codes relevés sans effacement', 'Intervention antérieure connue'],
  },
  rental: {
    content: 'État de flotte enregistré. Comparez le kilométrage, le niveau d’énergie et les photos avant/après afin d’isoler tout écart nouveau avant la prochaine location.',
    suggestions: ['État de départ documenté', 'Dommage nouveau au retour', 'Écart de kilométrage', 'Voyant ou anomalie au retour'],
  },
  seller: {
    content: 'Élément ajouté au rapport vendeur. Complétez avec la date, le kilométrage, les justificatifs et les éventuelles limites du contrôle.',
    suggestions: ['Facture disponible', 'Réparation récente', 'Défaut connu non réparé', 'Photo ajoutée au dossier'],
  },
  owner: {
    content: 'Première synthèse de suivi disponible. Précisez depuis quand le symptôme existe, sa fréquence et son évolution.',
    suggestions: ['Apparu récemment', 'Le symptôme s’aggrave', 'Le symptôme est intermittent', 'Entretien effectué récemment'],
  },
};

export function getLlmRuntimeConfig(env = process.env) {
  const inferredProvider = env.GEMINI_API_KEY || env.GOOGLE_API_KEY ? 'gemini' : 'openai';
  const provider = (env.LLM_PROVIDER || inferredProvider).trim().toLowerCase();
  const isGemini = provider === 'gemini';

  return {
    provider,
    supported: SUPPORTED_PROVIDERS.has(provider),
    configured: isGemini
      ? Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY)
      : provider === 'openai' && Boolean(env.OPENAI_API_KEY),
    model: isGemini ? DEFAULT_MODELS.gemini : DEFAULT_MODELS.openai,
  };
}

function configurationError(message) {
  const error = new Error(message);
  error.code = 'LLM_NOT_CONFIGURED';
  return error;
}

function createProviderClient(provider) {
  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw configurationError("GEMINI_API_KEY n'est pas configurée sur le serveur.");
    }

    return new GoogleGenAI({ apiKey });
  }

  if (provider === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      throw configurationError("OPENAI_API_KEY n'est pas configurée sur le serveur.");
    }

    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30_000,
      maxRetries: 2,
    });
  }

  throw configurationError(`Le fournisseur LLM "${provider}" n'est pas pris en charge.`);
}

function outputText(response, provider) {
  const text = provider === 'gemini'
    ? (typeof response.text === 'function' ? response.text() : response.text)
    : response.output_text;

  if (!text?.trim()) {
    throw new Error(`Le modèle ${provider} a renvoyé une réponse vide.`);
  }

  return text.trim();
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function readContextValue(carContext, ...keys) {
  for (const key of keys) {
    const value = carContext?.[key];

    if (
      (typeof value === 'string' || typeof value === 'number')
      && String(value).trim()
    ) {
      return String(value).trim();
    }
  }

  return '';
}

function formatVehicle(carContext) {
  const marque = readContextValue(carContext, 'marque', 'Marque');
  const modele = readContextValue(carContext, 'modele', 'Modèle', 'Modele');
  const annee = readContextValue(carContext, 'annee', 'Année', 'Annee');

  const vehicle = [marque, modele].filter(Boolean).join(' ');
  return `${vehicle}${annee ? ` (${annee})` : ''}`.trim();
}

function cloneLocalScenario(scenario, carContext) {
  if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) {
    return null;
  }

  const {
    keywords,
    mots_cles: motsClesSnakeCase,
    motsCles,
    ...result
  } = scenario;
  void keywords;
  void motsClesSnakeCase;
  void motsCles;

  const usageScenario = ['buyer', 'mechanic', 'rental', 'seller', 'owner'].includes(carContext?.usageScenario)
    ? carContext.usageScenario
    : 'buyer';
  const guidance = LOCAL_SCENARIO_GUIDANCE[usageScenario];

  return {
    ...result,
    vehicle: formatVehicle(carContext),
    content: typeof result.content === 'string' && result.content.trim()
      ? result.content.trim()
      : guidance.content,
    confidence: result.confidence || 'probable',
    suggestions: normalizeSuggestions(result.suggestions, guidance.suggestions),
  };
}

function findObdScenario(message) {
  const obdCodes = String(message ?? '').match(/\b[PBCU][0-9A-F]{4}\b/gi) ?? [];

  for (const code of obdCodes) {
    const normalizedCode = code.toUpperCase();
    const matchingKey = Object.keys(OBD_SCENARIOS).find(
      (key) => key.toUpperCase() === normalizedCode,
    );

    if (matchingKey) {
      return OBD_SCENARIOS[matchingKey];
    }
  }

  return null;
}

function getSymptomKeywords(databaseKey, scenario) {
  const keywords = [databaseKey];
  const configuredKeywords = scenario?.keywords
    ?? scenario?.mots_cles
    ?? scenario?.motsCles;

  if (Array.isArray(configuredKeywords)) {
    keywords.push(...configuredKeywords);
  } else if (typeof configuredKeywords === 'string') {
    keywords.push(configuredKeywords);
  }

  return keywords.map(normalizeText).filter(Boolean);
}

function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function tokensApproximatelyMatch(message, keyword) {
  const messageTokens = message.split(/[^a-z0-9]+/).filter((token) => token.length > 1);
  const keywordTokens = keyword.split(/[^a-z0-9]+/).filter((token) => token.length > 1);
  if (!messageTokens.length || !keywordTokens.length) return false;

  let matchedTokens = 0;
  for (const keywordToken of keywordTokens) {
    const threshold = keywordToken.length >= 8 ? 2 : keywordToken.length >= 4 ? 1 : 0;
    if (messageTokens.some((messageToken) => (
      Math.abs(messageToken.length - keywordToken.length) <= threshold
      && editDistance(messageToken, keywordToken) <= threshold
    ))) {
      matchedTokens += 1;
    }
  }

  return matchedTokens >= Math.ceil(keywordTokens.length * 0.75);
}

function findSymptomScenario(message) {
  const normalizedMessage = normalizeText(message);

  if (!normalizedMessage) {
    return null;
  }

  for (const [databaseKey, scenario] of Object.entries(SYMPTOMS_DATABASE)) {
    const hasMatchingKeyword = getSymptomKeywords(databaseKey, scenario)
      .some((keyword) => (
        normalizedMessage.includes(keyword)
        || tokensApproximatelyMatch(normalizedMessage, keyword)
      ));

    if (hasMatchingKeyword) {
      return scenario;
    }
  }

  return null;
}

function findLastUserMessage(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      return messages[index].content;
    }
  }

  return '';
}

function hasAssistantMessage(messages) {
  return messages.some((message) => message?.role === 'assistant');
}

function extractUserObservation(message) {
  const value = String(message ?? '').trim();
  const wrappedObservation = value.match(/Point de contr(?:ô|o)le\s*:\s*(.*?)\.\s*[ÉE]tat\s*:/i);
  return wrappedObservation?.[1]?.trim() || value;
}

function isClearlyAmbiguous(message) {
  const normalized = normalizeText(extractUserObservation(message))
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!normalized) return true;
  if (['oui', 'non'].includes(normalized)) return false;
  return normalized.length <= 2 || ['ok', 'fr', 'jsp', '???'].includes(normalized);
}

function compactMessagesForLlm(messages) {
  if (messages.length <= MAX_LLM_HISTORY_MESSAGES) {
    return messages.map(({ role, content }) => ({
      role,
      content: content.trim().slice(0, MAX_LLM_MESSAGE_LENGTH),
    }));
  }

  const firstUserMessage = messages.find((message) => message?.role === 'user');
  const recentMessages = messages.slice(-(MAX_LLM_HISTORY_MESSAGES - 1));
  const compacted = firstUserMessage && !recentMessages.includes(firstUserMessage)
    ? [firstUserMessage, ...recentMessages]
    : recentMessages;

  return compacted.map(({ role, content }) => ({
    role,
    content: content.trim().slice(0, MAX_LLM_MESSAGE_LENGTH),
  }));
}

function shouldUseAdvancedGemini(messages, lastUserMessage) {
  const userTurns = messages.filter((message) => message?.role === 'user').length;
  const normalized = normalizeText(lastUserMessage);
  const safetyCritical = /frein|direction|airbag|haute tension|batterie traction|surchauff|fuite carburant|incendie/.test(normalized);
  return userTurns >= 5 || safetyCritical;
}

function readJsonObject(text) {
  let normalized = String(text ?? '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  const firstOpen = normalized.indexOf('{');
  const lastClose = normalized.lastIndexOf('}');

  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    normalized = normalized.slice(firstOpen, lastClose + 1);
  }

  try {
    return JSON.parse(normalized);
  } catch {
    return null;
  }
}

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Le rapport JSON ne contient pas le champ obligatoire « ${field} ».`);
  }

  return value.trim();
}

function normalizeSuggestions(value, fallback = []) {
  const source = Array.isArray(value) ? value : fallback;
  return [...new Set(source
    .filter((suggestion) => typeof suggestion === 'string')
    .map((suggestion) => suggestion.trim().slice(0, 120))
    .filter(Boolean))]
    .slice(0, 4);
}

function tryNormalizeChatResult(text) {
  const result = readJsonObject(text);

  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return null;
  }

  try {
    if (result.type === 'question') {
      return {
        type: 'question',
        content: requiredString(result.content, 'content'),
      };
    }

    if (result.type === 'report') {
      return {
        type: 'report',
        content: typeof result.content === 'string' && result.content.trim()
          ? result.content.trim()
          : 'Synthèse technique mise à jour. Ajoutez une observation ou une mesure pour poursuivre l’analyse.',
        vehicle: requiredString(result.vehicle, 'vehicle'),
        fault_code: requiredString(result.fault_code, 'fault_code'),
        root_cause: requiredString(result.root_cause, 'root_cause'),
        action_plan: requiredString(result.action_plan, 'action_plan'),
        confidence: ['preliminary', 'probable', 'confirmed'].includes(result.confidence)
          ? result.confidence
          : 'probable',
        suggestions: normalizeSuggestions(result.suggestions, DEFAULT_FOLLOW_UP_SUGGESTIONS),
      };
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeChatResult(text) {
  return tryNormalizeChatResult(text) || { ...CHAT_SAFETY_FALLBACK };
}

export function createLlmService({ client, provider, model } = {}) {
  const runtime = getLlmRuntimeConfig();
  const activeProvider = (provider || runtime.provider).toLowerCase();
  const activeModel = model || (
    activeProvider === runtime.provider
      ? runtime.model
      : DEFAULT_MODELS[activeProvider]
  );
  let activeClient = client;

  function getClient() {
    activeClient ??= createProviderClient(activeProvider);
    return activeClient;
  }

  return {
    async chat(messages, carContext) {
      const lastUserMessage = findLastUserMessage(messages);
      const isFirstDiagnosticExchange = !hasAssistantMessage(messages);

      const obdScenario = isFirstDiagnosticExchange && findObdScenario(lastUserMessage);
      if (obdScenario) {
        const localResult = cloneLocalScenario(obdScenario, carContext);
        if (localResult) {
          return localResult;
        }
      }

      const symptomScenario = isFirstDiagnosticExchange && findSymptomScenario(lastUserMessage);
      if (symptomScenario) {
        const localResult = cloneLocalScenario(symptomScenario, carContext);
        if (localResult) {
          return localResult;
        }
      }

      if (isClearlyAmbiguous(lastUserMessage)) {
        return { ...AMBIGUOUS_INPUT_FALLBACK };
      }

      const instructions = buildChatInstructions(carContext);
      const compactedMessages = compactMessagesForLlm(messages);

      if (activeProvider === 'gemini') {
        const requestModel = model || (
          shouldUseAdvancedGemini(compactedMessages, lastUserMessage)
            ? ADVANCED_GEMINI_MODEL
            : activeModel
        );
        const contents = compactedMessages.map(({ role, content }) => ({
            role: role === 'assistant' ? 'model' : 'user',
            parts: [{ text: content.trim() }],
          }));

        for (let attempt = 0; attempt < 2; attempt += 1) {
          const response = await getClient().models.generateContent({
            model: requestModel,
            contents,
            config: {
              systemInstruction: attempt === 0
                ? instructions
                : `${instructions}\n\nCORRECTION DE FORMAT : la tentative précédente était invalide. Régénère intégralement un unique objet JSON conforme au schéma, sans Markdown ni texte autour.`,
              maxOutputTokens: MAX_LLM_OUTPUT_TOKENS,
              temperature: 0.2,
              responseMimeType: 'application/json',
              responseJsonSchema: CHAT_RESPONSE_SCHEMA,
            },
          });

          const result = tryNormalizeChatResult(outputText(response, 'gemini'));
          if (result) return result;
        }

        return { ...CHAT_SAFETY_FALLBACK };
      }

      const response = await getClient().responses.create({
        model: activeModel,
        instructions,
        input: compactedMessages.map(({ role, content }) => ({
          role,
          content: content.trim(),
        })),
        max_output_tokens: MAX_LLM_OUTPUT_TOKENS,
      });

      return normalizeChatResult(outputText(response, 'openai'));
    },

    async inline(selectedText, carContext) {
      void carContext;

      const normalizedSelection = normalizeText(selectedText);
      const matchingKey = Object.keys(INLINE_PROCEDURES).find(
        (key) => normalizeText(key) === normalizedSelection,
      );

      if (
        matchingKey
        && typeof INLINE_PROCEDURES[matchingKey] === 'string'
      ) {
        return INLINE_PROCEDURES[matchingKey];
      }

      return INLINE_FALLBACK;
    },
  };
}
