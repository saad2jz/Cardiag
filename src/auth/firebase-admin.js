import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { createHash, randomBytes } from 'node:crypto';
import { garageSlug, isGarageStatus, isReviewStatus, key, publicGarage, sanitizeGarage, sanitizeReview } from '../marketplace/garage-utils.js';

export function normalizeFirebasePrivateKey(value) {
  let privateKey = String(value || '').trim();

  // Render peut conserver les guillemets d'une valeur copiée depuis le JSON.
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    try {
      privateKey = JSON.parse(privateKey);
    } catch {
      privateKey = privateKey.slice(1, -1);
    }
  } else if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
    privateKey = privateKey.slice(1, -1);
  }

  privateKey = privateKey
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\r\n/g, '\n')
    .trim();

  const hasPemEnvelope = /^-----BEGIN (?:RSA )?PRIVATE KEY-----\n[\s\S]+\n-----END (?:RSA )?PRIVATE KEY-----$/.test(privateKey);
  if (!hasPemEnvelope) {
    throw Object.assign(
      new Error('FIREBASE_PRIVATE_KEY doit contenir une clé PEM complète, sans nom de variable ni virgule JSON.'),
      { code: 'FIREBASE_PRIVATE_KEY_FORMAT' },
    );
  }
  return `${privateKey}\n`;
}

