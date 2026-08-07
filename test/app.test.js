import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';

let server;
let baseUrl;

before(async () => {
  server = createApp({
    llmService: {
      chat: async () => ({ type: 'question', content: 'Question atelier ?' }),
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

test('the combined server serves the frontend without exposing environment files', async () => {
  const page = await fetch(`${baseUrl}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Fiche d'Expertise/);

  const envFile = await fetch(`${baseUrl}/.env`);
  assert.equal(envFile.status, 404);
});

test('chat and inline routes call the configured service', async () => {
  const payload = { carContext: { marque: 'Renault', modele: 'Clio IV', motorisation: '1.5 dCi' } };
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
  assert.deepEqual(await chat.json(), { type: 'question', content: 'Question atelier ?' });
  assert.match((await inline.json()).explanation, /P0301/);
});

test('a Gemini authentication failure returns a useful configuration error', async () => {
  const authServer = createApp({
    llmService: {
      chat: async () => {
        const error = new Error('forbidden');
        error.status = 403;
        throw error;
      },
      inline: async () => '',
    },
  }).listen(0);
  await new Promise((resolve) => authServer.once('listening', resolve));

  const response = await fetch(`http://127.0.0.1:${authServer.address().port}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Bruit moteur' }],
      carContext: { marque: 'Renault', modele: 'Clio IV', motorisation: '1.5 dCi' },
    }),
  });

  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'LLM_AUTH_ERROR');
  await new Promise((resolve) => authServer.close(resolve));
});
