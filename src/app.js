import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { validateChatBody, validateInlineBody } from './validation.js';

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const configured = (process.env.FRONTEND_ORIGINS || '').split(',').map((value) => value.trim().replace(/\/$/, ''));
  return configured.includes(origin.replace(/\/$/, ''))
    || /^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin)
    || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

export function createApp({ llmService }) {
  if (!llmService) throw new Error('llmService est requis.');
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => { req.requestId = crypto.randomUUID(); res.setHeader('X-Request-Id', req.requestId); next(); });
  app.use(cors({ origin: (origin, callback) => callback(null, isAllowedOrigin(origin)), methods: ['GET', 'POST', 'OPTIONS'] }));
  app.use(express.json({ limit: '100kb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  function route(validator, method) {
    return async (req, res) => {
      const error = validator(req.body);
      if (error) return res.status(400).json({ error });
      try {
        return res.json(await method(req.body));
      } catch (serviceError) {
        console.error(`[${req.requestId}] Service LLM indisponible:`, serviceError);
        return res.status(502).json({ error: 'Le service de diagnostic est temporairement indisponible.', requestId: req.requestId });
      }
    };
  }

  app.post('/api/chat', route(validateChatBody, async ({ messages, carContext }) => ({ message: await llmService.chat(messages, carContext) })));
  app.post('/api/inline', route(validateInlineBody, async ({ selectedText, carContext }) => ({ explanation: await llmService.inline(selectedText, carContext) })));
  app.use((_req, res) => res.status(404).json({ error: 'Route introuvable.' }));
  return app;
}
