import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import sanitizeHtml from 'sanitize-html';
import { buildChatInstructions, escapePromptData } from './prompts.js';

const SUPPORTED_PROVIDERS = new Set(['gemini', 'openai']);

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
    model: isGemini ? env.GEMINI_MODEL || 'gemini-3.6-flash' : env.OPENAI_MODEL || 'gpt-5.6',
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
    if (!apiKey) throw configurationError("GEMINI_API_KEY n'est pas configurée sur le serveur.");
    return new GoogleGenAI({ apiKey });
  }

  if (provider === 'openai') {
    if (!process.env.OPENAI_API_KEY) throw configurationError("OPENAI_API_KEY n'est pas configurée sur le serveur.");
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30_000, maxRetries: 2 });
  }

  throw configurationError(`Le fournisseur LLM "${provider}" n'est pas pris en charge.`);
}

function outputText(response, provider) {
  const text = provider === 'gemini'
    ? (typeof response.text === 'function' ? response.text() : response.text)
    : response.output_text;
  if (!text?.trim()) throw new Error(`Le modèle ${provider} a renvoyé une réponse vide.`);
  return text.trim();
}

function normalizeChatText(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .trim();
}

const CHAT_SYSTEM_INSTRUCTION = `Tu es l'expert mécanicien de CarDiag.online, un chef d'atelier expérimenté qui aide à diagnostiquer et vérifier un véhicule spécifique.

RÈGLES ABSOLUES :
- Tes réponses doivent IMPÉRATIVEMENT se baser sur le VÉHICULE EXACT fourni (marque, modèle, année, motorisation, VIN).
- Interdiction de donner des conseils génériques. Adapte chaque procédure au moteur, à la motorisation et à l'année ciblés.
- Sois direct, technique, et structure ta réponse par étapes claires et actionnables.
- Si un point de contrôle ou un état est fourni, dis EXACTEMENT comment le vérifier sur ce modèle (où regarder, quoi mesurer, quels outils).
- Mentionne explicitement la marque, le modèle et la motorisation dans ta réponse quand ils sont connus.
- Si des informations manquent pour être précis (code moteur, année, VIN), indique cette limite au lieu d'inventer.
- Quand un risque de sécurité est possible (freinage, direction, carburant, surchauffe, fumée, témoin rouge), recommande l'immobilisation du véhicule.`;

const INLINE_SYSTEM_INSTRUCTION = `Tu es l'expert mécanicien de CarDiag.online. Ton rôle est de guider l'utilisateur pour vérifier un point de contrôle spécifique.
RÈGLE ABSOLUE : Tes réponses doivent IMPÉRATIVEMENT se baser sur l'intersection du VÉHICULE EXACT et du POINT DE CONTRÔLE qui te seront fournis.
Interdiction de donner des conseils génériques. Adapte ta procédure au moteur ciblé. Sois direct, technique, et structure ta réponse par étapes claires.`;

function readJsonObject(text) {
  let normalized = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  // Extrait le premier objet JSON bien formé (entre { et } correspondants).
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
    throw new Error(`Le rapport JSON ne contient pas le champ obligatoire « ${field} ». `);
  }
  return value.trim();
}

function normalizeChatResult(text) {
  const result = readJsonObject(text);
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    if (result.type === 'question') {
      return { type: 'question', content: requiredString(result.content, 'content') };
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
  }
  // Par défaut, diffuser la réponse du modèle comme message texte naturel.
  return { type: 'message', content: normalizeChatText(text) };
}

export function createLlmService({ client, provider, model } = {}) {
  const runtime = getLlmRuntimeConfig();
  const activeProvider = (provider || runtime.provider).toLowerCase();
  const activeModel = model || (activeProvider === runtime.provider
    ? runtime.model
    : activeProvider === 'gemini' ? 'gemini-3.6-flash' : 'gpt-5.6');
  let activeClient = client;

  function getClient() {
    activeClient ??= createProviderClient(activeProvider);
    return activeClient;
  }

  return {
    async chat(messages, carContext) {
      const instructions = buildChatInstructions(carContext);
      if (activeProvider === 'gemini') {
        const response = await getClient().models.generateContent({
          model: activeModel,
          contents: messages.map(({ role, content }) => ({
            role: role === 'assistant' ? 'model' : 'user',
            parts: [{ text: content.trim() }],
          })),
          config: { systemInstruction: instructions, maxOutputTokens: 2048 },
        });
        return normalizeChatResult(outputText(response, 'gemini'));
      }

      const response = await getClient().responses.create({
        model: activeModel,
        instructions,
        input: messages.map(({ role, content }) => ({ role, content: content.trim() })),
        max_output_tokens: 2048,
      });
      return normalizeChatResult(outputText(response, 'openai'));
    },
    async inline(selectedText, carContext) {
      const input = `<texte_selectionne>${escapePromptData(selectedText.trim())}</texte_selectionne>`;
      const response = activeProvider === 'gemini'
        ? await getClient().models.generateContent({
          model: activeModel,
          contents: input,
          config: { systemInstruction: INLINE_SYSTEM_INSTRUCTION, maxOutputTokens: 2048 },
        })
        : await getClient().responses.create({
          model: activeModel,
          instructions: INLINE_SYSTEM_INSTRUCTION,
          input,
          max_output_tokens: 2048,
        });
      return sanitizeHtml(outputText(response, activeProvider), {
        allowedTags: ['strong', 'em', 'code', 'br', 'ul', 'ol', 'li'],
        allowedAttributes: {},
      });
    },
  };
}
