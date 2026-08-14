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
      const batch = firestore.batch();
      for (const record of records.slice(0, 100)) {
        const id = String(record.id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
        if (!id) continue;
        const ref = firestore.collection('users').doc(uid).collection('history').doc(id);
        const safeRecord = {
          id,
          titre: String(record.titre || '').slice(0, 160),
          data: record.data && typeof record.data === 'object' ? record.data : {},
          createdAt: String(record.createdAt || '').slice(0, 40),
          hasLocalMedia: Boolean(record.hasLocalMedia),
          updatedAt: new Date().toISOString(),
        };
        batch.set(ref, safeRecord, { merge: true });
      }
      await batch.commit();
      return { synced: records.length };
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
