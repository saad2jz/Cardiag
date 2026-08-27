const DAY_MS = 24 * 60 * 60 * 1000;

export function draftSchedulerConfig(env = process.env) {
  const retentionDays = Math.max(3, Math.min(365, Number.parseInt(env.DRAFT_RETENTION_DAYS || '30', 10) || 30));
  return {
    enabled: String(env.DRAFT_REMINDERS_ENABLED || '').toLowerCase() === 'true',
    purgeEnabled: String(env.DRAFT_PURGE_ENABLED || '').toLowerCase() === 'true',
    retentionDays,
    reminderDays: Math.max(1, Math.min(retentionDays - 1, Number.parseInt(env.DRAFT_REMINDER_DAYS || '2', 10) || 2)),
  };
}

/** Runs once from a secured Render Cron Job or a trusted internal timer. */
export async function runDraftMaintenance({ accountService, mailService, publicOrigin, now = new Date(), config = draftSchedulerConfig() }) {
  if (!config.enabled || !accountService?.findDraftsForMaintenance) {
    return { enabled: false, reminders: 0, purged: 0, skipped: 0 };
  }
  const drafts = await accountService.findDraftsForMaintenance(250);
  const result = { enabled: true, reminders: 0, purged: 0, skipped: 0 };
  const nowMs = now.getTime();
  for (const draft of drafts) {
    const ageDays = Math.floor((nowMs - Date.parse(draft.updatedAt || draft.createdAt || now.toISOString())) / DAY_MS);
    if (!Number.isFinite(ageDays) || ageDays < 0) { result.skipped += 1; continue; }
    if (ageDays >= config.retentionDays) {
      // Purging is a separate explicit switch: users must never lose a draft
      // because a mail configuration was accidentally enabled.
      if (config.purgeEnabled) {
        await accountService.purgeDraft(draft.uid, draft.id);
        result.purged += 1;
      } else result.skipped += 1;
      continue;
    }
    if (ageDays < config.retentionDays - config.reminderDays || draft.draft?.reminderSentAt) continue;
    const resumeUrl = `${String(publicOrigin).replace(/\/$/, '')}/app/inspection/${encodeURIComponent(draft.id)}`;
    const sent = await mailService.sendDraftReminder({
      to: draft.email,
      title: draft.titre,
      resumeUrl,
      daysRemaining: config.retentionDays - ageDays,
    });
    if (sent.sent) {
      await accountService.markDraftReminder(draft.uid, draft.id, now.toISOString());
      result.reminders += 1;
    } else result.skipped += 1;
  }
  return result;
}

export function startDraftScheduler({ accountService, mailService, env = process.env, logger = console }) {
  const config = draftSchedulerConfig(env);
  if (!config.enabled || String(env.DRAFT_SCHEDULER_MODE || '').toLowerCase() !== 'internal') return () => {};
  const intervalMs = Math.max(60 * 60 * 1000, Number.parseInt(env.DRAFT_SCHEDULER_INTERVAL_MS || `${12 * 60 * 60 * 1000}`, 10));
  const run = () => runDraftMaintenance({ accountService, mailService, publicOrigin: env.PUBLIC_ORIGIN || 'https://cardiag.online', config })
    .then((result) => logger.info?.('Maintenance des brouillons terminée', result))
    .catch((error) => logger.error?.('Maintenance des brouillons échouée', error));
  const initial = setTimeout(run, 30_000);
  const interval = setInterval(run, intervalMs);
  return () => { clearTimeout(initial); clearInterval(interval); };
}
