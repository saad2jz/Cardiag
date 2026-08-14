const CATEGORY_COLORS = { vital:'#ef4444', chassis:'#f59e0b', esthetique:'#22c55e' };

function scoreColor(score) {
  if (score == null) return 'var(--border)';
  return score >= 80 ? '#22c55e' : score >= 55 ? '#f59e0b' : '#ef4444';
}

function createPanel() {
  const panel = document.createElement('section');
  panel.className = 'live-score-panel';
  panel.setAttribute('aria-label', 'Score visuel de l’expertise');
  panel.innerHTML = `
    <div class="live-score-copy"><p class="panel-kicker">SCORE DE CONFIANCE</p><h3>État global du véhicule</h3><p data-score-progress>0 / 33 points vérifiés</p></div>
    <div class="live-score-donut" data-score-donut><strong data-score-value>—</strong><span>score</span></div>
    <div class="live-score-categories" data-score-categories></div>`;
  const diagnosticBody = document.querySelector('details.section[data-section="diagnostic"] .section-body');
  diagnosticBody?.prepend(panel);
  return panel;
}

export function initializeScoreVisuals() {
  const panel = createPanel();
  if (!panel.isConnected) return;
  const render = () => {
    const model = window.cardiagDataBridge?.getReportModel?.();
    if (!model) return;
    const score = model.score;
    const color = scoreColor(score);
    panel.querySelector('[data-score-value]').textContent = score == null ? '—' : `${score}%`;
    panel.querySelector('[data-score-progress]').textContent = `${model.done} / ${model.total} points vérifiés`;
    panel.querySelector('[data-score-donut]').style.background = score == null
      ? 'conic-gradient(var(--border) 0 100%)'
      : `conic-gradient(${color} 0 ${score}%, color-mix(in srgb,var(--border) 55%,transparent) ${score}% 100%)`;
    panel.querySelector('[data-score-categories]').replaceChildren(...model.categories.map((category) => {
      const row = document.createElement('div');
      const value = category.score ?? 0;
      row.className = 'live-score-category';
      row.innerHTML = `<div><strong>${category.label.split(' (')[0]}</strong><span>${category.score == null ? '—' : `${category.score}%`} · ×${category.weight}</span></div><i><b></b></i>`;
      row.querySelector('b').style.cssText = `width:${value}%;background:${CATEGORY_COLORS[category.category]}`;
      return row;
    }));
  };
  window.addEventListener('cardiag:data-change', render);
  window.addEventListener('cardiag:record-open', render);
  render();
}
