function isEnglish() {
  return window.cardiagI18n?.language === 'en';
}

function currentRecord() {
  return window.cardiagDataBridge?.getCurrentRecord?.() || null;
}

function copy() {
  return isEnglish() ? {
    kicker: 'REPORT READY',
    title: 'What would you like to do next?',
    text: 'Keep a local backup, compare this vehicle or share the PDF from this device.',
    backup: 'Export JSON backup',
    compare: 'Compare reports',
    share: 'Share PDF',
  } : {
    kicker: 'RAPPORT PRÊT',
    title: 'Quelle suite souhaitez-vous donner ?',
    text: 'Conservez une sauvegarde locale, comparez ce véhicule ou partagez le PDF depuis cet appareil.',
    backup: 'Exporter la sauvegarde JSON',
    compare: 'Comparer des fiches',
    share: 'Partager le PDF',
  };
}

function render(panel) {
  const text = copy();
  panel.querySelector('[data-post-report-kicker]').textContent = text.kicker;
  panel.querySelector('[data-post-report-title]').textContent = text.title;
  panel.querySelector('[data-post-report-text]').textContent = text.text;
  panel.querySelector('[data-post-report-backup]').textContent = `⬇ ${text.backup}`;
  panel.querySelector('[data-post-report-compare]').textContent = `⇄ ${text.compare}`;
  panel.querySelector('[data-post-report-share]').textContent = `↗ ${text.share}`;
}

export function initializePostReportActions() {
  const assistantGate = document.querySelector('.assistant-after-report');
  if (!assistantGate) return null;

  const panel = document.createElement('section');
  panel.className = 'post-report-actions';
  panel.hidden = true;
  panel.setAttribute('aria-live', 'polite');
  panel.innerHTML = `
    <div><p class="panel-kicker" data-post-report-kicker></p><h2 data-post-report-title></h2><p data-post-report-text></p></div>
    <div class="post-report-action-grid">
      <button type="button" data-post-report-backup></button>
      <button type="button" data-post-report-compare></button>
      <button type="button" data-post-report-share></button>
    </div>`;
  assistantGate.insertAdjacentElement('beforebegin', panel);

  const show = () => {
    if (!currentRecord()?.data?._report_generated_at) return;
    render(panel);
    panel.hidden = false;
  };

  panel.querySelector('[data-post-report-backup]').addEventListener('click', () => document.getElementById('exportBtn')?.click());
  panel.querySelector('[data-post-report-compare]').addEventListener('click', () => document.getElementById('compareBtn')?.click());
  panel.querySelector('[data-post-report-share]').addEventListener('click', async (event) => {
    const record = currentRecord();
    if (!record?.id) return;
    const button = event.currentTarget;
    button.disabled = true;
    try { await window.cardiagPremiumReport?.share?.(record.id); }
    finally { button.disabled = false; }
  });

  window.addEventListener('cardiag:report-generated', () => {
    show();
    window.setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  });
  window.addEventListener('cardiag:record-open', () => {
    panel.hidden = !currentRecord()?.data?._report_generated_at;
    if (!panel.hidden) render(panel);
  });
  window.addEventListener('cardiag:language-change', () => render(panel));
  show();
  return { panel, show };
}
