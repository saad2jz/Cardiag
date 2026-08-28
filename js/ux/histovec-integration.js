/**
 * HistoVec & Administrative History Verification Module.
 *
 * Provides direct access to the official French administrative portal (HistoVec)
 * and an integrated checklist for checking title status, lien certificates (non-gage),
 * chronological odometer readings, and previous severe accidents.
 */

function translate(fr, en) {
  return window.cardiagI18n?.language === 'en' ? en : fr;
}

export function initializeHistovecIntegration() {
  const container = document.getElementById('histovecVerificationWrap');
  if (!container) return;

  container.hidden = false;
  container.innerHTML = `
    <div class="histovec-card">
      <div class="histovec-header">
        <div class="histovec-title-block">
          <span class="histovec-badge">HISTOVEC</span>
          <strong>${translate('Historique Administratif Officiel', 'Official Administrative History')}</strong>
        </div>
        <a href="https://histovec.interieur.gouv.fr/histovec/accueil" target="_blank" rel="noopener noreferrer" class="histovec-btn-link">
          <span>🏛️ ${translate('Consulter HistoVec', 'Open HistoVec')}</span>
        </a>
      </div>
      <p class="histovec-desc">${translate(
        'Vérifiez la situation administrative gratuite et officielle du véhicule avant l’achat.',
        'Check the free, official administrative background of the vehicle before purchase.',
      )}</p>
      <div class="histovec-checklist">
        <label class="histovec-item">
          <input type="checkbox" name="histovec_gage_verifie">
          <span>${translate('Certificat de non-gage vérifié (aucune opposition au transfert)', 'Lien certificate checked (no opposition to transfer)')}</span>
        </label>
        <label class="histovec-item">
          <input type="checkbox" name="histovec_km_coherence">
          <span>${translate('Chronologie du kilométrage cohérente aux contrôles techniques', 'Chronological mileage consistent across inspections')}</span>
        </label>
        <label class="histovec-item">
          <input type="checkbox" name="histovec_sinistre_verifie">
          <span>${translate('Absence de procédure VGE / VEI (véhicule gravement endommagé)', 'No severe total loss or write-off record')}</span>
        </label>
      </div>
    </div>
  `;
}
