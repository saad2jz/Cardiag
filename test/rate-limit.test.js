import assert from 'node:assert/strict';
import test from 'node:test';
import { createRateLimiter } from '../src/app.js';

function responseRecorder() {
  return {
    headers: {}, statusCode: 200, payload: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.payload = value; return this; },
  };
}

test('le rate-limit bloque la treizième requête IA anonyme par IP', async () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 12 });
  let accepted = 0;
  for (let index = 0; index < 13; index += 1) {
    const response = responseRecorder();
    await limiter({ ip: '203.0.113.7', headers: {} }, response, () => { accepted += 1; });
    if (index === 12) {
      assert.equal(response.statusCode, 429);
      assert.equal(response.payload.code, 'ASSISTANT_RATE_LIMITED');
      assert.ok(Number(response.headers['Retry-After']) >= 1);
    }
  }
  assert.equal(accepted, 12);
});

test('un utilisateur authentifié est limité par uid même si son IP change', async () => {
  const accountService = { async verifyToken() { return { uid: 'uid-42' }; } };
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2, accountService });
  const headers = { authorization: 'Bearer valid-token' };
  await limiter({ ip: '203.0.113.1', headers }, responseRecorder(), () => {});
  await limiter({ ip: '203.0.113.2', headers }, responseRecorder(), () => {});
  const response = responseRecorder();
  await limiter({ ip: '203.0.113.3', headers }, response, () => {});
  assert.equal(response.statusCode, 429);
});
