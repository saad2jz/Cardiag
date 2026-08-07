import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';

let server;
let baseUrl;

before(async () => {
  server = createApp({
    llmService: {
      chat: async () => 'Question atelier ?',
      inline: async () => '<strong>P0301</strong> signale un raté.',
    },
  }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test('health reports LLM runtime status', async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(typeof body.llmConfigured, 'boolean');
});

test('chat and inline routes call the configured service', async () => {
  const payload = { carContext: { marque: 'Renault' } };
  const chat = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, messages: [{ role: 'user', content: 'Bruit moteur' }] }),
  });
  const inline = await fetch(`${baseUrl}/api/inline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, selectedText: 'P0301' }),
  });
  assert.deepEqual(await chat.json(), { message: 'Question atelier ?' });
  assert.match((await inline.json()).explanation, /P0301/);
});
