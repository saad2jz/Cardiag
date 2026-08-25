import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { validateChatBody, validateInlineBody } from './validation.js';
import { createAccountRouter } from './auth/account-routes.js';

const DEFAULT_FRONTEND_ORIGINS = new Set([
  'https://cardiag.online',
  'https://www.cardiag.online',
  'https://fiche-expert-auto.onrender.com',
  'https://localhost',
  'capacitor://localhost',
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const configured = (process.env.FRONTEND_ORIGINS || '').split(',').map((value) => value.trim().replace(/\/$/, ''));
  const normalizedOrigin = origin.replace(/\/$/, '');
  return DEFAULT_FRONTEND_ORIGINS.has(normalizedOrigin)
    || configured.includes(normalizedOrigin)
    || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedOrigin);
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sendPublicFile(res, fileName) {
  const filePath = path.join(projectRoot, fileName);
  return res.type(path.extname(fileName)).send(fs.readFileSync(filePath));
}

export function createRateLimiter({ windowMs = 60_000, max = 12, accountService = null } = {}) {
  const buckets = new Map();
  return async (req, res, next) => {
    let identity = `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
    const token = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
    if (token && accountService?.verifyToken) {
      try { identity = `uid:${(await accountService.verifyToken(token)).uid}`; } catch { /* Limitation par IP si le jeton est invalide. */ }
    }
    const now = Date.now();
    const recent = (buckets.get(identity) || []).filter((timestamp) => now - timestamp < windowMs);
    if (recent.length >= max) {
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Trop de demandes adressées à l’assistant. Réessayez dans quelques instants.', code: 'ASSISTANT_RATE_LIMITED', retryAfter });
    }
    recent.push(now);
    buckets.set(identity, recent);
    if (buckets.size > 2_000) for (const [key, values] of buckets) if (!values.some((timestamp) => now - timestamp < windowMs)) buckets.delete(key);
    return next();
  };
}

export function createApp({ llmService, accountService = null }) {
  if (!llmService) throw new Error('llmService est requis.');
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=()');
    // The client intentionally uses Firebase and a CDN-hosted legacy fallback.
    // Keep the policy explicit instead of allowing arbitrary script origins.
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://fiche-expert-auto.onrender.com https://*.googleapis.com https://*.firebaseio.com https://*.firebasestorage.app https://*.googleusercontent.com",
      "script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "worker-src 'self' blob:",
    ].join('; '));
    next();
  });
  app.use(cors({
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  // L'historique synchronisé est plafonné et nettoyé par le routeur de compte.
  // La limite globale reste suffisamment basse pour protéger les autres routes.
  app.use(express.json({ limit: '950kb' }));

  // Le même dossier peut être déployé sur Render : seuls les fichiers publics
  // nécessaires au frontend sont exposés, jamais .env ni le code du serveur.
  app.use('/css', express.static(path.join(projectRoot, 'css')));
  app.use('/js', express.static(path.join(projectRoot, 'js')));
  app.use('/data', express.static(path.join(projectRoot, 'data')));
  app.use('/icons', express.static(path.join(projectRoot, 'icons')));
  app.use('/assets', express.static(path.join(projectRoot, 'assets')));
  app.use('/vendor', express.static(path.join(projectRoot, 'vendor')));
  app.get('/', (_req, res) => sendPublicFile(res, 'index.html'));
  app.get('/build-data.js', (_req, res) => sendPublicFile(res, 'build-data.js'));
  app.get('/manifest.json', (_req, res) => sendPublicFile(res, 'manifest.json'));
  app.get('/firebase-config.json', (_req, res) => sendPublicFile(res, 'firebase-config.json'));
  app.get('/robots.txt', (_req, res) => sendPublicFile(res, 'robots.txt'));
  app.get('/sitemap.xml', (_req, res) => sendPublicFile(res, 'sitemap.xml'));
  app.get('/privacy.html', (_req, res) => sendPublicFile(res, 'privacy.html'));
  app.get('/terms.html', (_req, res) => sendPublicFile(res, 'terms.html'));
  app.get('/account-deletion.html', (_req, res) => sendPublicFile(res, 'account-deletion.html'));
  app.get('/shared-report.html', (_req, res) => sendPublicFile(res, 'shared-report.html'));
  app.get('/fiche/:id', (_req, res) => sendPublicFile(res, 'index.html'));
  app.get('/r/:id', (_req, res) => sendPublicFile(res, 'shared-report.html'));
  app.get('/.well-known/assetlinks.json', (_req, res) => {
    const fingerprints = String(process.env.ANDROID_APP_LINK_SHA256 || '')
      .split(',').map((value) => value.trim()).filter(Boolean);
    if (!fingerprints.length) return res.status(404).json({ error: 'Empreinte App Links non configurée.' });
    return res.json([{
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.cardiag.online',
        sha256_cert_fingerprints: fingerprints,
      },
    }]);
  });
  app.get('/sw.js', (_req, res) => sendPublicFile(res, 'sw.js'));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  function route(validator, method) {
    return async (req, res) => {
      const error = validator(req.body);
      if (error) return res.status(400).json({ error });
      try {
        return res.json(await method(req.body));
      } catch (serviceError) {
        console.error(`[${req.requestId}] Service LLM indisponible:`, serviceError);
        if (serviceError?.code === 'LLM_NOT_CONFIGURED') {
          return res.status(503).json({ error: "Le service IA n'est pas configuré sur le serveur.", code: serviceError.code, requestId: req.requestId });
        }
        const upstreamStatus = Number(serviceError?.status || serviceError?.statusCode || 0);
        if (upstreamStatus === 401 || upstreamStatus === 403) {
          return res.status(503).json({ error: 'La clé Gemini est invalide ou ne peut pas utiliser ce modèle.', code: 'LLM_AUTH_ERROR', requestId: req.requestId });
        }
        if (upstreamStatus === 404) {
          return res.status(503).json({ error: 'Le modèle Gemini configuré est indisponible. Vérifiez GEMINI_MODEL.', code: 'LLM_MODEL_NOT_FOUND', requestId: req.requestId });
        }
        if (upstreamStatus === 429) {
          res.setHeader('Retry-After', serviceError?.headers?.get?.('retry-after') || '5');
          return res.status(429).json({ error: 'La limite Gemini est atteinte. Réessayez dans quelques instants.', code: 'LLM_RATE_LIMITED', requestId: req.requestId });
        }
        return res.status(500).json({ error: 'Le service IA est temporairement indisponible.', requestId: req.requestId });
      }
    };
  }

  const chatLimiter = createRateLimiter({ windowMs: 60_000, max: 12, accountService });
  const inlineLimiter = createRateLimiter({ windowMs: 60_000, max: 60, accountService });
  const sharedReportLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });
  app.post('/api/chat', chatLimiter, route(validateChatBody, async ({ messages, carContext }) => llmService.chat(messages, carContext)));
  app.post('/api/inline', inlineLimiter, route(validateInlineBody, async ({ selectedText, carContext }) => ({ explanation: await llmService.inline(selectedText, carContext) })));
  app.get('/api/shared-reports/:id', sharedReportLimiter, async (req, res) => {
    if (!accountService) return res.status(503).json({ error: 'Partage indisponible.' });
    const id = String(req.params.id || '');
    if (!/^[a-zA-Z0-9_-]{20,80}$/.test(id)) return res.status(404).json({ error: 'Rapport introuvable.' });
    const shared = await accountService.getReportShare(id);
    if (!shared) return res.status(404).json({ error: 'Rapport introuvable ou expiré.' });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json(shared);
  });
  if (accountService) app.use('/api/account', createAccountRouter(accountService));
  else app.use('/api/account', (_req, res) => res.status(503).json({ error: 'Firebase Admin non configuré.', code: 'AUTH_NOT_CONFIGURED' }));
  app.use((_req, res) => res.status(404).json({ error: 'Route introuvable.' }));
  app.use((error, req, res, _next) => {
    console.error(`[${req.requestId || 'unknown'}] Erreur non gérée:`, error);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Erreur serveur temporaire.', requestId: req.requestId });
  });
  return app;
}
