const GUIDED_MODE_KEY = 'cardiag_guided_inspection_v1';

const SECTIONS = [
  { key: 'info', fr: 'Véhicule', en: 'Vehicle' },
  { key: 'moteur', fr: 'Moteur', en: 'Engine' },
  { key: 'chassis', fr: 'Châssis', en: 'Chassis' },
  { key: 'carrosserie', fr: 'Carrosserie', en: 'Body' },
  { key: 'habitacle', fr: 'Habitacle', en: 'Cabin' },
  { key: 'essai', fr: 'Essai', en: 'Road test' },
  { key: 'diagnostic', fr: 'OBD2 & bilan', en: 'OBD2 & review' },
];

function english() {
  return window.cardiagI18n?.language === 'en';
}

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Le mode reste actif en mémoire. */ }
}

function guidedItems(section) {
  if (!section) return [];
  const items = [...section.querySelectorAll('.badge-group')]
    .map((group) => group.closest('.check-item') || group.closest('.field'))
    .filter(Boolean);
  return [...new Set(items)].filter((item) => (
    !document.body.classList.contains('quick-mode') || item.classList.contains('persona-quick')
  ));
}

function checkItems(section) {
  return guidedItems(section).filter((item) => item.classList.contains('check-item'));
}

function statusGroups(section) {
  if (!section) return [];
  return [...section.querySelectorAll('.badge-group')].filter((group) => {
    const item = group.closest('.check-item') || group.closest('.field');
    return group.querySelector('input[type="radio"]')
      && item
      && (!document.body.classList.contains('quick-mode') || item.classList.contains('persona-quick'));
  });
}

function sectionStats(section) {
  const groups = statusGroups(section);
  const values = groups.map((group) => group.querySelector('input[type="radio"]:checked')?.value || '');
  return {
    total: groups.length,
    done: values.filter(Boolean).length,
    defects: values.filter((value) => value === 'defaut').length,
    warnings: values.filter((value) => value === 'moyen').length,
  };
}

function allStats() {
  return [...document.querySelectorAll('details.section[data-section]')]
    .reduce((result, section) => {
      const stats = sectionStats(section);
      result.total += stats.total;
      result.done += stats.done;
      return result;
    }, { total: 0, done: 0 });
}

function photoKeys() {
  return new Set((window.cardiagMediaBridge?.getPhotos?.() || []).map((photo) => photo.sectionKey));
}

function sectionPhotoStats(section, keys = photoKeys()) {
  const names = checkItems(section)
    .map((item) => item.querySelector('input[type="radio"][name]')?.name)
    .filter(Boolean);
  return { total: names.length, done: names.filter((name) => keys.has(`point:${name}`)).length };
}

function ensureSectionSummaries() {
  document.querySelectorAll('details.section[data-section]').forEach((section) => {
    if (!section.querySelector('.badge-group') || section.querySelector('[data-section-summary]')) return;
    const summary = document.createElement('div');
    summary.className = 'inspection-section-summary';
    summary.dataset.sectionSummary = '';
    summary.setAttribute('role', 'status');
    section.querySelector('.section-body')?.append(summary);
  });
}

function updateSectionSummaries() {
  const keys = photoKeys();
  document.querySelectorAll('details.section[data-section]').forEach((section) => {
    const target = section.querySelector('[data-section-summary]');
    if (!target) return;
    const stats = sectionStats(section);
    const photos = sectionPhotoStats(section, keys);
    const completed = stats.done === stats.total && stats.total > 0;
    target.classList.toggle('is-complete', completed);
    target.classList.toggle('has-defect', stats.defects > 0);
    target.innerHTML = english()
      ? `<strong>${completed ? 'Section complete' : `${stats.done}/${stats.total} checks completed`}</strong><span>${photos.done}/${photos.total} documented with a photo · ${stats.defects} defect${stats.defects === 1 ? '' : 's'}</span>`
      : `<strong>${completed ? 'Section terminée' : `${stats.done}/${stats.total} points renseignés`}</strong><span>${photos.done}/${photos.total} documentés avec photo · ${stats.defects} défaut${stats.defects > 1 ? 's' : ''}</span>`;
  });
}

