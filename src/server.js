import 'dotenv/config';
import { createApp } from './app.js';
import { createLlmService, getLlmRuntimeConfig } from './llm-service.js';
import { createFirebaseAccountService } from './auth/firebase-admin.js';
import { createMailService } from './services/mail-service.js';
import { startDraftScheduler } from './services/draft-scheduler.js';
import { createStripeService } from './services/stripe-service.js';

const port = Number.parseInt(process.env.PORT || '3000', 10);

export function initializeAccountService(env = process.env, logger = console) {
  try {
    return createFirebaseAccountService(env);
  } catch (error) {
    // A malformed Firebase secret must not take down the landing page or the
    // health endpoint. Authenticated APIs remain unavailable until the Vercel
    // environment variable is corrected, and the precise cause stays in logs.
    logger.error?.('Firebase Admin indisponible au démarrage :', error);
    return null;
  }
}

const accountService = initializeAccountService();
const mailService = createMailService();
const stripeService = createStripeService();
const app = createApp({ llmService: createLlmService(), accountService, mailService, stripeService });

function logRuntimeStatus() {
  const llm = getLlmRuntimeConfig();
  if (!accountService) console.warn('Firebase Admin désactivé : vérifiez les variables FIREBASE_* dans Vercel.');
  if (!stripeService.configured) console.warn('Facturation Stripe désactivée : configurez STRIPE_SECRET_KEY et STRIPE_GARAGE_PRICE_ID.');
  if (!mailService.configured) console.warn('Rappels et invitations e-mail désactivés : SMTP non configuré.');
  console.log(`Fournisseur LLM: ${llm.provider} — modèle: ${llm.model}`);
  if (!llm.configured) console.warn('Attention: la clé du fournisseur LLM est absente. Les routes IA renverront 503.');
}

// Vercel imports the Express instance as a serverless function. Long-lived
// timers and a local listener are only started by `npm start` outside Vercel.
if (!process.env.VERCEL) {
  startDraftScheduler({ accountService, mailService });
  app.listen(port, () => {
    console.log(`Cardiag API disponible sur http://localhost:${port}`);
    logRuntimeStatus();
  });
} else {
  logRuntimeStatus();
}

export default app;
