import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { createHash, randomBytes } from 'node:crypto';

function adminCredential(env) {
  if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    return cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }
  return applicationDefault();
}

export function validateHistoryRecords(records) {
  const validated = [];
  const seenIds = new Set();
  for (const record of records) {
    const id = String(record?.id || '');
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
      throw Object.assign(new Error('ID de fiche invalide.'), { code: 'INVALID_RECORD_ID' });
    }
    if (seenIds.has(id)) {
      throw Object.assign(new Error('ID de fiche dupliqué.'), { code: 'DUPLICATE_RECORD_ID' });
    }
    seenIds.add(id);
    validated.push({ record, id });
  }
  return validated;
}

function safeVersion(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function planHistoryRecord({ record, id }, serverData, exists, now) {
  const serverVersion = safeVersion(serverData?.syncVersion);
  const clientVersion = safeVersion(record.syncVersion);
  if (exists && serverVersion > clientVersion) {
    return { conflict: { id, serverVersion, serverRecord: serverData } };
  }
  const syncVersion = serverVersion + 1;
  return {
    synced: { id, syncVersion },
    value: {
      id,
      titre: String(record.titre || '').slice(0, 160),
      data: record.data && typeof record.data === 'object' && !Array.isArray(record.data) ? record.data : {},
      createdAt: String(exists ? (serverData?.createdAt || record.createdAt || now) : (record.createdAt || now)).slice(0, 40),
      hasLocalMedia: Boolean(record.hasLocalMedia),
      syncVersion,
      updatedAt: now,
    },
  };
}

export function createFirebaseAccountService(env = process.env) {
  if (!env.FIREBASE_PROJECT_ID) return null;
  const app = getApps()[0] || initializeApp({ credential: adminCredential(env), projectId: env.FIREBASE_PROJECT_ID });
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const messaging = getMessaging(app);

  return {
    async verifyToken(token) { return auth.verifyIdToken(token, true); },
    async getProfile(uid) {
      const snapshot = await firestore.collection('users').doc(uid).get();
      return snapshot.exists ? snapshot.data() : null;
    },
    async saveProfile(uid, profile) {
      const sanitized = {
        displayName: String(profile.displayName || '').slice(0, 80),
        avatar: String(profile.avatar || '').slice(0, 400_000),
        role: ['buyer','mechanic','seller','owner'].includes(profile.role) ? profile.role : 'buyer',
        consent: Boolean(profile.consent),
        consentAt: profile.consent ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      };
      await firestore.collection('users').doc(uid).set(sanitized, { merge: true });
      return sanitized;
    },
    async getHistory(uid) {
      const snapshot = await firestore.collection('users').doc(uid).collection('history').orderBy('updatedAt', 'desc').limit(100).get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },
    async saveHistory(uid, records) {
      const uniqueRecords = validateHistoryRecords(records);
      const now = new Date().toISOString();
      return firestore.runTransaction(async (transaction) => {
        const entries = uniqueRecords.map(({ record, id }) => ({
          record,
          id,
          ref: firestore.collection('users').doc(uid).collection('history').doc(id),
        }));
        const snapshots = entries.length ? await transaction.getAll(...entries.map(({ ref }) => ref)) : [];
        const synced = [];
        const conflicts = [];
        entries.forEach((entry, index) => {
          const snapshot = snapshots[index];
          const serverData = snapshot?.exists ? snapshot.data() : null;
          const plan = planHistoryRecord(entry, serverData, Boolean(snapshot?.exists), now);
          if (plan.conflict) conflicts.push(plan.conflict);
          else {
            transaction.set(entry.ref, plan.value, { merge: true });
            synced.push(plan.synced);
          }
        });
        return { synced, conflicts };
      });
    },
    async savePushToken(uid, token) {
      const deviceId = createHash('sha256').update(token).digest('hex');
      await firestore.collection('users').doc(uid).collection('devices').doc(deviceId).set({ token, platform: 'android', updatedAt: new Date().toISOString() });
    },
    async sendPush(uid, notification) {
      const devices = await firestore.collection('users').doc(uid).collection('devices').limit(20).get();
      const tokens = devices.docs.map((doc) => doc.data().token).filter(Boolean);
      if (!tokens.length) return { successCount: 0, failureCount: 0 };
      const result = await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: String(notification.title || 'CarDiag').slice(0, 80),
          body: String(notification.body || '').slice(0, 180),
        },
        data: { url: String(notification.url || 'cardiag://fiche').slice(0, 500) },
      });
      const invalid = result.responses
        .map((response, index) => response.success ? null : devices.docs[index]?.ref)
        .filter(Boolean);
      if (invalid.length) {
        const batch = firestore.batch();
        invalid.forEach((ref) => batch.delete(ref));
        await batch.commit();
      }
      return { successCount: result.successCount, failureCount: result.failureCount };
    },
    async createReportShare(uid, report) {
      const id = randomBytes(18).toString('base64url');
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      const payload = JSON.parse(JSON.stringify(report));
      await firestore.collection('reportShares').doc(id).set({
        ownerUid: uid,
        report: payload,
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
      return { id, expiresAt: expiresAt.toISOString() };
    },
    async getReportShare(id) {
      const ref = firestore.collection('reportShares').doc(id);
      const snapshot = await ref.get();
      if (!snapshot.exists) return null;
      const data = snapshot.data();
      if (Date.parse(data.expiresAt) <= Date.now()) {
        await ref.delete();
        return null;
      }
      return { id, report: data.report, createdAt: data.createdAt, expiresAt: data.expiresAt };
    },
    async deleteReportShare(uid, id) {
      const ref = firestore.collection('reportShares').doc(id);
      const snapshot = await ref.get();
      if (!snapshot.exists || snapshot.data().ownerUid !== uid) return false;
      await ref.delete();
      return true;
    },
    async exportUser(uid) {
      return { profile: await this.getProfile(uid), history: await this.getHistory(uid), exportedAt: new Date().toISOString() };
    },
    async deleteUser(uid) {
      const userRef = firestore.collection('users').doc(uid);
      for (const collection of ['history', 'devices']) {
        const snapshot = await userRef.collection(collection).get();
        const batch = firestore.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
      await userRef.delete();
      const shares = await firestore.collection('reportShares').where('ownerUid', '==', uid).get();
      if (!shares.empty) {
        const shareBatch = firestore.batch();
        shares.docs.forEach((doc) => shareBatch.delete(doc.ref));
        await shareBatch.commit();
      }
      await auth.deleteUser(uid);
    },
  };
}
