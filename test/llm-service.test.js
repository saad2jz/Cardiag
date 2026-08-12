import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLlmService, getLlmRuntimeConfig } from '../src/llm-service.js';

const carContext = {
  marque: 'Peugeot',
  modele: '308',
  annee: '2021',
  motorisation: '1.2 PureTech',
};

test('runtime uses the required Gemini and OpenAI models by default', () => {
  assert.equal(getLlmRuntimeConfig({ LLM_PROVIDER: 'gemini' }).model, 'gemini-3.5-flash-lite');
  assert.equal(getLlmRuntimeConfig({ LLM_PROVIDER: 'openai' }).model, 'gpt-4o');
  assert.equal(
    getLlmRuntimeConfig({ LLM_PROVIDER: 'gemini', GEMINI_MODEL: 'gemini-1.5-flash' }).model,
    'gemini-3.5-flash-lite',
  );
  assert.equal(
    getLlmRuntimeConfig({ LLM_PROVIDER: 'openai', OPENAI_MODEL: 'gpt-5.6' }).model,
    'gpt-4o',
  );
});

test('Gemini fallback receives converted history, JSON mode and system instructions', async () => {
  let captured;
  const client = {
    models: {
      async generateContent(request) {
        captured = request;
        return { text: '{"type":"question","content":"Quel témoin est allumé ?"}' };
      },
    },
  };
  const service = createLlmService({ client, provider: 'gemini', model: 'gemini-test' });
  const result = await service.chat([
    { role: 'user', content: 'Cas non répertorié dans la base' },
    { role: 'assistant', content: 'À chaud ou à froid ?' },
    { role: 'user', content: 'Uniquement après vingt minutes' },
  ], carContext);

  assert.deepEqual(result, { type: 'question', content: 'Quel témoin est allumé ?' });
  assert.equal(captured.model, 'gemini-test');
  assert.equal(captured.config.responseMimeType, 'application/json');
  assert.equal(captured.config.maxOutputTokens, 1800);
  assert.match(captured.config.systemInstruction, /chef d'atelier/i);
  assert.match(captured.config.systemInstruction, /historique complet/i);
  assert.match(captured.config.systemInstruction, /cause racine/i);
  assert.match(captured.config.systemInstruction, /outil nécessaire/i);
  assert.match(captured.config.systemInstruction, /résultat attendu/i);
  assert.match(captured.config.systemInstruction, /ne repose jamais une question/i);
  assert.deepEqual(captured.contents.map(({ role }) => role), ['user', 'model', 'user']);
});

test('inline uses the accent-insensitive local procedure and never calls the LLM', async () => {
  const client = {
    models: {
      async generateContent() {
        throw new Error('Le LLM ne doit pas être appelé');
      },
    },
  };
  const service = createLlmService({ client, provider: 'gemini' });
  const result = await service.inline('  NIVEAU ET COULEUR DE L\'HUILE MOTEUR  ', carContext);

  assert.match(result, /véhicule à plat/i);
});

test('inline returns the standardized fallback for an unknown selection', async () => {
  const service = createLlmService({ provider: 'gemini' });

  assert.equal(
    await service.inline('Contrôle inconnu', carContext),
    '<i>Procédure non standardisée. Veuillez vous référer à la documentation technique constructeur.</i>',
  );
});

test('OBD interception returns local JSON with the current vehicle and no network call', async () => {
  const client = {
    responses: {
      async create() {
        throw new Error('Le LLM ne doit pas être appelé');
      },
    },
  };
  const service = createLlmService({ client, provider: 'openai' });
  const result = await service.chat([
    { role: 'user', content: 'Le calculateur affiche p0301.' },
  ], carContext);

  assert.equal(result.type, 'report');
  assert.equal(result.fault_code, 'P0301');
  assert.equal(result.vehicle, 'Peugeot 308 (2021)');
});

test('symptom interception returns local JSON with the current vehicle', async () => {
  const service = createLlmService({ provider: 'openai' });
  const result = await service.chat([
    { role: 'user', content: "J'observe une PERTE DE PUISSANCE à chaud." },
  ], carContext);

  assert.equal(result.type, 'report');
  assert.equal(result.fault_code, 'N/A');
  assert.equal(result.vehicle, 'Peugeot 308 (2021)');
  assert.equal('keywords' in result, false);
});

test('generic network DTC interception supports U codes without a network call', async () => {
  const client = {
    models: {
      async generateContent() {
        throw new Error('Le LLM ne doit pas être appelé');
      },
    },
  };
  const service = createLlmService({ client, provider: 'gemini' });
  const result = await service.chat([
    { role: 'user', content: 'Diagnostic : u0121 présent et permanent.' },
  ], carContext);

  assert.equal(result.type, 'report');
  assert.equal(result.fault_code, 'U0121');
  assert.equal(result.vehicle, 'Peugeot 308 (2021)');
});

test('invalid LLM JSON is replaced by the safe question object', async () => {
  const client = {
    models: {
      async generateContent() {
        return { text: 'réponse tronquée et invalide' };
      },
    },
  };
  const service = createLlmService({ client, provider: 'gemini' });
  const result = await service.chat([
    { role: 'user', content: 'Anomalie non répertoriée localement' },
  ], carContext);

  assert.deepEqual(result, {
    type: 'question',
    content: "Désolé, j'ai rencontré une anomalie lors de l'analyse. Pouvez-vous reformuler vos symptômes ou vérifier le code ?",
  });
});
