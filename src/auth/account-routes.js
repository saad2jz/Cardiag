import express from 'express';

function bearerToken(req) {
  const match = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

export function createAccountRouter(service) {
  const router = express.Router();
  router.use(async (req, res, next) => {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: 'Authentification requise.', code: 'AUTH_REQUIRED' });
    try {
      req.user = await service.verifyToken(token);
      return next();
    } catch {
      return res.status(401).json({ error: 'Session invalide ou expirée.', code: 'AUTH_INVALID' });
    }
  });
  const verifiedOnly = (req, res, next) => req.user.email_verified
    ? next()
    : res.status(403).json({ error: 'Vérifiez votre adresse email avant d’activer la synchronisation.', code: 'EMAIL_NOT_VERIFIED' });
  router.get('/profile', async (req, res) => res.json({ profile: await service.getProfile(req.user.uid) }));
  router.put('/profile', async (req, res) => res.json({ profile: await service.saveProfile(req.user.uid, req.body || {}) }));
  router.get('/history', verifiedOnly, async (req, res) => res.json({ records: await service.getHistory(req.user.uid) }));
  router.put('/history', verifiedOnly, async (req, res) => {
    if (!Array.isArray(req.body?.records)) return res.status(400).json({ error: 'records doit être un tableau.', code: 'INVALID_RECORDS' });
    if (req.body.records.length > 100) return res.status(400).json({ error: 'Maximum 100 fiches par synchronisation.', code: 'TOO_MANY_RECORDS' });
    if (JSON.stringify(req.body).length > 900_000) return res.status(413).json({ error: 'Synchronisation trop volumineuse.', code: 'SYNC_TOO_LARGE' });
    try {
      const result = await service.saveHistory(req.user.uid, req.body.records);
      return res.status(result.conflicts?.length ? 409 : 200).json(result);
    } catch (error) {
      if (['INVALID_RECORD_ID','DUPLICATE_RECORD_ID'].includes(error?.code)) {
        return res.status(400).json({ error: error.message, code: error.code });
      }
      return res.status(500).json({ error: 'La synchronisation est temporairement indisponible.', code: 'HISTORY_SYNC_FAILED' });
    }
  });
  router.post('/push-token', verifiedOnly, async (req, res) => {
    const token = String(req.body?.token || '');
    if (token.length < 20 || token.length > 4096) return res.status(400).json({ error: 'Token push invalide.' });
    await service.savePushToken(req.user.uid, token);
    return res.json({ registered: true });
  });
  router.post('/notifications/test', verifiedOnly, async (req, res) => {
    const result = await service.sendPush(req.user.uid, {
      title: 'Notifications CarDiag activées',
      body: 'Vous recevrez ici les statuts d’expertise et rappels configurés.',
      url: 'cardiag://fiche',
    });
    return res.json(result);
  });
  router.post('/shares', verifiedOnly, async (req, res) => {
    const serialized = JSON.stringify(req.body?.report || null);
    if (!req.body?.report || serialized.length > 750_000) return res.status(413).json({ error: 'Rapport trop volumineux pour le partage.' });
    const share = await service.createReportShare(req.user.uid, req.body.report);
    const publicOrigin = String(process.env.PUBLIC_ORIGIN || 'https://cardiag.online').replace(/\/$/, '');
    return res.status(201).json({ ...share, url: `${publicOrigin}/r/${share.id}` });
  });
  router.delete('/shares/:id', verifiedOnly, async (req, res) => {
    const removed = await service.deleteReportShare(req.user.uid, String(req.params.id || ''));
    return removed ? res.status(204).end() : res.status(404).json({ error: 'Lien introuvable.' });
  });
  router.get('/export', async (req, res) => res.json(await service.exportUser(req.user.uid)));
  router.delete('/', async (req, res) => {
    if (req.body?.confirmation !== 'SUPPRIMER') return res.status(400).json({ error: 'Confirmation requise.' });
    await service.deleteUser(req.user.uid);
    return res.status(204).end();
  });
  return router;
}
