import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import sanitizeHtml from 'sanitize-html';
import { buildChatInstructions, buildInlineInstructions, escapePromptData } from './prompts.js';

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
          config: { systemInstruction: instructions, maxOutputTokens: 500 },
        });
        return outputText(response, 'gemini');
      }

      const response = await getClient().responses.create({
        model: activeModel,
        instructions,
        input: messages.map(({ role, content }) => ({ role, content: content.trim() })),
        max_output_tokens: 500,
      });
      return outputText(response, 'openai');
    },
    async inline(selectedText, carContext) {
      const instructions = buildInlineInstructions(carContext);
      const input = `<texte_selectionne>${escapePromptData(selectedText.trim())}</texte_selectionne>`;
      const response = activeProvider === 'gemini'
        ? await getClient().models.generateContent({
          model: activeModel,
          contents: input,
          config: { systemInstruction: instructions, maxOutputTokens: 180 },
        })
        : await getClient().responses.create({
          model: activeModel,
          instructions,
          input,
          max_output_tokens: 180,
        });
      return sanitizeHtml(outputText(response, activeProvider), {
        allowedTags: ['strong', 'em', 'code', 'br'],
        allowedAttributes: {},
      });
    },
  };
}