function createProgressDock() {
  const dock = document.createElement('button');
  dock.type = 'button';
  dock.className = 'inspection-progress-dock';
  dock.hidden = true;
  dock.innerHTML = '<span class="inspection-progress-ring"><strong>0%</strong></span><span><b>0 / 33</b><small data-dock-time>Calcul du temps restant…</small></span>';
  dock.addEventListener('click', () => {
    document.querySelector('[data-inspection-guide]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.body.append(dock);
  return dock;
}

function remainingLabel(stats) {
  const remaining = Math.max(0, stats.total - stats.done);
  if (!remaining) return english() ? 'Inspection complete' : 'Inspection terminée';
  const secondsPerPoint = document.body.classList.contains('quick-mode') ? 25 : 36;
  const minutes = Math.max(1, Math.ceil((remaining * secondsPerPoint) / 60));
  return english() ? `About ${minutes} min remaining` : `Environ ${minutes} min restantes`;
}

function updateProgressDock(dock) {
  const stats = allStats();
  const percent = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  dock.style.setProperty('--inspection-progress', `${percent * 3.6}deg`);
  dock.querySelector('.inspection-progress-ring strong').textContent = `${percent}%`;
  dock.querySelector('b').textContent = `${stats.done} / ${stats.total}`;
  dock.querySelector('[data-dock-time]').textContent = remainingLabel(stats);
}

function createGuide() {
  const checklist = document.querySelector('.wizard-checklist');
  const heading = checklist?.querySelector('.wizard-checklist-heading');
  if (!checklist || !heading) return null;
  const guide = document.createElement('section');
  guide.className = 'inspection-guide';
  guide.dataset.inspectionGuide = '';
  guide.innerHTML = `
    <div class="inspection-guide-head">
      <div><p class="panel-kicker">${english() ? 'GUIDED INSPECTION' : 'INSPECTION GUIDÉE'}</p><strong data-guide-count>0 / 33</strong><small data-guide-time></small></div>
      <button type="button" data-guide-view aria-pressed="true"></button>
    </div>
    <div class="inspection-guide-progress" aria-hidden="true"><span data-guide-progress></span></div>
    <nav class="inspection-mini-stepper" aria-label="${english() ? 'Inspection sections' : 'Sections de l’inspection'}">
      ${SECTIONS.map((section, index) => `<button type="button" data-guide-section="${section.key}"><span>${index + 1}</span><b>${english() ? section.en : section.fr}</b><small data-step-photo="${section.key}">0 photo</small></button>`).join('')}
    </nav>
    <div class="inspection-question-meta"><span data-guide-question></span><span data-guide-photo></span></div>
    <div class="inspection-guide-actions"><button type="button" data-guide-prev>← ${english() ? 'Previous' : 'Précédent'}</button><button type="button" data-guide-next>${english() ? 'Next' : 'Suivant'} →</button></div>`;
  heading.after(guide);
  return guide;
}

function initializeGuide(guide) {
  if (!guide) return { refresh() {}, setVisible() {} };
  let guided = safeGet(GUIDED_MODE_KEY) !== 'full';
  let currentName = '';

  const available = () => [...document.querySelectorAll('.wizard-checklist details.section[data-section]')]
    .flatMap((section) => guidedItems(section));

  const itemName = (item) => item?.querySelector('input[type="radio"][name]')?.name || '';

  function setGuided(value) {
    guided = Boolean(value);
    safeSet(GUIDED_MODE_KEY, guided ? 'guided' : 'full');
    render();
  }

  function choose(item, scroll = true) {
    if (!item) return;
    currentName = itemName(item);
    render();
    if (scroll) guide.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function render() {
    const items = available();
    if (!items.length) return;
    let index = items.findIndex((item) => itemName(item) === currentName);
    if (index < 0) index = Math.max(0, items.findIndex((item) => !item.querySelector('input[type="radio"]:checked')));
    const current = items[index] || items[0];
    currentName = itemName(current);
    const currentSection = current.closest('details.section');
    const stats = allStats();
    const keys = photoKeys();
    const percent = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;

    guide.querySelector('.panel-kicker').textContent = english() ? 'GUIDED INSPECTION' : 'INSPECTION GUIDÉE';
    guide.querySelector('.inspection-mini-stepper').setAttribute('aria-label', english() ? 'Inspection sections' : 'Sections de l’inspection');
    guide.querySelector('[data-guide-prev]').textContent = english() ? '← Previous' : '← Précédent';
    SECTIONS.forEach((meta) => {
      const label = guide.querySelector(`[data-guide-section="${meta.key}"] b`);
      if (label) label.textContent = english() ? meta.en : meta.fr;
    });

    document.body.classList.toggle('inspection-guided-mode', guided);
    document.querySelectorAll('.wizard-checklist details.section').forEach((section) => section.classList.remove('inspection-guided-section'));
    document.querySelectorAll('.wizard-checklist .check-item, .wizard-checklist .field').forEach((item) => item.classList.remove('inspection-guided-current'));
    document.querySelectorAll('.wizard-checklist .subhead').forEach((subhead) => subhead.classList.remove('inspection-guided-context'));
    if (guided) {
      currentSection?.classList.add('inspection-guided-section');
      currentSection.open = true;
      current.classList.add('inspection-guided-current');
      let sibling = current.previousElementSibling;
      while (sibling && !sibling.classList.contains('subhead')) sibling = sibling.previousElementSibling;
      sibling?.classList.add('inspection-guided-context');
    }

    guide.querySelector('[data-guide-count]').textContent = `${stats.done} / ${stats.total} ${english() ? 'checked' : 'vérifiés'}`;
    guide.querySelector('[data-guide-time]').textContent = remainingLabel(stats);
    guide.querySelector('[data-guide-progress]').style.width = `${percent}%`;
    guide.querySelector('[data-guide-question]').textContent = english() ? `Question ${index + 1} of ${items.length}` : `Question ${index + 1} sur ${items.length}`;
    guide.querySelector('[data-guide-photo]').textContent = keys.has(`point:${currentName}`) ? (english() ? 'Photo attached' : 'Photo ajoutée') : (english() ? 'Photo optional' : 'Photo facultative');
    const view = guide.querySelector('[data-guide-view]');
    view.setAttribute('aria-pressed', String(guided));
    view.textContent = guided ? (english() ? 'Show full report' : 'Voir la fiche complète') : (english() ? 'Resume guided mode' : 'Reprendre le mode guidé');
    guide.querySelector('[data-guide-prev]').disabled = index === 0;
    guide.querySelector('[data-guide-next]').textContent = index === items.length - 1 ? (english() ? 'Review report →' : 'Voir le bilan →') : (english() ? 'Next →' : 'Suivant →');

    SECTIONS.forEach((meta) => {
      const section = document.querySelector(`details.section[data-section="${meta.key}"]`);
      const button = guide.querySelector(`[data-guide-section="${meta.key}"]`);
      if (!button) return;
      if (meta.key === 'info') {
        const sectionStatus = sectionStats(section);
        const photos = sectionPhotoStats(section, keys);
        button.classList.toggle('is-active', section === currentSection && guided);
        button.classList.toggle('is-complete', Boolean(document.querySelector('[name="marque"]')?.value && document.querySelector('[name="modele"]')?.value) && sectionStatus.done === sectionStatus.total);
        button.querySelector('[data-step-photo]').textContent = `${photos.done}/${photos.total} ${english() ? 'photos' : 'photo'}`;
        return;
      }
      const sectionStatus = sectionStats(section);
      const photos = sectionPhotoStats(section, keys);
      button.classList.toggle('is-active', section === currentSection && guided);
      button.classList.toggle('is-complete', sectionStatus.total > 0 && sectionStatus.done === sectionStatus.total);
      button.querySelector('[data-step-photo]').textContent = `${photos.done}/${photos.total} ${english() ? 'photos' : 'photo'}`;
    });
  }

  guide.querySelector('[data-guide-view]').addEventListener('click', () => setGuided(!guided));
  guide.querySelector('[data-guide-prev]').addEventListener('click', () => {
    const items = available();
    const index = items.findIndex((item) => itemName(item) === currentName);
    choose(items[Math.max(0, index - 1)]);
  });
  guide.querySelector('[data-guide-next]').addEventListener('click', () => {
    const items = available();
    const index = items.findIndex((item) => itemName(item) === currentName);
    if (index >= items.length - 1) {
      setGuided(false);
      document.querySelector('details.section[data-section="diagnostic"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    choose(items[index + 1]);
  });
  guide.querySelectorAll('[data-guide-section]').forEach((button) => button.addEventListener('click', () => {
    const key = button.dataset.guideSection;
    if (key === 'info') {
      window.cardiagWizard?.goToStep?.(2, 'back');
      return;
    }
    window.cardiagWizard?.goToStep?.(4, 'forward');
    const section = document.querySelector(`.wizard-checklist details.section[data-section="${key}"]`);
    const candidates = checkItems(section);
    choose(candidates.find((item) => !item.querySelector('input[type="radio"]:checked')) || candidates[0]);
  }));

  return {
    refresh: render,
    setVisible(visible) { guide.hidden = !visible; if (visible) render(); },
  };
}

export function initializeInspectionEnhancements() {
  ensureSectionSummaries();
  const dock = createProgressDock();
  const guide = initializeGuide(createGuide());
  const refresh = () => {
    updateSectionSummaries();
    updateProgressDock(dock);
    guide.refresh();
  };

  document.addEventListener('change', (event) => {
    const item = event.target.closest?.('.check-item, .field');
    if (item && event.target.matches('input[type="radio"]')) {
      item.classList.remove('is-saved-feedback');
      requestAnimationFrame(() => item.classList.add('is-saved-feedback'));
      window.setTimeout(() => item.classList.remove('is-saved-feedback'), 650);
    }
    refresh();
  });
  ['cardiag:data-change', 'cardiag:record-open', 'cardiag:language-change', 'cardiag:media-change', 'cardiag:inspection-mode-change', 'cardiag:scenario-change']
    .forEach((name) => window.addEventListener(name, () => requestAnimationFrame(refresh)));
  window.addEventListener('cardiag:wizard-step', (event) => {
    const visible = event.detail?.step === 4;
    dock.hidden = !visible;
    guide.setVisible(visible);
    refresh();
  });
  refresh();
}
