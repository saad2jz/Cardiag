const SESSION_KEY = 'cardiag_backup_reminder_seen_v1';
const SIGNIFICANT_FIELD_COUNT = 8;

function storageGet(key) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function storageSet(key, value) {
  try { sessionStorage.setItem(key, value); } catch { /* Session storage can be unavailable in private mode. */ }
}

function isEnglish() {
  return window.cardiagI18n?.language === 'en';
}

function completedFieldCount() {
  const controls = [...document.querySelectorAll('#wizardRoot input:not([type="hidden"]), #wizardRoot select, #wizardRoot textarea')];
  return controls.filter((control) => {
    if (!control.name || control.disabled || control.name === 'usage_scenario' || control.name === 'inspection_mode') return false;
    if (control.matches('[type="radio"], [type="checkbox"]')) return control.checked;
    return String(control.value || '').trim().length > 0;
  }).length;
}

function copy() {
  return isEnglish() ? {
    title: 'Protect your work',
    text: 'This report is saved on this device. Export a JSON backup before clearing browser data or changing device.',
    action: 'Export backup',
    close: 'Dismiss reminder',
  } : {
    title: 'Protégez votre travail',
    text: 'Cette fiche est enregistrée sur cet appareil. Exportez une sauvegarde JSON avant d’effacer les données du navigateur ou de changer d’appareil.',
    action: 'Exporter la sauvegarde',
    close: 'Fermer le rappel',
  };
}

export function initializeLocalBackupReminder() {
  if (storageGet(SESSION_KEY)) return null;
  const banner = document.createElement('aside');
  banner.className = 'local-backup-reminder';
  banner.hidden = true;
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.innerHTML = '<div><strong data-backup-title></strong><p data-backup-text></p></div><button type="button" data-backup-export></button><button type="button" class="backup-reminder-close" data-backup-close>×</button>';
  document.body.append(banner);

  const render = () => {
    const text = copy();
    banner.querySelector('[data-backup-title]').textContent = text.title;
    banner.querySelector('[data-backup-text]').textContent = text.text;
    banner.querySelector('[data-backup-export]').textContent = `⬇ ${text.action}`;
    banner.querySelector('[data-backup-close]').setAttribute('aria-label', text.close);
  };
  const dismiss = () => {
    banner.hidden = true;
    storageSet(SESSION_KEY, '1');
  };
  const maybeShow = () => {
    if (banner.hidden && !storageGet(SESSION_KEY) && completedFieldCount() >= SIGNIFICANT_FIELD_COUNT) {
      render();
      banner.hidden = false;
    }
  };

  banner.querySelector('[data-backup-export]').addEventListener('click', () => {
    document.getElementById('exportBtn')?.click();
    dismiss();
  });
  banner.querySelector('[data-backup-close]').addEventListener('click', dismiss);
  document.addEventListener('input', maybeShow);
  document.addEventListener('change', maybeShow);
  window.addEventListener('cardiag:language-change', render);
  return { banner, maybeShow };
}
