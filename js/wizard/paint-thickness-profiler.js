/**
 * Vehicle Body Paint Thickness Profiler.
 *
 * Maps micrometric paint thickness values across major body panels:
 *  - 🟢 80 - 140 µm  : Original Factory Paint
 *  - 🟡 150 - 250 µm : Repainted / Respray
 *  - 🔴 > 250 µm     : Body Filler (Mastic) / Accident Repair
 */

function translate(fr, en) {
  return window.cardiagI18n?.language === 'en' ? en : fr;
}

export const PANELS = [
  { id: 'capot', label: 'Capot', en: 'Hood' },
  { id: 'toit', label: 'Pavillon / Toit', en: 'Roof' },
  { id: 'aile_avg', label: 'Aile AV Gauche', en: 'Front Left Fender' },
  { id: 'aile_avd', label: 'Aile AV Droite', en: 'Front Right Fender' },
  { id: 'porte_avg', label: 'Porte AV Gauche', en: 'Front Left Door' },
  { id: 'porte_avd', label: 'Porte AV Droite', en: 'Front Right Door' },
  { id: 'porte_arg', label: 'Porte AR Gauche', en: 'Rear Left Door' },
  { id: 'porte_ard', label: 'Porte AR Droite', en: 'Rear Right Door' },
  { id: 'aile_arg', label: 'Aile AR Gauche', en: 'Rear Left Quarter' },
  { id: 'aile_ard', label: 'Aile AR Droite', en: 'Rear Right Quarter' },
  { id: 'coffre', label: 'Coffre / Hayon', en: 'Trunk / Tailgate' },
];

/**
 * Classify thickness into factory, respray, or filler.
 * @param {number} value in microns (µm)
 * @returns {'factory'|'respray'|'filler'|'unknown'}
 */
export function classifyPaintThickness(value) {
  if (!value || isNaN(value) || value <= 0) return 'unknown';
  if (value <= 145) return 'factory';
  if (value <= 260) return 'respray';
  return 'filler';
}

export function initializePaintThicknessProfiler() {
  const container = document.getElementById('paintThicknessWrap');
  if (!container) return;

  const lang = window.cardiagI18n?.language === 'en' ? 'en' : 'fr';

  container.hidden = false;
  container.innerHTML = `
    <div class="paint-profiler-card">
      <div class="paint-profiler-header">
        <div class="paint-profiler-title">
          <span class="paint-badge">MICRONS (µm)</span>
          <strong>${translate('Relevé d’Épaisseur de Peinture (Carrosserie)', 'Paint Thickness Profiler (Bodywork)')}</strong>
        </div>
        <div class="paint-legend">
          <span class="legend-item"><span class="dot is-factory"></span> 80-140 µm Origine</span>
          <span class="legend-item"><span class="dot is-respray"></span> 150-250 µm Repeint</span>
          <span class="legend-item"><span class="dot is-filler"></span> >250 µm Mastic</span>
        </div>
      </div>
      <div class="paint-panels-grid">
        ${PANELS.map((p) => `
          <div class="paint-panel-item" data-panel="${p.id}">
            <label>${lang === 'en' ? p.en : p.label}</label>
            <div class="paint-input-wrap">
              <input type="number" min="0" max="2000" placeholder="110" data-paint-input="${p.id}">
              <span class="paint-unit">µm</span>
              <span class="paint-status-indicator" data-paint-status="${p.id}"></span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Listen to inputs and update color badges and notes
  container.querySelectorAll('[data-paint-input]').forEach((input) => {
    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      const panelId = input.dataset.paintInput;
      const statusEl = container.querySelector(`[data-paint-status="${panelId}"]`);
      const classification = classifyPaintThickness(val);

      if (statusEl) {
        statusEl.className = `paint-status-indicator is-${classification}`;
        if (classification === 'factory') statusEl.title = 'Origine usine (80-140 µm)';
        if (classification === 'respray') statusEl.title = 'Élément repeint (150-250 µm)';
        if (classification === 'filler') statusEl.title = 'Présence de mastic (> 250 µm)';
      }
    });
  });
}
