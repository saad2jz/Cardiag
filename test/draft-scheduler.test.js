import assert from 'node:assert/strict';
import test from 'node:test';
import { createMailService } from '../src/services/mail-service.js';
import { draftSchedulerConfig, runDraftMaintenance } from '../src/services/draft-scheduler.js';

test('mail service stays disabled until complete SMTP settings exist', () => {
  const mail = createMailService({ SMTP_HOST: 'smtp.example.com', SMTP_FROM: 'CarDiag <noreply@example.com>' });
  assert.equal(mail.configured, false);
});

test('draft maintenance sends one reminder and never purges unless explicitly enabled', async () => {
  let marked = false;
  let purged = false;
  const accountService = {
    async findDraftsForMaintenance() {
      return [{ uid: 'u1', id: 'fiche-1', email: 'user@example.com', titre: 'Golf', updatedAt: '2026-01-01T00:00:00.000Z', draft: { status: 'draft' } }];
    },
    async markDraftReminder() { marked = true; },
    async purgeDraft() { purged = true; },
  };
  const mailService = { async sendDraftReminder() { return { sent: true }; } };
  const config = { enabled: true, purgeEnabled: false, retentionDays: 30, reminderDays: 2 };
  const result = await runDraftMaintenance({ accountService, mailService, publicOrigin: 'https://cardiag.online', now: new Date('2026-01-29T00:00:00.000Z'), config });
  assert.equal(result.reminders, 1);
  assert.equal(marked, true);
  assert.equal(purged, false);
});

test('draft maintenance configuration is opt-in and has a safe retention floor', () => {
  assert.deepEqual(draftSchedulerConfig({}), { enabled: false, purgeEnabled: false, retentionDays: 30, reminderDays: 2 });
  assert.equal(draftSchedulerConfig({ DRAFT_RETENTION_DAYS: '1' }).retentionDays, 3);
});
