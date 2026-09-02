import 'dotenv/config';
import { createFirebaseAccountService } from '../src/auth/firebase-admin.js';
import { createMailService } from '../src/services/mail-service.js';
import { runDraftMaintenance } from '../src/services/draft-scheduler.js';

const accountService = createFirebaseAccountService();
if (!accountService) throw new Error('Firebase Admin doit être configuré pour lancer la maintenance des brouillons.');

const result = await runDraftMaintenance({
  accountService,
  mailService: createMailService(),
  publicOrigin: process.env.PUBLIC_ORIGIN || 'https://www.cardiag.online',
});
console.log(JSON.stringify(result));
