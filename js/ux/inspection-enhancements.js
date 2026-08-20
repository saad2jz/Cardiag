const QUICK_PROMPT_KEY = 'cardiag_quick_mode_prompt_v1';

function english() {
  return window.cardiagI18n?.language === 'en';
}

function sectionStats(section) {
  const groups = [...section.querySelectorAll('.badge-group')].filter((group) => group.querySelector('input[type="radio"]'));
  const values = groups.map((group) => group.querySelector('input[type="radio"]:checked')?.value || '');
  return {
    total: groups.length,
    done: values.filter(Boolean).length,
    defects: values.filter((value) => value === 'defaut').length,
    warnings: values.filter((value) => value === 'moyen').length,
  };
}

function allStats() {
  const sections = [...document.querySelectorAll('details.section[data-section]')];
  return sections.reduce((result, section) => {
    const stats = sectionStats(section);
    result.total += stats.total;
    result.done += stats.done;
    return result;
  }, { total: 0, done: 0 });
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
  document.querySelectorAll('details.section[data-section]').forEach((section) => {
    const target = section.querySelector('[data-section-summary]');
    if (!target) return;
    const stats = sectionStats(section);
    const completed = stats.done === stats.total && stats.total > 0;
    target.classList.toggle('is-complete', completed);
    target.classList.toggle('has-defect', stats.defects > 0);
    target.innerHTML = english()
      ? `<strong>${completed ? 'Section complete' : `${stats.done}/${stats.total} checks completed`}</strong><span>${stats.defects} defect${stats.defects === 1 ? '' : 's'} · ${stats.warnings} warning${stats.warnings === 1 ? '' : 's'}</span>`
      : `<strong>${completed ? 'Section terminée' : `${stats.done}/${stats.total} points renseignés`}</strong><span>${stats.defects} défaut${stats.defects > 1 ? 's' : ''} · ${stats.warnings} point${stats.warnings > 1 ? 's' : ''} moyen${stats.warnings > 1 ? 's' : ''}</span>`;
  });
}

function createProgressDock() {
  const dock = document.createElement('button');
  dock.type = 'button';
  dock.className = 'inspection-progress-dock';
  dock.hidden = true;
  dock.innerHTML = '<span class="inspection-progress-ring"><strong>0%</strong></span><span><b>0 / 33</b><small>points vérifiés</small></span>';
  dock.addEventListener('click', () => {
    const next = [...document.querySelectorAll('details.section[data-section]')].find((section) => {
      const stats = sectionStats(section);
      return stats.total && stats.done < stats.total;
    });
    if (next) {
      next.open = true;
      next.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  document.body.append(dock);
  return dock;
}

function updateProgressDock(dock) {
  const stats = allStats();
  const percent = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  dock.style.setProperty('--inspection-progress', `${percent * 3.6}deg`);
  dock.querySelector('.inspection-progress-ring strong').textContent = `${percent}%`;
  dock.querySelector('b').textContent = `${stats.done} / ${stats.total}`;
  dock.querySelector('small').textContent = english() ? 'checks completed' : 'points vérifiés';
}

function showQuickModePrompt() {
  if (localStorage.getItem(QUICK_PROMPT_KEY) || document.querySelector('[data-quick-mode-prompt]')) return;
  const profile = document.querySelector('[name="usage_scenario"]:checked')?.value;
  if (profile !== 'buyer') return;
  const prompt = document.createElement('section');
  prompt.className = 'quick-mode-prompt';
  prompt.dataset.quickModePrompt = '';
  prompt.setAttribute('role', 'dialog');
  prompt.setAttribute('aria-labelledby', 'quickModePromptTitle');
  prompt.innerHTML = english()
    ? '<div><p class="panel-kicker">ON-SITE INSPECTION</p><h2 id="quickModePromptTitle">Short on time?</h2><p>Start with the 12 most critical checks. You can switch to the complete inspection at any time without losing data.</p></div><div><button type="button" data-quick-choice="quick">Start quick inspection</button><button type="button" data-quick-choice="complete">Keep complete inspection</button></div>'
    : '<div><p class="panel-kicker">CONTRÔLE SUR PLACE</p><h2 id="quickModePromptTitle">Vous manquez de temps ?</h2><p>Commencez par les 12 contrôles les plus critiques. Vous pourrez passer au contrôle complet sans perdre vos données.</p></div><div><button type="button" data-quick-choice="quick">Démarrer l’inspection rapide</button><button type="button" data-quick-choice="complete">Garder l’inspection complète</button></div>';
  document.querySelector('.wizard-view[data-wizard-step="4"] .wizard-expertise-intro')?.after(prompt);
  prompt.addEventListener('click', (event) => {
    const choice = event.target.closest('[data-quick-choice]')?.dataset.quickChoice;
    if (!choice) return;
    localStorage.setItem(QUICK_PROMPT_KEY, choice);
    if (choice === 'quick' && !document.body.classList.contains('quick-mode')) document.getElementById('quickModeToggle')?.click();
    prompt.remove();
  });
}

export function initializeInspectionEnhancements() {
  ensureSectionSummaries();
  const dock = createProgressDock();
  const refresh = () => {
    updateSectionSummaries();
    updateProgressDock(dock);
  };

  document.addEventListener('change', (event) => {
    const item = event.target.closest?.('.check-item');
    if (item && event.target.matches('input[type="radio"]')) {
      item.classList.remove('is-saved-feedback');
      requestAnimationFrame(() => item.classList.add('is-saved-feedback'));
      window.setTimeout(() => item.classList.remove('is-saved-feedback'), 650);
    }
    refresh();
  });
  window.addEventListener('cardiag:data-change', refresh);
  window.addEventListener('cardiag:record-open', refresh);
  window.addEventListener('cardiag:language-change', refresh);
  window.addEventListener('cardiag:wizard-step', (event) => {
    dock.hidden = event.detail?.step !== 4;
    if (event.detail?.step === 4) showQuickModePrompt();
    refresh();
  });
  refresh();
}
