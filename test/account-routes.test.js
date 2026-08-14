import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';

let server;
let baseUrl;
let deleted = false;
let shareDeleted = false;
const accountService = {
  async verifyToken(token) {
    if (token === 'verified') return { uid: 'user-1', email_verified: true };
    if (token === 'unverified') return { uid: 'user-1', email_verified: false };
    throw new Error('invalid token');
  },
  async getProfile() { return { role: 'buyer' }; },
  async saveProfile(_uid, profile) { return { ...profile, role: profile.role || 'buyer' }; },
  async getHistory() { return [{ id: 'fiche-1' }]; },
  async saveHistory(_uid, records) { return { synced: records.length }; },
  async savePushToken() {},
  async sendPush() { return { successCount: 1, failureCount: 0 }; },
  async createReportShare() { return { id: 'share-token-12345678901234567890', expiresAt: '2099-01-01T00:00:00.000Z' }; },
  async getReportShare(id) { return id === 'share-token-12345678901234567890' ? { id, report: { title: 'Peugeot 308' }, expiresAt: '2099-01-01T00:00:00.000Z' } : null; },
  async deleteReportShare() { shareDeleted = true; return true; },
  async exportUser() { return { profile: { role: 'buyer' }, history: [] }; },
  async deleteUser() { deleted = true; },
};

before(async () => {
  server = createApp({
    llmService: { chat: async () => ({}), inline: async () => '' },
    accountService,
  }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test('account routes reject missing or invalid Firebase tokens', async () => {
  assert.equal((await fetch(`${baseUrl}/api/account/profile`)).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/account/profile`, { headers: { Authorization: 'Bearer invalid' } })).status, 401);
});

test('verified accounts can synchronize history and receive push tests', async () => {
  const headers = { Authorization: 'Bearer verified', 'Content-Type': 'application/json' };
  const sync = await fetch(`${baseUrl}/api/account/history`, { method: 'PUT', headers, body: JSON.stringify({ records: [{ id: 'fiche-1' }] }) });
  const push = await fetch(`${baseUrl}/api/account/notifications/test`, { method: 'POST', headers });
  assert.deepEqual(await sync.json(), { synced: 1 });
  assert.deepEqual(await push.json(), { successCount: 1, failureCount: 0 });
});

test('unverified email cannot synchronize account data', async () => {
  const response = await fetch(`${baseUrl}/api/account/history`, { headers: { Authorization: 'Bearer unverified' } });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'EMAIL_NOT_VERIFIED');
});

test('account deletion requires explicit confirmation', async () => {
  const headers = { Authorization: 'Bearer verified', 'Content-Type': 'application/json' };
  assert.equal((await fetch(`${baseUrl}/api/account`, { method: 'DELETE', headers, body: '{}' })).status, 400);
  assert.equal((await fetch(`${baseUrl}/api/account`, { method: 'DELETE', headers, body: JSON.stringify({ confirmation: 'SUPPRIMER' }) })).status, 204);
  assert.equal(deleted, true);
});

test('reports can be shared through an unguessable read-only URL and revoked', async () => {
  const headers = { Authorization: 'Bearer verified', 'Content-Type': 'application/json' };
  const created = await fetch(`${baseUrl}/api/account/shares`, { method: 'POST', headers, body: JSON.stringify({ report: { title: 'Peugeot 308' } }) });
  const share = await created.json();
  assert.equal(created.status, 201);
  assert.match(share.url, /\/r\/share-token-/);
  const publicReport = await fetch(`${baseUrl}/api/shared-reports/share-token-12345678901234567890`);
  assert.deepEqual((await publicReport.json()).report, { title: 'Peugeot 308' });
  assert.equal((await fetch(`${baseUrl}/api/account/shares/${share.id}`, { method: 'DELETE', headers })).status, 204);
  assert.equal(shareDeleted, true);
});
