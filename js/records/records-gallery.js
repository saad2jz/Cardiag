function scoreColor(score) { return score == null ? 'var(--border)' : score >= 80 ? '#22c55e' : score >= 55 ? '#f59e0b' : '#ef4444'; }
function verdictClass(value) { return ['achat','negociation','fuir'].includes(value) ? value : 'pending'; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g,(char)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[char]); }
function translate(key,fallback){return window.cardiagI18n?.t?.(key,fallback)||fallback}

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
  const refreshTrigger=()=>{trigger.textContent=translate('records.title','Mes fiches')};refreshTrigger();
  const grid = sheet.querySelector('[data-records-grid]');
  const close = () => { sheet.classList.remove('is-open'); setTimeout(() => { sheet.hidden = true; }, 220); };
  const render = () => {
    const records = window.cardiagDataBridge?.listReportModels?.() || [];
    sheet.querySelector('h2').textContent=translate('records.title','Mes fiches');
    sheet.querySelector('[data-records-new]').textContent=translate('records.new','＋ Nouvelle expertise');
    if(!records.length){grid.innerHTML=`<p class="records-empty">${translate('records.empty','Aucune fiche enregistrée pour le moment.')}</p>`;return}
    grid.replaceChildren(...records.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))).map((record) => {
      const card = document.createElement('article');
      card.className = 'record-card';
      card.dataset.recordId = record.id;
      const photo = record.mainPhoto?.dataUrl
        ? `<img src="${record.mainPhoto.dataUrl}" alt="Photo de ${escapeHtml(record.title)}">`
        : '<div class="record-card-placeholder">🚗</div>';
      const locale=window.cardiagI18n?.language==='en'?'en-GB':'fr-FR';
      const trackedMileage=record.data?.rental_mileage_in||record.data?.rental_mileage_out||record.data?.release_mileage||record.data?.kilometrage;
      const fleetMeta=[record.data?.fleet_vehicle_id,trackedMileage?`${Number(trackedMileage).toLocaleString(locale)} km`:''].filter(Boolean).join(' · ');
      card.innerHTML = `<button type="button" class="record-card-open" aria-label="${translate('records.open','Ouvrir')} ${escapeHtml(record.title)}"><div class="record-card-media">${photo}<span class="record-verdict ${verdictClass(record.verdict)}">${escapeHtml(record.verdictLabel)}</span></div><div class="record-card-body"><div class="record-card-donut" style="--score:${record.score || 0};--score-color:${scoreColor(record.score)}"><strong>${record.score == null ? '—' : `${record.score}%`}</strong></div><div><h3>${escapeHtml(record.title)}</h3><p>${new Date(record.createdAt || Date.now()).toLocaleDateString(locale)} · ${record.done}/${record.total} ${window.cardiagI18n?.language==='en'?'checked':'vérifiés'}</p>${fleetMeta?`<p>${escapeHtml(fleetMeta)}</p>`:''}</div></div></button><div class="record-card-actions"><button type="button" data-record-open>${translate('records.open','Ouvrir')}</button><button type="button" data-record-download>⬇ ${translate('records.download','Télécharger le PDF')}</button></div>`;
      const open=async()=>{
        const opened=await window.cardiagDataBridge?.openRecord?.(record.id);
        if(!opened)return;
        window.cardiagWizard?.goToStep?.(2);
        close();
        window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback',{detail:{type:'success',message:translate('records.loaded','Fiche chargée : vous pouvez la consulter ou la modifier.')}}));
      };
      card.querySelector('.record-card-open').addEventListener('click',open);
      card.querySelector('[data-record-open]').addEventListener('click',open);
      card.querySelector('[data-record-download]').addEventListener('click',async(event)=>{const action=event.currentTarget;const original=action.textContent;action.disabled=true;action.textContent='⏳ PDF…';try{await window.cardiagPremiumReport?.download?.(record.id)}finally{action.disabled=false;action.textContent=original}});
      return card;
    }));
  };
  trigger.addEventListener('click', () => { render(); sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add('is-open')); });
  sheet.querySelector('[data-records-close]').addEventListener('click', close);
  sheet.querySelector('[data-records-new]').addEventListener('click', () => {
    const profile=window.cardiagLocalProfile?.current;
    const role=profile?.role || 'buyer';
    window.cardiagDataBridge?.createRecord?.({usage_scenario:role});
    window.cardiagWizard?.goToStep?.(profile?.type==='professional'?2:1);
    close();
  });
  window.addEventListener('cardiag:data-change', () => { if (!sheet.hidden) render(); });
  window.addEventListener('cardiag:language-change',()=>{refreshTrigger();if(!sheet.hidden)render()});
  window.cardiagRecords = { open: () => trigger.click(), close };
}
