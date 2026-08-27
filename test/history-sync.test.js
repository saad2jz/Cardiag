import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planHistoryRecord, validateHistoryRecords } from '../src/auth/firebase-admin.js';
import { applySyncResult, buildSyncRecords, pendingLocalRecordCount } from '../js/native/sync-queue.js';

test('history validation rejects invalid and duplicate document identifiers', () => {
  assert.throws(() => validateHistoryRecords([{ id: 'bad/id' }]), { code: 'INVALID_RECORD_ID' });
  assert.throws(() => validateHistoryRecords([{ id: 'same' }, { id: 'same' }]), { code: 'DUPLICATE_RECORD_ID' });
  assert.equal(validateHistoryRecords([{ id: 'fiche_1-ok' }])[0].id, 'fiche_1-ok');
});

test('legacy history records receive version one while stale clients conflict', () => {
  const now = '2026-08-14T10:00:00.000Z';
  const legacy = planHistoryRecord({ id: 'legacy', record: { id: 'legacy', titre: 'Ancienne fiche', data: {} } }, null, false, now);
  assert.equal(legacy.value.syncVersion, 1);
  assert.equal(legacy.value.updatedAt, now);

  const conflict = planHistoryRecord(
    { id: 'stale', record: { id: 'stale', syncVersion: 1 } },
    { id: 'stale', syncVersion: 3, createdAt: '2026-01-01T00:00:00.000Z' },
    true,
    now,
  );
  assert.equal(conflict.conflict.serverVersion, 3);
  assert.equal(conflict.conflict.serverRecord.id, 'stale');
});

test('malformed server versions cannot trigger string concatenation', () => {
  const result = planHistoryRecord(
    { id: 'fiche', record: { id: 'fiche', syncVersion: 0, data: [] } },
    { id: 'fiche', syncVersion: '2' },
    true,
    '2026-08-14T10:00:00.000Z',
  );
  assert.equal(result.value.syncVersion, 1);
  assert.deepEqual(result.value.data, {});
});

test('legacy clients preserve a server-side draft marker during normal sync', () => {
  const result = planHistoryRecord(
    { id: 'draft', record: { id: 'draft', syncVersion: 1, data: {} } },
    { id: 'draft', syncVersion: 1, draft: { status: 'draft', reminderSentAt: '2026-08-01T00:00:00.000Z' } },
    true,
    '2026-08-14T10:00:00.000Z',
  );
  assert.equal(result.value.draft.status, 'draft');
  assert.equal(result.value.draft.reminderSentAt, '2026-08-01T00:00:00.000Z');
});

test('client sync exports versions, excludes unresolved conflicts and applies partial results', () => {
  const records = buildSyncRecords([
    { id: 'ready', syncVersion: 2, photos: { moteur: [{ dataUrl: 'x' }] }, data: {} },
    { id: 'legacy', data: {} },
    { id: 'blocked', syncConflict: { serverVersion: 4 }, data: {} },
  ]);
  assert.deepEqual(records.map(({ id, syncVersion }) => [id, syncVersion]), [['ready', 2], ['legacy', 0]]);
  assert.equal(records[0].hasLocalMedia, true);
  assert.equal(records[0].draft.status, 'draft');

  const calls = [];
  const bridge = {
    setSyncVersion: (id, version) => calls.push(['synced', id, version]),
    markConflict: (id, _record, version) => calls.push(['conflict', id, version]),
  };
  const counts = applySyncResult({
    synced: [{ id: 'ready', syncVersion: 3 }],
    conflicts: [{ id: 'blocked', serverVersion: 4, serverRecord: { id: 'blocked' } }],
  }, bridge);
  assert.deepEqual(calls, [['synced', 'ready', 3], ['conflict', 'blocked', 4]]);
  assert.deepEqual(counts, { synced: 1, conflicts: 1 });
});

test('local migration only offers records not already confirmed by the cloud', () => {
  const count = pendingLocalRecordCount([
    { id: 'new', syncVersion: 0 },
    { id: 'legacy' },
    { id: 'synced', syncVersion: 4 },
    { id: 'conflict', syncVersion: 0, syncConflict: { serverVersion: 3 } },
  ]);
  assert.equal(count, 2);
});
