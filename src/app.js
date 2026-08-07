import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { getLlmRuntimeConfig } from './llm-service.js';
import { validateChatBody, validateInlineBody } from './validation.js';

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const configured = (process.env.FRONTEND_ORIGINS || '').split(',').map((value) => value.trim().replace(/\/$/, ''));
  return configured.includes(origin.replace(/\/$/, ''))
    || /^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin)
    || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sendPublicFile(res, fileName) {
  return res.sendFile(path.join(projectRoot, fileName));
}

export function createApp({ llmService }) {
  if (!llmService) throw new Error('llmService est requis.');
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => { req.requestId = crypto.randomUUID(); res.setHeader('X-Request-Id', req.requestId); next(); });
  app.use(cors({ origin: (origin, callback) => callback(null, isAllowedOrigin(origin)), methods: ['GET', 'POST', 'OPTIONS'] }));
  app.use(express.json({ limit: '100kb' }));

  // Le même dossier peut être déployé sur Render : seuls les fichiers publics
  // nécessaires au frontend sont exposés, jamais .env ni le code du serveur.
  app.use('/css', express.static(path.join(projectRoot, 'css')));
  app.use('/js', express.static(path.join(projectRoot, 'js')));
  app.use('/data', express.static(path.join(projectRoot, 'data')));
  app.use('/icons', express.static(path.join(projectRoot, 'icons')));
  app.get('/', (_req, res) => sendPublicFile(res, 'index.html'));
  app.get('/build-data.js', (_req, res) => sendPublicFile(res, 'build-data.js'));
  app.get('/manifest.json', (_req, res) => sendPublicFile(res, 'manifest.json'));
  app.get('/sw.js', (_req, res) => sendPublicFile(res, 'sw.js'));
  app.get('/health', (_req, res) => {
    const llm = getLlmRuntimeConfig();
    res.json({ status: 'ok', llmConfigured: llm.configured, provider: llm.provider, model: llm.model });
  });

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
        return res.status(500).json({ error: 'Le service IA est temporairement indisponible.', requestId: req.requestId });
      }
    };
  }

  app.post('/api/chat', route(validateChatBody, async ({ messages, carContext }) => ({ message: await llmService.chat(messages, carContext) })));
  app.post('/api/inline', route(validateInlineBody, async ({ selectedText, carContext }) => ({ explanation: await llmService.inline(selectedText, carContext) })));
  app.use((_req, res) => res.status(404).json({ error: 'Route introuvable.' }));
  return app;
}