function adminCredential(env) {
  if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    return cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: normalizeFirebasePrivateKey(env.FIREBASE_PRIVATE_KEY),
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

const TEAM_ROLES = new Set(['owner', 'editor', 'viewer']);

function normalizedEmail(value) {
  return String(value || '').trim().toLowerCase().slice(0, 254);
}

function sanitizeDraft(value) {
  const source = value && typeof value === 'object' ? value : {};
  const status = source.status === 'draft' ? 'draft' : 'complete';
  return {
    status,
    reminderSentAt: status === 'draft' && source.reminderSentAt ? String(source.reminderSentAt).slice(0, 40) : null,
  };
}

function teamRole(value) {
  return TEAM_ROLES.has(value) ? value : null;
}

function activeMember(data) {
  return data?.status === 'active' && teamRole(data.role);
}

export function sanitizeAccountProfile(profile, now = new Date().toISOString()) {
  const source = profile && typeof profile === 'object' ? profile : {};
  const role = ['buyer','mechanic','rental','seller','owner'].includes(source.role) ? source.role : 'buyer';
  const accountType = source.accountType === 'professional' || ['mechanic','rental'].includes(role) ? 'professional' : 'personal';
  return {
    displayName: String(source.displayName || source.contactName || '').trim().slice(0, 80),
    avatar: String(source.avatar || '').slice(0, 400_000),
    role,
    accountType,
    phone: String(source.phone || '').trim().slice(0, 30),
    garageName: String(source.garageName || '').trim().slice(0, 120),
    contactName: String(source.contactName || '').trim().slice(0, 80),
    siret: String(source.siret || '').replace(/\D/g, '').slice(0, 14),
    address: String(source.address || '').trim().slice(0, 240),
    website: String(source.website || '').trim().slice(0, 240),
    professionalKind: source.professionalKind === 'rental' ? 'rental' : 'mechanic',
    fleetSize: String(source.fleetSize || '').replace(/\D/g, '').slice(0, 7),
    fleetReference: String(source.fleetReference || '').trim().slice(0, 60),
    consent: Boolean(source.consent),
    consentAt: source.consent ? String(source.consentAt || now).slice(0, 40) : null,
    updatedAt: now,
  };
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
      // Old clients do not yet send the draft field. Keep the server state in
      // that case instead of accidentally marking an unfinished inspection as
      // complete during a normal offline sync.
      draft: record.draft || record.data?.draft
        ? sanitizeDraft(record.draft || record.data?.draft)
        : (exists ? (serverData?.draft || sanitizeDraft()) : sanitizeDraft()),
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
  const adminUids = new Set(String(env.ADMIN_UIDS || '').split(',').map((value) => value.trim()).filter(Boolean));

  async function createGarage(input, { status, createdBy = '' } = {}) {
    const garage = sanitizeGarage(input, { status, createdBy });
    const baseSlug = garageSlug(garage.name, garage.city);
    const now = new Date().toISOString();
    // The slug is also the document id. A transaction guarantees a stable,
    // unique public URL even when two candidates have the same name and city.
    return firestore.runTransaction(async (transaction) => {
      for (let suffix = 1; suffix <= 99; suffix += 1) {
        const slug = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
        const ref = firestore.collection('garages').doc(slug);
        const existing = await transaction.get(ref);
        if (existing.exists) continue;
        const value = { ...garage, id: slug, slug, ratingAverage: 0, reviewCount: 0, createdAt: now, updatedAt: now, moderatedAt: status === 'active' ? now : null, moderatedBy: status === 'active' ? createdBy : '' };
        transaction.set(ref, value);
        return value;
      }
      throw Object.assign(new Error('Impossible de générer une URL unique pour ce garage.'), { code: 'GARAGE_SLUG_EXHAUSTED' });
    });
  }

  async function refreshGarageRating(garageId) {
    const reviews = await firestore.collection('garage_reviews').where('garageId', '==', garageId).where('status', '==', 'published').get();
    const count = reviews.size;
    const average = count ? reviews.docs.reduce((sum, doc) => sum + Number(doc.data().rating || 0), 0) / count : 0;
    await firestore.collection('garages').doc(garageId).set({ ratingAverage: Math.round(average * 10) / 10, reviewCount: count, updatedAt: new Date().toISOString() }, { merge: true });
    return { ratingAverage: Math.round(average * 10) / 10, reviewCount: count };
  }

  return {
    async verifyToken(token) { return auth.verifyIdToken(token, true); },
    async isAdmin(decoded) { return Boolean(decoded?.admin) || adminUids.has(String(decoded?.uid || '')); },
    async getProfile(uid) {
      const snapshot = await firestore.collection('users').doc(uid).get();
      return snapshot.exists ? snapshot.data() : null;
    },
    async saveProfile(uid, profile) {
      const sanitized = sanitizeAccountProfile(profile);
      await firestore.collection('users').doc(uid).set(sanitized, { merge: true });
      return sanitized;
    },
    async getBilling(uid) {
      const snapshot = await firestore.collection('users').doc(uid).get();
      const billing = snapshot.data()?.billing || {};
      return { customerId: String(billing.customerId || ''), subscriptionId: String(billing.subscriptionId || ''), status: String(billing.status || 'inactive'), updatedAt: billing.updatedAt || null };
    },
    async saveBilling(uid, billing = {}) {
      const value = { customerId: String(billing.customerId || '').slice(0, 255), subscriptionId: String(billing.subscriptionId || '').slice(0, 255), status: String(billing.status || 'inactive').slice(0, 64), updatedAt: new Date().toISOString() };
      await firestore.collection('users').doc(uid).set({ billing: value }, { merge: true });
      return value;
    },
    async createGarageApplication(input) {
      return createGarage(input, { status: 'pending' });
    },
    async createAdminGarage(uid, input) {
      const status = isGarageStatus(input?.status) ? input.status : 'active';
      return createGarage(input, { status, createdBy: uid });
    },
    async listPublicGarages({ city = '', specialty = '', minRating = '', search = '', cursor = '', limit = 12 } = {}) {
      const safeLimit = Math.max(1, Math.min(24, Number(limit) || 12));
      const cityKey = key(city);
      const specialtyKey = key(specialty);
      const searchKey = key(search);
      let query = firestore.collection('garages').where('status', '==', 'active');
      if (cityKey) query = query.where('cityKey', '==', cityKey);
      if (specialtyKey) query = query.where('specialtiesKey', 'array-contains', specialtyKey);
      if (Number.isFinite(Number(minRating)) && Number(minRating) > 0) query = query.where('ratingAverage', '>=', Math.min(5, Number(minRating)));
      if (searchKey) query = query.where('nameKey', '>=', searchKey).where('nameKey', '<=', `${searchKey}\uf8ff`).orderBy('nameKey');
      else if (Number.isFinite(Number(minRating)) && Number(minRating) > 0) query = query.orderBy('ratingAverage', 'desc').orderBy('nameKey');
      else query = query.orderBy('nameKey');
      if (cursor && /^[a-z0-9-]{1,110}$/.test(String(cursor))) {
        const cursorSnapshot = await firestore.collection('garages').doc(String(cursor)).get();
        if (cursorSnapshot.exists) query = query.startAfter(cursorSnapshot);
      }
      const snapshot = await query.limit(safeLimit + 1).get();
      const hasMore = snapshot.docs.length > safeLimit;
      const docs = snapshot.docs.slice(0, safeLimit);
      return { garages: docs.map((doc) => publicGarage(doc.data())), nextCursor: hasMore ? docs.at(-1)?.id || null : null };
    },
    async getPublicGarage(slug) {
      const snapshot = await firestore.collection('garages').doc(String(slug || '')).get();
      if (!snapshot.exists || snapshot.data().status !== 'active') return null;
      const garage = publicGarage(snapshot.data());
      const reviews = await firestore.collection('garage_reviews').where('garageId', '==', garage.id).where('status', '==', 'published').orderBy('createdAt', 'desc').limit(30).get();
      return { garage, reviews: reviews.docs.map((doc) => ({ id:doc.id, rating:Number(doc.data().rating || 0), authorName:String(doc.data().authorName || 'Client CarDiag'), comment:String(doc.data().comment || ''), createdAt:doc.data().createdAt })) };
    },
    async listGarageSitemapEntries() {
      const snapshot = await firestore.collection('garages').where('status', '==', 'active').orderBy('updatedAt', 'desc').limit(50_000).get();
      return snapshot.docs.map((doc) => ({ slug:doc.id, updatedAt:String(doc.data().updatedAt || doc.data().createdAt || '') }));
    },
    async createGarageReview(slug, input) {
      const garageRef = firestore.collection('garages').doc(String(slug || ''));
      const garage = await garageRef.get();
      if (!garage.exists || garage.data().status !== 'active') throw Object.assign(new Error('Ce garage est introuvable ou non publié.'), { code: 'GARAGE_NOT_FOUND' });
      const review = sanitizeReview(input);
      const id = randomBytes(18).toString('base64url');
      const now = new Date().toISOString();
      const value = { id, garageId:garage.id, ...review, status:'pending', createdAt:now, updatedAt:now };
      await firestore.collection('garage_reviews').doc(id).set(value);
      return { id, status:value.status, createdAt:now };
    },
    async listAdminGarages({ status = '', limit = 12 } = {}) {
      let query = firestore.collection('garages');
      if (isGarageStatus(status)) query = query.where('status', '==', status);
      const snapshot = await query.orderBy('updatedAt', 'desc').limit(Math.max(1, Math.min(100, Number(limit) || 12))).get();
      return { garages:snapshot.docs.map((doc) => doc.data()) };
    },
    async moderateGarage(uid, id, status) {
      if (!isGarageStatus(status)) throw Object.assign(new Error('Statut garage invalide.'), { code: 'GARAGE_STATUS_INVALID' });
      const ref = firestore.collection('garages').doc(String(id || ''));
      const snapshot = await ref.get();
      if (!snapshot.exists) throw Object.assign(new Error('Garage introuvable.'), { code: 'GARAGE_NOT_FOUND' });
      const now = new Date().toISOString();
      await ref.set({ status, moderatedAt:now, moderatedBy:uid, updatedAt:now }, { merge:true });
      return { ...snapshot.data(), status, moderatedAt:now, moderatedBy:uid, updatedAt:now };
    },
    async listAdminReviews({ status = 'pending', limit = 12 } = {}) {
      let query = firestore.collection('garage_reviews');
      if (isReviewStatus(status)) query = query.where('status', '==', status);
      const snapshot = await query.orderBy('createdAt', 'desc').limit(Math.max(1, Math.min(100, Number(limit) || 12))).get();
      return { reviews:snapshot.docs.map((doc) => doc.data()) };
    },
    async moderateGarageReview(uid, id, status) {
      if (!isReviewStatus(status) || status === 'pending') throw Object.assign(new Error('Statut avis invalide.'), { code: 'REVIEW_STATUS_INVALID' });
      const ref = firestore.collection('garage_reviews').doc(String(id || ''));
      const snapshot = await ref.get();
      if (!snapshot.exists) throw Object.assign(new Error('Avis introuvable.'), { code: 'REVIEW_NOT_FOUND' });
      const review = snapshot.data();
      const now = new Date().toISOString();
      await ref.set({ status, moderatedAt:now, moderatedBy:uid, updatedAt:now }, { merge:true });
      if (review.status === 'published' || status === 'published') await refreshGarageRating(review.garageId);
      return { ...review, status, moderatedAt:now, moderatedBy:uid, updatedAt:now };
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
    async findDraftsForMaintenance(limit = 250) {
      const snapshot = await firestore.collectionGroup('history').limit(Math.max(1, Math.min(500, limit))).get();
      const drafts = [];
      for (const doc of snapshot.docs) {
        const record = doc.data();
        if (record?.draft?.status !== 'draft') continue;
        const uid = doc.ref.parent.parent?.id;
        if (!uid) continue;
        try {
          const user = await auth.getUser(uid);
          if (user.email) drafts.push({ uid, email: user.email, id: doc.id, ...record });
        } catch { /* Deleted or unavailable Firebase Auth users are ignored. */ }
      }
      return drafts;
    },
    async markDraftReminder(uid, id, reminderSentAt) {
      await firestore.collection('users').doc(uid).collection('history').doc(id).set({
        draft: { status: 'draft', reminderSentAt: String(reminderSentAt).slice(0, 40) },
      }, { merge: true });
    },
    async purgeDraft(uid, id) {
      const ref = firestore.collection('users').doc(uid).collection('history').doc(id);
      const snapshot = await ref.get();
      if (snapshot.exists && snapshot.data()?.draft?.status === 'draft') await ref.delete();
    },
    async getTeam(uid) {
      // A single-field collection-group query avoids imposing a composite
      // Firestore index merely to load the current member's organisation.
      const members = await firestore.collectionGroup('members').where('uid', '==', uid).limit(10).get();
      if (members.empty) return null;
      const memberDoc = members.docs.find((doc) => activeMember(doc.data()));
      if (!memberDoc) return null;
      const teamRef = memberDoc.ref.parent.parent;
      const team = await teamRef.get();
      return team.exists ? { id: team.id, ...team.data(), membership: memberDoc.data() } : null;
    },
    async createTeam(uid, input) {
      const profile = await this.getProfile(uid);
      if (profile?.accountType !== 'professional') {
        throw Object.assign(new Error('Le partage d’équipe est réservé aux comptes professionnels.'), { code: 'TEAM_PRO_REQUIRED' });
      }
      const existing = await this.getTeam(uid);
      if (existing) return existing;
      const id = randomBytes(18).toString('base64url');
      const now = new Date().toISOString();
      const name = String(input?.name || profile.garageName || 'Équipe CarDiag').trim().slice(0, 120);
      const teamRef = firestore.collection('teams').doc(id);
      await firestore.runTransaction(async (transaction) => {
        transaction.set(teamRef, { id, name, ownerUid: uid, createdAt: now, updatedAt: now });
        transaction.set(teamRef.collection('members').doc(uid), {
          uid, role: 'owner', status: 'active', displayName: String(profile.displayName || profile.contactName || '').slice(0, 80), joinedAt: now,
        });
      });
      return { id, name, ownerUid: uid, createdAt: now, updatedAt: now, membership: { uid, role: 'owner', status: 'active' } };
    },
    async listTeamMembers(uid) {
      const team = await this.getTeam(uid);
      if (!team) return { team: null, members: [] };
      const members = await firestore.collection('teams').doc(team.id).collection('members').orderBy('joinedAt', 'asc').get();
      return { team, members: members.docs.map((doc) => doc.data()) };
    },
    async createTeamInvitation(uid, input) {
      const team = await this.getTeam(uid);
      if (!team || team.membership.role !== 'owner') throw Object.assign(new Error('Seul le propriétaire de l’équipe peut inviter un membre.'), { code: 'TEAM_OWNER_REQUIRED' });
      const email = normalizedEmail(input?.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('Adresse e-mail invalide.'), { code: 'TEAM_INVITE_EMAIL_INVALID' });
      const role = ['editor', 'viewer'].includes(input?.role) ? input.role : 'viewer';
      const token = randomBytes(32).toString('base64url');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await firestore.collection('teamInvitations').doc(token).set({
        token, teamId: team.id, email, role, invitedBy: uid, status: 'pending', createdAt: now.toISOString(), expiresAt,
      });
      return { token, team, email, role, expiresAt };
    },
    async cancelTeamInvitation(uid, token) {
      const ref = firestore.collection('teamInvitations').doc(String(token || ''));
      const snapshot = await ref.get();
      if (snapshot.exists && snapshot.data()?.invitedBy === uid) await ref.delete();
    },
    async acceptTeamInvitation(uid, email, token) {
      const ref = firestore.collection('teamInvitations').doc(String(token || ''));
      const now = new Date().toISOString();
      return firestore.runTransaction(async (transaction) => {
        const invite = await transaction.get(ref);
        if (!invite.exists) throw Object.assign(new Error('Invitation introuvable.'), { code: 'TEAM_INVITE_NOT_FOUND' });
        const data = invite.data();
        if (data.status !== 'pending' || Date.parse(data.expiresAt) <= Date.now()) throw Object.assign(new Error('Invitation expirée ou déjà utilisée.'), { code: 'TEAM_INVITE_EXPIRED' });
        if (normalizedEmail(email) !== normalizedEmail(data.email)) throw Object.assign(new Error('Cette invitation est réservée à une autre adresse e-mail.'), { code: 'TEAM_INVITE_EMAIL_MISMATCH' });
        const teamRef = firestore.collection('teams').doc(data.teamId);
        transaction.set(teamRef.collection('members').doc(uid), { uid, email: normalizedEmail(email), role: data.role, status: 'active', joinedAt: now }, { merge: true });
        transaction.set(ref, { status: 'accepted', acceptedBy: uid, acceptedAt: now }, { merge: true });
        return { teamId: data.teamId, role: data.role };
      });
    },
    async updateTeamMember(uid, memberUid, role) {
      const team = await this.getTeam(uid);
      if (!team || team.membership.role !== 'owner') throw Object.assign(new Error('Seul le propriétaire de l’équipe peut modifier les rôles.'), { code: 'TEAM_OWNER_REQUIRED' });
      const safeRole = ['editor', 'viewer'].includes(role) ? role : null;
      if (!safeRole || memberUid === uid) throw Object.assign(new Error('Rôle ou membre invalide.'), { code: 'TEAM_MEMBER_INVALID' });
      await firestore.collection('teams').doc(team.id).collection('members').doc(memberUid).set({ role: safeRole, updatedAt: new Date().toISOString() }, { merge: true });
    },
    async removeTeamMember(uid, memberUid) {
      const team = await this.getTeam(uid);
      if (!team || team.membership.role !== 'owner' || memberUid === uid) throw Object.assign(new Error('Suppression de membre non autorisée.'), { code: 'TEAM_OWNER_REQUIRED' });
      await firestore.collection('teams').doc(team.id).collection('members').doc(memberUid).delete();
    },
    async shareHistoryWithTeam(uid, id) {
      const team = await this.getTeam(uid);
      if (!team || !activeMember(team.membership) || !['owner', 'editor'].includes(team.membership.role)) throw Object.assign(new Error('Droit de partage insuffisant.'), { code: 'TEAM_SHARE_FORBIDDEN' });
      const history = await firestore.collection('users').doc(uid).collection('history').doc(id).get();
      if (!history.exists) throw Object.assign(new Error('Fiche introuvable.'), { code: 'TEAM_RECORD_NOT_FOUND' });
      const now = new Date().toISOString();
      await firestore.collection('teams').doc(team.id).collection('inspections').doc(id).set({
        ...history.data(), id, ownerUid: uid, teamId: team.id, sharedAt: now, updatedAt: now,
      }, { merge: true });
      return { id, teamId: team.id };
    },
    async getTeamHistory(uid) {
      const team = await this.getTeam(uid);
      if (!team || !activeMember(team.membership)) throw Object.assign(new Error('Équipe introuvable.'), { code: 'TEAM_NOT_FOUND' });
      const snapshot = await firestore.collection('teams').doc(team.id).collection('inspections').orderBy('updatedAt', 'desc').limit(100).get();
      return { team, records: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
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
      const expiresAt = Date.parse(data.expiresAt);
      // A corrupted or missing expiry must never make a report public forever.
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
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
      // Remove the account from teams and remove teams it owns. Team records
      // are server-only, so deleting them here prevents orphaned shared data.
      const memberships = await firestore.collectionGroup('members').where('uid', '==', uid).get();
      for (const member of memberships.docs) {
        const teamRef = member.ref.parent.parent;
        const team = await teamRef.get();
        if (team.exists && team.data()?.ownerUid === uid) {
          for (const collection of ['members', 'inspections']) {
            const children = await teamRef.collection(collection).get();
            const batch = firestore.batch();
            children.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
          }
          await teamRef.delete();
        } else await member.ref.delete();
      }
      const invitations = await firestore.collection('teamInvitations').where('invitedBy', '==', uid).get();
      if (!invitations.empty) {
        const batch = firestore.batch();
        invitations.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
      await auth.deleteUser(uid);
    },
  };
}
