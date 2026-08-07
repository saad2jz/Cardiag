import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLlmService } from '../src/llm-service.js';

test('Gemini receives converted history and system instructions', async () => {
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
    { role: 'user', content: 'Perte de puissance' },
    { role: 'assistant', content: 'À chaud ou à froid ?' },
    { role: 'user', content: 'À chaud' },
  ], { marque: 'Alpine', modele: 'A290', motorisation: 'Électrique 220 ch' });

  assert.deepEqual(result, { type: 'question', content: 'Quel témoin est allumé ?' });
  assert.equal(captured.model, 'gemini-test');
  assert.match(captured.config.systemInstruction, /chef d'atelier/i);
  assert.deepEqual(captured.contents.map(({ role }) => role), ['user', 'model', 'user']);
});

test('inline output strips unsafe HTML', async () => {
  const client = {
    models: {
      async generateContent() {
        return { text: '<strong>P0301</strong><script>alert(1)</script><a href="/">détail</a>' };
      },
    },
  };
  const service = createLlmService({ client, provider: 'gemini' });
  assert.equal(await service.inline('P0301', { marque: 'Peugeot', modele: '308', motorisation: '1.2 PureTech' }), '<strong>P0301</strong>détail');
});
