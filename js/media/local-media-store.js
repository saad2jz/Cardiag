// IndexedDB is deliberately used for binary/large visual evidence. Inspection
// records in localStorage retain only a small assetId, so an image can never
// make the whole local record exceed the synchronous storage quota.
const DB_NAME = 'cardiag-media-v1';
const STORE = 'assets';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run(mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const request = action(store);
    tx.oncomplete = () => { db.close(); resolve(request?.result); };
    tx.onerror = () => { db.close(); reject(tx.error || request?.error); };
    tx.onabort = () => { db.close(); reject(tx.error || request?.error); };
  });
}

function assetId() {
  return `media_${crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
}

export async function putLocalMedia(dataUrl, metadata = {}) {
  if (!dataUrl) throw new Error('Photo vide.');
  const id = metadata.assetId || assetId();
  await run('readwrite', (store) => store.put({
    id,
    dataUrl,
    name: String(metadata.name || 'photo.jpg').slice(0, 180),
    type: String(metadata.type || 'image/jpeg').slice(0, 80),
    createdAt: metadata.createdAt || new Date().toISOString(),
  }));
  return id;
}

export async function getLocalMedia(assetId) {
  if (!assetId) return null;
  return run('readonly', (store) => store.get(assetId));
}

export async function deleteLocalMedia(assetId) {
  if (assetId) await run('readwrite', (store) => store.delete(assetId));
}

// Legacy records stored photos inline. The migration is idempotent and leaves
// the in-memory dataUrl available to the UI/PDF during this first session.
export async function migrateAndHydrateRecordMedia(records = {}) {
  const jobs = [];
  Object.values(records).forEach((record) => {
    Object.values(record?.photos || {}).forEach((photos) => (photos || []).forEach((photo) => {
      if (!photo || typeof photo !== 'object') return;
      if (photo.assetId && !photo.dataUrl) {
        jobs.push(getLocalMedia(photo.assetId).then((asset) => { if (asset?.dataUrl) photo.dataUrl = asset.dataUrl; }));
      } else if (photo.dataUrl && !photo.assetId) {
        jobs.push(putLocalMedia(photo.dataUrl, photo).then((id) => { photo.assetId = id; }));
      }
    }));
  });
  await Promise.allSettled(jobs);
}

export function serializableRecordsWithoutMedia(records = {}) {
  const copy = JSON.parse(JSON.stringify(records));
  Object.values(copy).forEach((record) => {
    Object.values(record?.photos || {}).forEach((photos) => (photos || []).forEach((photo) => {
      if (photo && typeof photo === 'object') delete photo.dataUrl;
    }));
  });
  return copy;
}
