import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';

let server;
let baseUrl;
let deleted = false;
let shareDeleted = false;
let historySaveOverride = null;
let teamCreated = false;
const accountService = {
  async verifyToken(token) {
    if (token === 'verified') return { uid: 'user-1', email_verified: true, auth_time: Math.floor(Date.now() / 1000) };
    if (token === 'stale') return { uid: 'user-1', email_verified: true, auth_time: Math.floor(Date.now() / 1000) - (11 * 60) };
    if (token === 'unverified') return { uid: 'user-1', email_verified: false };
    throw new Error('invalid token');
  },
  async getProfile() { return { role: 'buyer' }; },
  async saveProfile(_uid, profile) { return { ...profile, role: profile.role || 'buyer' }; },
  async getHistory() { return [{ id: 'fiche-1' }]; },
  async saveHistory(_uid, records) {
    if (historySaveOverride) return historySaveOverride(records);
    return { synced: records.map((record) => ({ id: record.id, syncVersion: 1 })), conflicts: [] };
  },
  async savePushToken() {},
  async sendPush() { return { successCount: 1, failureCount: 0 }; },
  async createReportShare() { return { id: 'share-token-12345678901234567890', expiresAt: '2099-01-01T00:00:00.000Z' }; },
  async getReportShare(id) { return id === 'share-token-12345678901234567890' ? { id, report: { title: 'Peugeot 308' }, expiresAt: '2099-01-01T00:00:00.000Z' } : null; },
  async deleteReportShare() { shareDeleted = true; return true; },
  async exportUser() { return { profile: { role: 'buyer' }, history: [] }; },
  async deleteUser() { deleted = true; },
  async listTeamMembers() { return { team: teamCreated ? { id: 'team-1', name: 'Garage Central' } : null, members: teamCreated ? [{ uid: 'user-1', role: 'owner' }] : [] }; },
  async createTeam() { teamCreated = true; return { id: 'team-1', name: 'Garage Central' }; },
  async createTeamInvitation() { return { token: 'a'.repeat(43), team: { id: 'team-1', name: 'Garage Central' }, email: 'member@example.com', role: 'editor', expiresAt: '2099-01-01T00:00:00.000Z' }; },
  async acceptTeamInvitation() { return { teamId: 'team-1', role: 'editor' }; },
  async updateTeamMember() {},
  async removeTeamMember() {},
  async getTeamHistory() { return { team: { id: 'team-1' }, records: [{ id: 'fiche-1' }] }; },
  async shareHistoryWithTeam() { return { id: 'fiche-1', teamId: 'team-1' }; },
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
  assert.deepEqual(await sync.json(), { synced: [{ id: 'fiche-1', syncVersion: 1 }], conflicts: [] });
  assert.deepEqual(await push.json(), { successCount: 1, failureCount: 0 });
});

test('history synchronization exposes partial conflicts with status 409', async () => {
  historySaveOverride = async () => ({
    synced: [{ id: 'fiche-ok', syncVersion: 2 }],
    conflicts: [{ id: 'fiche-conflict', serverVersion: 3, serverRecord: { id: 'fiche-conflict' } }],
  });
  const response = await fetch(`${baseUrl}/api/account/history`, {
    method: 'PUT',
    headers: { Authorization: 'Bearer verified', 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ id: 'fiche-ok' }, { id: 'fiche-conflict' }] }),
  });
  historySaveOverride = null;
  assert.equal(response.status, 409);
  const payload = await response.json();
  assert.equal(payload.synced[0].id, 'fiche-ok');
  assert.equal(payload.conflicts[0].serverVersion, 3);
});

test('history synchronization translates validation failures and limits bulk size', async () => {
  historySaveOverride = async () => { throw Object.assign(new Error('ID de fiche invalide.'), { code: 'INVALID_RECORD_ID' }); };
  const headers = { Authorization: 'Bearer verified', 'Content-Type': 'application/json' };
  const invalid = await fetch(`${baseUrl}/api/account/history`, { method: 'PUT', headers, body: JSON.stringify({ records: [{ id: 'bad/id' }] }) });
  historySaveOverride = null;
  const excessive = await fetch(`${baseUrl}/api/account/history`, { method: 'PUT', headers, body: JSON.stringify({ records: Array.from({ length: 101 }, (_, index) => ({ id: `f-${index}` })) }) });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).code, 'INVALID_RECORD_ID');
  assert.equal(excessive.status, 400);
  assert.equal((await excessive.json()).code, 'TOO_MANY_RECORDS');
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

test('account deletion requires a recent Firebase authentication', async () => {
  const response = await fetch(`${baseUrl}/api/account`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer stale', 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmation: 'SUPPRIMER' }),
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, 'RECENT_LOGIN_REQUIRED');
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

test('clean public legal aliases redirect to their static documents', async () => {
  for (const [path, target] of [['privacy', '/privacy.html'], ['terms', '/terms.html'], ['account-deletion', '/account-deletion.html']]) {
    const response = await fetch(`${baseUrl}/${path}`, { redirect: 'manual' });
    assert.equal(response.status, 308, path);
    assert.equal(response.headers.get('location'), target, path);
  }
});

test('professional team API requires configured delivery for invitations and keeps team records protected', async () => {
  const headers = { Authorization: 'Bearer verified', 'Content-Type': 'application/json' };
  const created = await fetch(`${baseUrl}/api/account/team`, { method: 'POST', headers, body: JSON.stringify({ name: 'Garage Central' }) });
  assert.equal(created.status, 201);
  assert.equal((await fetch(`${baseUrl}/api/account/team`, { headers })).status, 200);
  const invitation = await fetch(`${baseUrl}/api/account/team/invitations`, { method: 'POST', headers, body: JSON.stringify({ email: 'member@example.com', role: 'editor' }) });
  assert.equal(invitation.status, 503);
  const shared = await fetch(`${baseUrl}/api/account/team/history/fiche-1`, { method: 'POST', headers });
  assert.deepEqual(await shared.json(), { id: 'fiche-1', teamId: 'team-1' });
});
