function scoreColor(score) { return score == null ? 'var(--border)' : score >= 80 ? '#22c55e' : score >= 55 ? '#f59e0b' : '#ef4444'; }
function verdictClass(value) { return ['achat','negociation','fuir'].includes(value) ? value : 'pending'; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g,(char)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[char]); }

function createGallery() {
  const sheet = document.createElement('aside');
  sheet.className = 'records-sheet';
  sheet.hidden = true;
  sheet.innerHTML = `<header><div><p class="panel-kicker">GARAGE NUMÉRIQUE</p><h2>Mes fiches</h2></div><button type="button" data-records-close aria-label="Fermer">×</button></header><button type="button" class="records-new" data-records-new>＋ Nouvelle expertise</button><div class="records-grid" data-records-grid></div>`;
  document.body.append(sheet);
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'records-trigger';
  trigger.textContent = 'Mes fiches';
  document.getElementById('wizardHeader')?.append(trigger);
  return { sheet, trigger };
}

export function initializeRecordsGallery() {
  const { sheet, trigger } = createGallery();
  const grid = sheet.querySelector('[data-records-grid]');
  const close = () => { sheet.classList.remove('is-open'); setTimeout(() => { sheet.hidden = true; }, 220); };
  const render = () => {
    const records = window.cardiagDataBridge?.listReportModels?.() || [];
    grid.replaceChildren(...records.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))).map((record) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'record-card';
      card.dataset.recordId = record.id;
      const photo = record.mainPhoto?.dataUrl
        ? `<img src="${record.mainPhoto.dataUrl}" alt="Photo de ${escapeHtml(record.title)}">`
        : '<div class="record-card-placeholder">🚗</div>';
      card.innerHTML = `<div class="record-card-media">${photo}<span class="record-verdict ${verdictClass(record.verdict)}">${record.verdictLabel}</span></div><div class="record-card-body"><div class="record-card-donut" style="--score:${record.score || 0};--score-color:${scoreColor(record.score)}"><strong>${record.score == null ? '—' : `${record.score}%`}</strong></div><div><h3>${escapeHtml(record.title)}</h3><p>${new Date(record.createdAt || Date.now()).toLocaleDateString('fr-FR')} · ${record.done}/${record.total} vérifiés</p></div></div>`;
      card.addEventListener('click', () => { window.cardiagDataBridge.openRecord(record.id); window.cardiagWizard?.goToStep?.(4); close(); });
      return card;
    }));
  };
  trigger.addEventListener('click', () => { render(); sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add('is-open')); });
  sheet.querySelector('[data-records-close]').addEventListener('click', close);
  sheet.querySelector('[data-records-new]').addEventListener('click', () => { window.cardiagDataBridge?.createRecord?.(); window.cardiagWizard?.goToStep?.(1); close(); });
  window.addEventListener('cardiag:data-change', () => { if (!sheet.hidden) render(); });
  window.cardiagRecords = { open: () => trigger.click(), close };
}
