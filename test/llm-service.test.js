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
        return { text: JSON.stringify({
          type: 'report',
          content: 'Quel témoin est allumé ?',
          vehicle: 'Peugeot 308 (2021)',
          fault_code: 'N/A',
          root_cause: 'Hypothèse préliminaire à préciser après observation du témoin.',
          action_plan: '1. Identifier le témoin et relever les codes sans les effacer.',
          confidence: 'preliminary',
          suggestions: ['Voyant fixe', 'Voyant clignotant'],
        }) };
      },
    },
  };
  const service = createLlmService({ client, provider: 'gemini', model: 'gemini-test' });
  const result = await service.chat([
    { role: 'user', content: 'Cas non répertorié dans la base' },
    { role: 'assistant', content: 'À chaud ou à froid ?' },
    { role: 'user', content: 'Uniquement après vingt minutes' },
  ], carContext);

  assert.equal(result.type, 'report');
  assert.equal(result.content, 'Quel témoin est allumé ?');
  assert.equal(result.confidence, 'preliminary');
  assert.deepEqual(result.suggestions, ['Voyant fixe', 'Voyant clignotant']);
  assert.equal(captured.model, 'gemini-test');
  assert.equal(captured.config.responseMimeType, 'application/json');
  assert.equal(captured.config.maxOutputTokens, 1800);
  assert.equal(captured.config.temperature, 0.2);
  assert.deepEqual(captured.config.responseJsonSchema.required, [
    'type', 'content', 'vehicle', 'fault_code', 'root_cause', 'action_plan', 'confidence', 'suggestions',
  ]);
  assert.match(captured.config.systemInstruction, /chef d'atelier/i);
  assert.match(captured.config.systemInstruction, /historique complet/i);
  assert.match(captured.config.systemInstruction, /cause racine/i);
  assert.match(captured.config.systemInstruction, /outil nécessaire/i);
  assert.match(captured.config.systemInstruction, /résultat attendu/i);
  assert.match(captured.config.systemInstruction, /ne repose jamais une question/i);
  assert.match(captured.config.systemInstruction, /fautes d[’']orthographe/i);
  assert.match(captured.config.systemInstruction, /deux à quatre réponses courtes/i);
  assert.deepEqual(captured.contents.map(({ role }) => role), ['user', 'model', 'user']);
});

test('an unclear two-letter input is handled locally without consuming Gemini quota', async () => {
  const client = {
    models: {
      async generateContent() {
        throw new Error('Gemini ne doit pas être appelé');
      },
    },
  };
  const service = createLlmService({ client, provider: 'gemini' });
  const result = await service.chat([
    { role: 'user', content: 'Véhicule : Peugeot 308. Point de contrôle : fr. État : Général.' },
  ], carContext);

  assert.equal(result.type, 'question');
  assert.match(result.content, /pas assez d’éléments/i);
  assert.equal(result.suggestions.length, 4);
});

test('Gemini history is compacted while retaining the initial symptom and recent synthesis', async () => {
  let captured;
  const client = {
    models: {
      async generateContent(request) {
        captured = request;
        return { text: JSON.stringify({
          type: 'report',
          content: 'Synthèse mise à jour.',
          vehicle: 'Peugeot 308 (2021)',
          fault_code: 'N/A',
          root_cause: 'Hypothèse à confirmer.',
          action_plan: '1. Effectuer le contrôle discriminant.',
          confidence: 'preliminary',
          suggestions: ['Oui', 'Non'],
        }) };
      },
    },
  };
  const service = createLlmService({ client, provider: 'gemini', model: 'gemini-test' });
  const messages = [
    { role: 'user', content: 'Symptôme initial hors base locale' },
    ...Array.from({ length: 8 }, (_, index) => ({
      role: index % 2 ? 'user' : 'assistant',
      content: `${index % 2 ? 'Observation' : 'Synthèse'} ${index} ${'x'.repeat(4000)}`,
    })),
  ];

  await service.chat(messages, carContext);

  assert.equal(captured.contents.length, 6);
  assert.match(captured.contents[0].parts[0].text, /Symptôme initial/);
  assert.ok(captured.contents.every(({ parts }) => parts[0].text.length <= 3500));
});

test('a safety-critical follow-up is routed to Gemini 3.6 Flash', async () => {
  let capturedModel;
  const client = {
    models: {
      async generateContent(request) {
        capturedModel = request.model;
        return { text: JSON.stringify({
          type: 'report',
          content: 'Immobilisez le véhicule avant le contrôle.',
          vehicle: 'Peugeot 308 (2021)',
          fault_code: 'N/A',
          root_cause: 'Anomalie de freinage à confirmer.',
          action_plan: '1. Contrôler le circuit de freinage en sécurité.',
          confidence: 'preliminary',
          suggestions: ['Pédale molle', 'Témoin rouge'],
        }) };
      },
    },
  };
  const service = createLlmService({ client, provider: 'gemini' });
  await service.chat([
    { role: 'user', content: 'Vibration initiale' },
    { role: 'assistant', content: 'Synthèse initiale.' },
    { role: 'user', content: 'La pédale de frein devient molle' },
  ], carContext);

  assert.equal(capturedModel, 'gemini-3.6-flash');
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
  assert.equal(result.confidence, 'probable');
  assert.match(result.content, /avant achat/i);
});

test('local reports adapt their guidance to the selected business scenario', async () => {
  const service = createLlmService({ provider: 'openai' });
  const expectations = {
    buyer: /avant achat/i,
    mechanic: /état initial/i,
    seller: /rapport vendeur/i,
    owner: /suivi/i,
  };

  for (const [usageScenario, expectedContent] of Object.entries(expectations)) {
    const result = await service.chat([
      { role: 'user', content: 'Perte de puissance' },
    ], { ...carContext, usageScenario });
    assert.match(result.content, expectedContent);
    assert.equal(result.suggestions.length, 4);
  }
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
  assert.equal(result.suggestions.length, 4);
});

test('local symptom matching tolerates spelling mistakes and incomplete phrases', async () => {
  const client = {
    models: {
      async generateContent() {
        throw new Error('Le LLM ne doit pas être appelé pour ce symptôme reconnaissable');
      },
    },
  };
  const service = createLlmService({ client, provider: 'gemini' });
  const result = await service.chat([
    { role: 'user', content: 'fumé bleu au démarage' },
  ], carContext);

  assert.equal(result.type, 'report');
  assert.match(result.root_cause, /huile moteur/i);
  assert.equal(result.vehicle, 'Peugeot 308 (2021)');
});

test('a follow-up detail bypasses the static local scenario and updates synthesis through Gemini', async () => {
  let calls = 0;
  const client = {
    models: {
      async generateContent() {
        calls += 1;
        return { text: JSON.stringify({
          type: 'report',
          content: 'La fumée disparaît-elle totalement après quelques secondes ?',
          vehicle: 'BMW 420d (2018)',
          fault_code: 'N/A',
          root_cause: 'L’odeur de gazole réoriente la synthèse vers une combustion incomplète à froid.',
          action_plan: '1. Relever les corrections injecteurs au premier démarrage à froid.',
          confidence: 'preliminary',
        }) };
      },
    },
  };
  const service = createLlmService({ client, provider: 'gemini' });
  const result = await service.chat([
    { role: 'user', content: 'Fumée bleue au démarrage' },
    { role: 'assistant', content: 'Synthèse initiale : combustion possible d’huile.' },
    { role: 'user', content: 'La fumée a surtout une forte odeur de gazole.' },
  ], { marque: 'BMW', modele: '420d', annee: '2018', motorisation: 'B47' });

  assert.equal(calls, 1);
  assert.equal(result.type, 'report');
  assert.match(result.root_cause, /combustion incomplète/i);
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
  let calls = 0;
  const client = {
    models: {
      async generateContent() {
        calls += 1;
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
  assert.equal(calls, 2);
});

test('Gemini retries once and returns the repaired evolving synthesis', async () => {
  let calls = 0;
  let repairInstructions = '';
  const client = {
    models: {
      async generateContent(request) {
        calls += 1;
        if (calls === 1) return { text: '{"type":"report","content":' };
        repairInstructions = request.config.systemInstruction;
        return { text: JSON.stringify({
          type: 'report',
          content: 'Le bruit change-t-il lorsque vous relâchez légèrement l’accélérateur ?',
          vehicle: 'Peugeot 308 (2021)',
          fault_code: 'N/A',
          root_cause: 'Hypothèse préliminaire de vibration sous charge à départager.',
          action_plan: '1. Reproduire le bruit en sécurité et noter la charge moteur.',
          confidence: 'preliminary',
        }) };
      },
    },
  };
  const service = createLlmService({ client, provider: 'gemini' });
  const result = await service.chat([
    { role: 'user', content: 'Bruit métallique très précis hors base locale' },
  ], carContext);

  assert.equal(calls, 2);
  assert.equal(result.type, 'report');
  assert.equal(result.confidence, 'preliminary');
  assert.match(repairInstructions, /CORRECTION DE FORMAT/);
});
