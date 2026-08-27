import express from 'express';

function bearerToken(req) { return String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1] || ''; }
async function optionalUid(service, req) {
  const token = bearerToken(req);
  if (!token) return '';
  try { return (await service.verifyToken(token)).uid || ''; }
  catch { return ''; }
}
function pageSize(value) { return Math.max(1, Math.min(24, Number.parseInt(value, 10) || 12)); }
function publicLimit({ windowMs = 3_600_000, max = 8 } = {}) {
  const buckets = new Map();
  return (req, res, next) => { const id = req.ip || req.socket?.remoteAddress || 'unknown'; const now = Date.now(); const values = (buckets.get(id) || []).filter((time) => now - time < windowMs); if (values.length >= max) return res.status(429).json({ error:'Trop de demandes. Réessayez plus tard.', code:'PUBLIC_RATE_LIMITED' }); values.push(now); buckets.set(id, values); return next(); };
}

async function requireAdmin(service, req, res, next) {
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error:'Authentification requise.', code:'AUTH_REQUIRED' });
  try { req.user = await service.verifyToken(token); } catch { return res.status(401).json({ error:'Session invalide.', code:'AUTH_INVALID' }); }
  if (!req.user.email_verified || !(await service.isAdmin(req.user))) return res.status(403).json({ error:'Accès administrateur requis.', code:'ADMIN_REQUIRED' });
  return next();
}

export function createGarageApiRouter(service) {
  const router = express.Router();
  router.get('/garages', async (req, res) => {
    try { return res.json(await service.listPublicGarages({ city:req.query.city, specialty:req.query.specialty, minRating:req.query.minRating, search:req.query.search, cursor:req.query.cursor, limit:pageSize(req.query.limit) })); }
    catch (error) { return res.status(500).json({ error:'Annuaire temporairement indisponible.', code:'GARAGE_DIRECTORY_UNAVAILABLE' }); }
  });
  router.get('/garages/:slug', async (req, res) => {
    const garage = await service.getPublicGarage(String(req.params.slug || ''));
    return garage ? res.json(garage) : res.status(404).json({ error:'Garage introuvable.', code:'GARAGE_NOT_FOUND' });
  });
  router.post('/garages/applications', publicLimit({ max:5 }), async (req, res) => {
    try {
      // Registration remains publicly accessible, while a signed-in applicant
      // is recorded as the future garage manager for the premium area.
      return res.status(201).json({ garage: await service.createGarageApplication(req.body || {}, await optionalUid(service, req)) });
    }
    catch (error) { return res.status(400).json({ error:error.message || 'Candidature invalide.', code:error.code || 'GARAGE_APPLICATION_INVALID' }); }
  });
  router.post('/garages/:slug/reviews', publicLimit({ max:4 }), async (req, res) => {
    try { return res.status(201).json({ review: await service.createGarageReview(String(req.params.slug || ''), req.body || {}) }); }
    catch (error) { return res.status(error.code === 'GARAGE_NOT_FOUND' ? 404 : 400).json({ error:error.message || 'Avis invalide.', code:error.code || 'REVIEW_INVALID' }); }
  });
  return router;
}

export function createGarageAdminRouter(service) {
  const router = express.Router();
  router.use((req, res, next) => requireAdmin(service, req, res, next));
  router.get('/garages', async (req, res) => res.json(await service.listAdminGarages({ status:req.query.status, limit:pageSize(req.query.limit) })));
  router.post('/garages', async (req, res) => {
    try { return res.status(201).json({ garage: await service.createAdminGarage(req.user.uid, req.body || {}) }); }
    catch (error) { return res.status(400).json({ error:error.message, code:error.code || 'GARAGE_CREATE_FAILED' }); }
  });
  router.patch('/garages/:id/status', async (req, res) => {
    try { return res.json({ garage: await service.moderateGarage(req.user.uid, req.params.id, req.body?.status) }); }
    catch (error) { return res.status(error.code === 'GARAGE_NOT_FOUND' ? 404 : 400).json({ error:error.message, code:error.code || 'GARAGE_MODERATION_FAILED' }); }
  });
  router.get('/garage-reviews', async (req, res) => res.json(await service.listAdminReviews({ status:req.query.status, limit:pageSize(req.query.limit) })));
  router.patch('/garage-reviews/:id/status', async (req, res) => {
    try { return res.json({ review: await service.moderateGarageReview(req.user.uid, req.params.id, req.body?.status) }); }
    catch (error) { return res.status(error.code === 'REVIEW_NOT_FOUND' ? 404 : 400).json({ error:error.message, code:error.code || 'REVIEW_MODERATION_FAILED' }); }
  });
  return router;
}
