import express from 'express';

function bearerToken(req) {
  const match = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

function garageId(value) {
  const id = String(value || '').trim();
  if (!/^[A-Za-z0-9-]{1,110}$/.test(id)) throw Object.assign(new Error('Identifiant garage requis ou invalide.'), { code: 'GARAGE_ID_INVALID' });
  return id;
}

function garageErrorStatus(code) {
  if (code === 'GARAGE_NOT_FOUND') return 404;
  if (code === 'GARAGE_MANAGER_REQUIRED') return 403;
  if (code === 'GARAGE_NOT_ACTIVE') return 409;
  return 400;
}

export function createAccountRouter(service, { mailService = null, stripeService = null, publicOrigin = process.env.PUBLIC_ORIGIN || 'https://cardiag.online' } = {}) {
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
  router.get('/billing', verifiedOnly, async (req, res) => res.json({ billing: await service.getBilling(req.user.uid), configured: Boolean(stripeService?.configured) }));
  router.get('/garages/:garageId/premium', verifiedOnly, async (req, res) => {
    if (!service.getGaragePremiumAccess) return res.status(501).json({ error: 'Premium garage indisponible.', code: 'GARAGE_PREMIUM_UNAVAILABLE' });
    try {
      const garage = await service.getGaragePremiumAccess(req.user.uid, garageId(req.params.garageId));
      return res.json({ garage, configured: Boolean(stripeService?.configured) });
    } catch (error) {
      return res.status(garageErrorStatus(error?.code)).json({ error:error.message || 'Accès garage impossible.', code:error?.code || 'GARAGE_PREMIUM_ACCESS_FAILED' });
    }
  });
  router.post('/billing/checkout', verifiedOnly, async (req, res) => {
    if (!stripeService?.configured) return res.status(503).json({ error: 'La facturation n’est pas encore configurée.', code: 'STRIPE_NOT_CONFIGURED' });
    try {
      const garage = await service.getGaragePremiumAccess(req.user.uid, garageId(req.body?.garageId));
      if (garage.status !== 'active') throw Object.assign(new Error('Votre garage doit être validé par un administrateur avant de passer premium.'), { code: 'GARAGE_NOT_ACTIVE' });
      const result = await stripeService.createGarageCheckout({ uid: req.user.uid, email: req.user.email, garageId: garage.id, customerId: garage.premium.stripeCustomerId || null });
      return res.json(result);
    } catch (error) {
      return res.status(error?.code === 'STRIPE_NOT_CONFIGURED' ? 503 : garageErrorStatus(error?.code)).json({ error: error.message || 'Création du paiement impossible.', code: error?.code || 'STRIPE_CHECKOUT_FAILED' });
    }
  });
  router.post('/billing/portal', verifiedOnly, async (req, res) => {
    if (!stripeService?.configured) return res.status(503).json({ error: 'La facturation n’est pas encore configurée.', code: 'STRIPE_NOT_CONFIGURED' });
    try {
      const garage = await service.getGaragePremiumAccess(req.user.uid, garageId(req.body?.garageId));
      return res.json(await stripeService.createPortal({ customerId:garage.premium.stripeCustomerId }));
    }
    catch (error) { return res.status(['STRIPE_NOT_CONFIGURED', 'STRIPE_CUSTOMER_MISSING'].includes(error?.code) ? 503 : 400).json({ error: error.message || 'Portail de facturation indisponible.', code: error?.code || 'STRIPE_PORTAL_FAILED' }); }
  });
  router.get('/team', verifiedOnly, async (req, res) => {
    if (!service.listTeamMembers) return res.status(501).json({ error: 'Partage d’équipe indisponible.', code: 'TEAM_NOT_AVAILABLE' });
    const result = await service.listTeamMembers(req.user.uid);
    return res.json(result);
  });
  router.post('/team', verifiedOnly, async (req, res) => {
    try {
      return res.status(201).json({ team: await service.createTeam(req.user.uid, req.body || {}) });
    } catch (error) {
      return res.status(error?.code === 'TEAM_PRO_REQUIRED' ? 403 : 400).json({ error: error.message, code: error?.code || 'TEAM_CREATE_FAILED' });
    }
  });
  router.post('/team/invitations', verifiedOnly, async (req, res) => {
    if (!mailService?.configured) return res.status(503).json({ error: 'L’envoi des invitations doit être configuré par votre administrateur.', code: 'TEAM_EMAIL_NOT_CONFIGURED' });
    try {
      const invitation = await service.createTeamInvitation(req.user.uid, req.body || {});
      const invitationUrl = `${String(publicOrigin).replace(/\/$/, '')}/app/parametres?team-invite=${encodeURIComponent(invitation.token)}`;
      const delivery = await mailService.sendTeamInvitation({
        to: invitation.email,
        teamName: invitation.team.name,
        inviterName: req.user.name || req.user.email || 'Un membre de votre équipe',
        acceptUrl: invitationUrl,
        role: invitation.role,
      });
      if (!delivery.sent) {
        await service.cancelTeamInvitation?.(req.user.uid, invitation.token);
        return res.status(503).json({ error: 'Invitation non envoyée. Vérifiez la configuration e-mail.', code: delivery.reason || 'TEAM_EMAIL_FAILED' });
      }
      return res.status(201).json({ invited: true, email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt });
    } catch (error) {
      return res.status(['TEAM_OWNER_REQUIRED'].includes(error?.code) ? 403 : 400).json({ error: error.message, code: error?.code || 'TEAM_INVITE_FAILED' });
    }
  });
  router.post('/team/invitations/:token/accept', verifiedOnly, async (req, res) => {
    try {
      return res.json({ membership: await service.acceptTeamInvitation(req.user.uid, req.user.email, req.params.token) });
    } catch (error) {
      const code = error?.code || 'TEAM_INVITE_ACCEPT_FAILED';
      return res.status(['TEAM_INVITE_NOT_FOUND'].includes(code) ? 404 : 400).json({ error: error.message, code });
    }
  });
  router.patch('/team/members/:uid', verifiedOnly, async (req, res) => {
    try {
      await service.updateTeamMember(req.user.uid, req.params.uid, req.body?.role);
      return res.status(204).end();
    } catch (error) {
      return res.status(['TEAM_OWNER_REQUIRED'].includes(error?.code) ? 403 : 400).json({ error: error.message, code: error?.code || 'TEAM_MEMBER_UPDATE_FAILED' });
    }
  });
  router.delete('/team/members/:uid', verifiedOnly, async (req, res) => {
    try {
      await service.removeTeamMember(req.user.uid, req.params.uid);
      return res.status(204).end();
    } catch (error) {
      return res.status(['TEAM_OWNER_REQUIRED'].includes(error?.code) ? 403 : 400).json({ error: error.message, code: error?.code || 'TEAM_MEMBER_DELETE_FAILED' });
    }
  });
  router.get('/team/history', verifiedOnly, async (req, res) => {
    try { return res.json(await service.getTeamHistory(req.user.uid)); }
    catch (error) { return res.status(403).json({ error: error.message, code: error?.code || 'TEAM_HISTORY_FORBIDDEN' }); }
  });
  router.post('/team/history/:id', verifiedOnly, async (req, res) => {
    try { return res.status(201).json(await service.shareHistoryWithTeam(req.user.uid, String(req.params.id || ''))); }
    catch (error) { return res.status(error?.code === 'TEAM_RECORD_NOT_FOUND' ? 404 : 403).json({ error: error.message, code: error?.code || 'TEAM_SHARE_FAILED' }); }
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
    const authenticatedAt = Number(req.user.auth_time || 0) * 1000;
    if (!authenticatedAt || Date.now() - authenticatedAt > 10 * 60 * 1000) {
      return res.status(401).json({ error: 'Reconnectez-vous pour confirmer la suppression du compte.', code: 'RECENT_LOGIN_REQUIRED' });
    }
    await service.deleteUser(req.user.uid);
    return res.status(204).end();
  });
  return router;
}
