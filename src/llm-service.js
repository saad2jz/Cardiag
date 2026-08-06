import { GoogleGenerativeAI } from '@google/generative-ai';
import sanitizeHtml from 'sanitize-html';
import { buildChatInstructions, buildInlineInstructions, escapePromptData } from './prompts.js';

function messageHistory(messages) {
  return messages.map(({ role, content }) => ({
    role: role === 'assistant' ? 'model' : 'user',
    parts: [{ text: content.trim() }],
  }));
}

async function responseText(result) {
  const text = result.response.text()?.trim();
  if (!text) throw new Error('Le modèle a renvoyé une réponse vide.');
  return text;
}

export function createLlmService({ client, model = process.env.GEMINI_MODEL || 'gemini-1.5-flash' } = {}) {
  if (!process.env.GEMINI_API_KEY && !client) throw new Error("GEMINI_API_KEY n'est pas configurée.");
  const gemini = client || new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  function modelFor(instructions, maxOutputTokens) {
    return gemini.getGenerativeModel({
      model,
      systemInstruction: { role: 'system', parts: [{ text: instructions }] },
      generationConfig: { maxOutputTokens },
    });
  }

  return {
    async chat(messages, carContext) {
      const history = messageHistory(messages);
      const latest = history.pop();
      if (!latest || latest.role !== 'user') throw new Error('Le dernier message doit être envoyé par l’utilisateur.');
      const chat = modelFor(buildChatInstructions(carContext), 500).startChat({ history });
      return responseText(await chat.sendMessage(latest.parts[0].text));
    },
    async inline(selectedText, carContext) {
      const explanation = await responseText(await modelFor(buildInlineInstructions(carContext), 180)
        .generateContent(`<texte_selectionne>${escapePromptData(selectedText.trim())}</texte_selectionne>`));
      return sanitizeHtml(explanation, { allowedTags: ['strong', 'em', 'code', 'br'], allowedAttributes: {} });
    },
  };
}
