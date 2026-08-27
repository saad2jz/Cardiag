import 'dotenv/config';
import { createApp } from './app.js';
import { createLlmService, getLlmRuntimeConfig } from './llm-service.js';
import { createFirebaseAccountService } from './auth/firebase-admin.js';
import { createMailService } from './services/mail-service.js';
import { startDraftScheduler } from './services/draft-scheduler.js';

const port = Number.parseInt(process.env.PORT || '3000', 10);
const accountService = createFirebaseAccountService();
const mailService = createMailService();
const app = createApp({ llmService: createLlmService(), accountService, mailService });
startDraftScheduler({ accountService, mailService });
app.listen(port, () => {
  const llm = getLlmRuntimeConfig();
  if (!mailService.configured) console.warn('Rappels et invitations e-mail désactivés : SMTP non configuré.');
  console.log(`Cardiag API disponible sur http://localhost:${port}`);
  console.log(`Fournisseur LLM: ${llm.provider} — modèle: ${llm.model}`);
  if (!llm.configured) console.warn('Attention: la clé du fournisseur LLM est absente. Les routes IA renverront 503.');
});
