function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function translate(key, fallback) {
  return window.cardiagI18n?.t?.(key, fallback) || fallback;
}

function selectedProfile() {
  return document.querySelector('[name="usage_scenario"]:checked')?.value || 'buyer';
}

function vehicleSubtitle(model) {
  const data = model.data || {};
  const locale = window.cardiagI18n?.language === 'en' ? 'en-GB' : 'fr-FR';
  return [data.motorisation, data.kilometrage ? `${Number(data.kilometrage).toLocaleString(locale)} km` : '']
    .filter(Boolean)
    .join(' · ');
}

function createPanel() {
  const panel = document.createElement('section');
  panel.className = 'saved-vehicles-panel';
  panel.innerHTML = `
    <div class="saved-vehicles-head">
      <div><p class="panel-kicker" data-vehicle-picker-kicker>GARAGE PERSONNEL</p><h2 data-vehicle-picker-title>Choisir un véhicule enregistré</h2><p data-vehicle-picker-intro>Reprenez un véhicule existant ou créez une nouvelle fiche.</p></div>
      <button type="button" data-add-vehicle>＋ Ajouter un nouveau véhicule</button>
    </div>
    <div class="saved-vehicles-list" data-saved-vehicles-list></div>
    <section class="buyer-comparison" data-buyer-comparison hidden>
      <label class="buyer-comparison-toggle"><input type="checkbox" data-enable-comparison><span><strong>Comparer avec un autre véhicule</strong><small>Ajoutez un second véhicule à votre analyse avant achat.</small></span></label>
      <div class="buyer-comparison-fields" data-comparison-fields hidden>
        <label for="comparisonVehicleId">Véhicule à comparer</label>
        <select id="comparisonVehicleId" name="comparison_vehicle_id"><option value="">Choisir un autre véhicule</option></select>
        <button type="button" data-run-vehicle-comparison disabled>Voir la comparaison</button>
      </div>
    </section>`;
  return panel;
}

export function initializeVehiclePicker() {
  const identificationView = document.querySelector('.wizard-view[data-wizard-step="2"]');
  const infoSection = identificationView?.querySelector('details.section[data-section="info"]');
  if (!identificationView || !infoSection || !window.cardiagDataBridge) return;

  const panel = createPanel();
  identificationView.insertBefore(panel, infoSection);
  const list = panel.querySelector('[data-saved-vehicles-list]');
  const comparison = panel.querySelector('[data-buyer-comparison]');
  const comparisonToggle = panel.querySelector('[data-enable-comparison]');
  const comparisonFields = panel.querySelector('[data-comparison-fields]');
  const comparisonSelect = panel.querySelector('[name="comparison_vehicle_id"]');
  const compareButton = panel.querySelector('[data-run-vehicle-comparison]');

  function render() {
    const profile = selectedProfile();
    const visible = ['buyer', 'seller', 'mechanic'].includes(profile);
    panel.hidden = !visible;
    if (!visible) return;

    const current = window.cardiagDataBridge.getCurrentRecord?.() || {};
    const records = (window.cardiagDataBridge.listReportModels?.() || [])
      .filter((record) => record.data?.marque || record.data?.modele)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    panel.querySelector('[data-vehicle-picker-title]').textContent = translate('vehiclePicker.title', 'Choisir un véhicule enregistré');
    panel.querySelector('[data-vehicle-picker-intro]').textContent = translate('vehiclePicker.intro', 'Reprenez un véhicule existant ou créez une nouvelle fiche.');
    panel.querySelector('[data-add-vehicle]').textContent = translate('vehiclePicker.add', '＋ Ajouter un nouveau véhicule');

    if (!records.length) {
      list.innerHTML = `<p class="saved-vehicles-empty">${translate('vehiclePicker.empty', 'Aucun véhicule enregistré. Ajoutez votre premier véhicule ci-dessous.')}</p>`;
    } else {
      list.innerHTML = records.map((record) => {
        const active = record.id === current.id;
        const photo = record.mainPhoto?.dataUrl
          ? `<img src="${record.mainPhoto.dataUrl}" alt="">`
          : '<span class="saved-vehicle-placeholder" aria-hidden="true">🚗</span>';
        return `<button type="button" class="saved-vehicle-card${active ? ' is-active' : ''}" data-use-vehicle="${escapeHtml(record.id)}" aria-pressed="${active}">${photo}<span><strong>${escapeHtml(record.title)}</strong><small>${escapeHtml(vehicleSubtitle(record) || translate('vehiclePicker.saved', 'Véhicule enregistré'))}</small></span>${active ? `<em>${translate('vehiclePicker.active', 'Actuel')}</em>` : ''}</button>`;
      }).join('');
    }

    comparison.hidden = profile !== 'buyer';
    const candidates = records.filter((record) => record.id !== current.id);
    const savedComparison = String(current.data?.comparison_vehicle_id || '');
    comparisonSelect.innerHTML = `<option value="">${translate('vehiclePicker.compareChoose', 'Choisir un autre véhicule')}</option>${candidates.map((record) => `<option value="${escapeHtml(record.id)}">${escapeHtml(record.title)}</option>`).join('')}`;
    comparisonSelect.value = candidates.some((record) => record.id === savedComparison) ? savedComparison : '';
    comparisonToggle.checked = Boolean(comparisonSelect.value);
    comparisonToggle.disabled = candidates.length === 0;
    comparisonFields.hidden = !comparisonToggle.checked;
    compareButton.disabled = !comparisonSelect.value;
    panel.querySelector('.buyer-comparison-toggle strong').textContent = translate('vehiclePicker.compare', 'Comparer avec un autre véhicule');
    panel.querySelector('.buyer-comparison-toggle small').textContent = translate('vehiclePicker.compareIntro', 'Ajoutez un second véhicule à votre analyse avant achat.');
    compareButton.textContent = translate('vehiclePicker.compareRun', 'Voir la comparaison');
  }

  panel.addEventListener('click', async (event) => {
    const vehicleButton = event.target.closest('[data-use-vehicle]');
    if (vehicleButton && vehicleButton.getAttribute('aria-pressed') !== 'true') {
      vehicleButton.disabled = true;
      await window.cardiagDataBridge.useVehicleFromRecord?.(vehicleButton.dataset.useVehicle);
      render();
      document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (event.target.closest('[data-add-vehicle]')) {
      window.cardiagDataBridge.createRecord?.({ usage_scenario: selectedProfile() });
      render();
      document.getElementById('marqueSelect')?.focus();
      return;
    }
    if (event.target.closest('[data-run-vehicle-comparison]') && comparisonSelect.value) {
      const currentId = window.cardiagDataBridge.getCurrentRecord?.()?.id;
      window.cardiagDataBridge.openComparison?.([currentId, comparisonSelect.value].filter(Boolean));
    }
  });

  comparisonToggle.addEventListener('change', () => {
    comparisonFields.hidden = !comparisonToggle.checked;
    if (!comparisonToggle.checked) {
      comparisonSelect.value = '';
      comparisonSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  comparisonSelect.addEventListener('change', () => {
    compareButton.disabled = !comparisonSelect.value;
  });

  window.addEventListener('cardiag:wizard-step', (event) => { if (event.detail?.step === 2) render(); });
  window.addEventListener('cardiag:scenario-change', render);
  window.addEventListener('cardiag:record-open', render);
  window.addEventListener('cardiag:vehicle-selected', render);
  window.addEventListener('cardiag:language-change', render);
  render();
}
