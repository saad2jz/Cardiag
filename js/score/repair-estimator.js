/**
 * Intelligent Repair Cost Estimator & Negotiation Suggestion.
 *
 * Computes an indicative repair cost based on:
 *  - Checklist points marked as 'defaut' or 'moyen'
 *  - Scanned / typed DTC fault codes (P0420, P0300, P0200, C0035, etc.)
 *
 * Provides a one-click apply button to pre-fill the budget section.
 */

function translate(fr, en) {
  return window.cardiagI18n?.language === 'en' ? en : fr;
}

/**
 * Average repair cost estimates (parts + labor, EUR) for common defects.
 */
export const DEFECT_COST_MATRIX = {
  // Checklist items
  pneus: { defaut: 280, moyen: 140, label: 'Train de pneumatiques' },
  freinage: { defaut: 320, moyen: 160, label: 'Disques & plaquettes de frein' },
  amortisseurs: { defaut: 450, moyen: 220, label: 'Amortisseurs' },
  soufflets: { defaut: 180, moyen: 90, label: 'Soufflets de cardan' },
  rotules: { defaut: 220, moyen: 110, label: 'Rotules / triangles de suspension' },
  vitesses: { defaut: 850, moyen: 350, label: 'Embrayage / volant moteur' },
  courroies: { defaut: 550, moyen: 200, label: 'Courroie de distribution / accessoires' },
  fuites: { defaut: 300, moyen: 150, label: 'Étanchéité moteur' },
  fumee: { defaut: 600, moyen: 250, label: 'Système injection / turbo' },
  clim: { defaut: 250, moyen: 90, label: 'Recharge / compresseur climatisation' },
  batterie: { defaut: 140, moyen: 70, label: 'Batterie 12V' },
  peinture: { defaut: 350, moyen: 150, label: 'Retouche carrosserie' },
  parebrise: { defaut: 400, moyen: 120, label: 'Pare-brise / vitrage' },
  feux_av: { defaut: 150, moyen: 60, label: 'Optique de phare' },
  feux_ar: { defaut: 120, moyen: 50, label: 'Feu arrière' },
  echappement: { defaut: 280, moyen: 120, label: 'Ligne d’échappement' },

  // Specific DTC codes
  P0420: { cost: 550, label: 'Catalyseur' },
  P0430: { cost: 550, label: 'Catalyseur Banque 2' },
  P0300: { cost: 180, label: 'Bougies & bobines d’allumage' },
  P0301: { cost: 120, label: 'Bougie / bobine Cylindre 1' },
  P0302: { cost: 120, label: 'Bougie / bobine Cylindre 2' },
  P0303: { cost: 120, label: 'Bougie / bobine Cylindre 3' },
  P0304: { cost: 120, label: 'Bougie / bobine Cylindre 4' },
  P0171: { cost: 220, label: 'Sonde Lambda / Débitmètre' },
  P0200: { cost: 450, label: 'Injecteur de carburant' },
  P0401: { cost: 350, label: 'Vanne EGR' },
  P0299: { cost: 950, label: 'Turbocompresseur' },
  C0035: { cost: 150, label: 'Capteur ABS' },
  C0040: { cost: 150, label: 'Capteur ABS' },
  C0045: { cost: 150, label: 'Capteur ABS' },
  C0050: { cost: 150, label: 'Capteur ABS' },
};

/**
 * Calculate total estimated repair cost based on active form state.
 * @returns {{ total: number, breakdown: Array<{ label: string, amount: number }> }}
 */
export function calculateEstimatedRepairs() {
  const breakdown = [];
  let total = 0;

  // 1. Checklist radios
  for (const [key, conf] of Object.entries(DEFECT_COST_MATRIX)) {
    if (!conf.defaut && !conf.moyen) continue;
    const checked = document.querySelector(`input[name="${key}"]:checked`);
    if (checked && (checked.value === 'defaut' || checked.value === 'moyen')) {
      const amount = conf[checked.value] || 0;
      if (amount > 0) {
        total += amount;
        breakdown.push({ label: `${conf.label} (${checked.value === 'defaut' ? 'Défaut' : 'Usure'})`, amount });
      }
    }
  }

  // 2. DTC Codes from fields
  const dtcFields = ['codes_ecm', 'codes_abs', 'codes_boite'];
  const allCodes = new Set();
  for (const name of dtcFields) {
    const input = document.querySelector(`input[name="${name}"]`);
    if (input && input.value) {
      const matches = input.value.match(/[PCBU]\d{4}/gi) || [];
      matches.forEach((c) => allCodes.add(c.toUpperCase()));
    }
  }

  for (const code of allCodes) {
    if (DEFECT_COST_MATRIX[code]) {
      const amount = DEFECT_COST_MATRIX[code].cost;
      total += amount;
      breakdown.push({ label: `Code ${code} : ${DEFECT_COST_MATRIX[code].label}`, amount });
    }
  }

  return { total, breakdown };
}

/**
 * Initialize repair estimator UI in Section 7 (Budget / Bilan).
 */
export function initializeRepairEstimator() {
  const container = document.getElementById('repairEstimatorWrap');
  if (!container) return;

  const updateUI = () => {
    const { total, breakdown } = calculateEstimatedRepairs();
    if (total === 0) {
      container.hidden = true;
      return;
    }

    container.hidden = false;
    container.innerHTML = `
      <div class="repair-estimator-card">
        <div class="repair-estimator-header">
          <div class="repair-estimator-title">
            <span class="repair-estimator-badge">💡 IA ESTIMATION</span>
            <strong>${translate('Frais de remise en état suggérés', 'Suggested Repair Costs')}</strong>
          </div>
          <span class="repair-estimator-amount">${total} €</span>
        </div>
        <ul class="repair-estimator-list">
          ${breakdown.slice(0, 4).map((b) => `
            <li>
              <span>${b.label}</span>
              <span class="repair-item-cost">~${b.amount} €</span>
            </li>
          `).join('')}
          ${breakdown.length > 4 ? `<li><em>+ ${breakdown.length - 4} autre(s) poste(s)</em></li>` : ''}
        </ul>
        <button type="button" class="btn-apply-repair-estimate" id="btnApplyRepairEstimate">
          ✨ ${translate(`Appliquer ${total} € au calcul du budget`, `Apply ${total} € to budget calculation`)}
        </button>
      </div>
    `;

    container.querySelector('#btnApplyRepairEstimate')?.addEventListener('click', () => {
      const fraisInput = document.getElementById('fraisEstimation');
      const margeInput = document.querySelector('input[name="marge_negociation"]');

      if (fraisInput) {
        fraisInput.value = total;
        fraisInput.dispatchEvent(new Event('input', { bubbles: true }));
        fraisInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (margeInput && !margeInput.value) {
        // Suggest slightly higher negotiation buffer (1.2x of repairs)
        margeInput.value = Math.round(total * 1.2);
        margeInput.dispatchEvent(new Event('input', { bubbles: true }));
        margeInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', {
        detail: {
          type: 'success',
          message: translate(
            `Frais estimés (${total} €) appliqués au budget.`,
            `Estimated costs (${total} €) applied to budget.`,
          ),
        },
      }));
    });
  };

  // Listen to changes across all inputs to recalculate dynamically
  document.addEventListener('change', (e) => {
    if (e.target.matches('input[type="radio"], input[name^="codes_"]')) {
      updateUI();
    }
  });

  updateUI();
}
