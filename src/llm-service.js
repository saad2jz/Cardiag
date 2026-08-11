import { INLINE_PROCEDURES, SYMPTOMS_DATABASE, OBD_SCENARIOS } from './knowledge-base.js';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { buildChatInstructions } from './prompts.js';

const SUPPORTED_PROVIDERS = new Set(['gemini', 'openai']);
const DEFAULT_MODELS = {
  gemini: 'gemini-3.6-flash',
  openai: 'gpt-4o',
};

const INLINE_FALLBACK = '<i>Procédure non standardisée. Veuillez vous référer à la documentation technique constructeur.</i>';

const CHAT_SAFETY_FALLBACK = {
  type: 'question',
  content: "Désolé, j'ai rencontré une anomalie lors de l'analyse. Pouvez-vous reformuler vos symptômes ou vérifier le code ?",
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

  return {
    ...result,
    vehicle: formatVehicle(carContext),
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

function findSymptomScenario(message) {
  const normalizedMessage = normalizeText(message);

  if (!normalizedMessage) {
    return null;
  }

  for (const [databaseKey, scenario] of Object.entries(SYMPTOMS_DATABASE)) {
    const hasMatchingKeyword = getSymptomKeywords(databaseKey, scenario)
      .some((keyword) => normalizedMessage.includes(keyword));

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

function normalizeChatResult(text) {
  const result = readJsonObject(text);

  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return { ...CHAT_SAFETY_FALLBACK };
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
        vehicle: requiredString(result.vehicle, 'vehicle'),
        fault_code: requiredString(result.fault_code, 'fault_code'),
        root_cause: requiredString(result.root_cause, 'root_cause'),
        action_plan: requiredString(result.action_plan, 'action_plan'),
      };
    }
  } catch {
    return { ...CHAT_SAFETY_FALLBACK };
  }

  return { ...CHAT_SAFETY_FALLBACK };
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

      const obdScenario = findObdScenario(lastUserMessage);
      if (obdScenario) {
        const localResult = cloneLocalScenario(obdScenario, carContext);
        if (localResult) {
          return localResult;
        }
      }

      const symptomScenario = findSymptomScenario(lastUserMessage);
      if (symptomScenario) {
        const localResult = cloneLocalScenario(symptomScenario, carContext);
        if (localResult) {
          return localResult;
        }
      }

      const instructions = buildChatInstructions(carContext);

      if (activeProvider === 'gemini') {
        const response = await getClient().models.generateContent({
          model: activeModel,
          contents: messages.map(({ role, content }) => ({
            role: role === 'assistant' ? 'model' : 'user',
            parts: [{ text: content.trim() }],
          })),
          config: {
            systemInstruction: instructions,
            maxOutputTokens: 2000,
            responseMimeType: 'application/json',
          },
        });

        return normalizeChatResult(outputText(response, 'gemini'));
      }

      const response = await getClient().responses.create({
        model: activeModel,
        instructions,
        input: messages.map(({ role, content }) => ({
          role,
          content: content.trim(),
        })),
        max_output_tokens: 2000,
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
