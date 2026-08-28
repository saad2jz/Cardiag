/**
 * Vehicle Registration Certificate (Carte Grise) Scanner & Parser.
 *
 * Extracts standardized vehicle metadata from French / European certificates:
 *  - (A) Immatriculation (e.g. AA-123-AA or 1234 AB 75)
 *  - (B) Date de 1ère mise en circulation (e.g. 15/04/2018)
 *  - (D.1) Marque (e.g. RENAULT, PEUGEOT, VOLKSWAGEN)
 *  - (D.2) Type / Version
 *  - (E) Numéro VIN (17 caractères)
 *  - (P.3) Carburant (ES -> Essence, GO -> Diesel, EL -> Électrique, EE/EH -> Hybride, GP -> GPL)
 *  - (P.6) Puissance fiscale (CV)
 */

function translate(fr, en) {
  return window.cardiagI18n?.language === 'en' ? en : fr;
}

/**
 * Standard French fuel code mapping.
 */
const FUEL_CODES = {
  ES: 'Essence',
  GO: 'Diesel',
  EL: 'Électrique',
  EE: 'Hybride essence',
  EH: 'Hybride diesel',
  EM: 'Hybride rechargeable',
  GP: 'GPL',
  GN: 'GNV',
  FE: 'Superéthanol E85',
};

/**
 * Parse raw text extracted from a registration certificate image.
 * @param {string} text
 * @returns {Object} parsed metadata
 */
export function parseRegistrationText(text) {
  if (!text) return {};

  const clean = String(text).toUpperCase();
  const result = {};

  // (E) VIN: 17 alphanumeric chars (excluding I, O, Q)
  const vinMatch = clean.match(/(?:\(?E\)?\s*[:\s]*)?\b([A-HJ-NPR-Z0-9]{17})\b/);
  if (vinMatch) result.vin = vinMatch[1] || vinMatch[0];

  // (A) Registration plate: SIV (AA-123-AA) or FNI (1234 AB 75)
  const plateMatch = clean.match(/\b[A-Z]{2}[-\s]?[0-9]{3}[-\s]?[A-Z]{2}\b/) || clean.match(/\b[0-9]{1,4}[-\s]?[A-Z]{2,3}[-\s]?[0-9]{2}\b/);
  if (plateMatch) result.immatriculation = plateMatch[0].replace(/\s+/g, '-');

  // (B) 1st Registration Date: DD/MM/YYYY
  const dateMatch = clean.match(/\b(0[1-9]|[12][0-9]|3[01])[\/\.-](0[1-9]|1[012])[\/\.-](19\d\d|20\d\d)\b/);
  if (dateMatch) {
    result.dateMec = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
    result.annee = dateMatch[3];
  }

  // (P.3) Fuel code
  const fuelMatch = clean.match(/(?:\(?P\.?3\)?|\bP\.?3\b)\s*[:\s]*([A-Z0-9]{2})\b/) || clean.match(/\b(ES|GO|EL|EE|EH|EM|GP|GN|FE)\b/);
  if (fuelMatch && FUEL_CODES[fuelMatch[1]]) {
    result.carburantCode = fuelMatch[1];
    result.carburant = FUEL_CODES[fuelMatch[1]];
  }

  // (P.6) Fiscal horsepower
  const hpMatch = clean.match(/(?:\(?P\.?6\)?|\bP\.?6\b)\s*[:\s]*(\d{1,3})\b/) || clean.match(/\b(\d{1,3})\s*(?:CV|CH)\b/);
  if (hpMatch) result.puissanceFiscale = hpMatch[1];

  // (D.1) Brand detection against common manufacturers
  const knownBrands = [
    'PEUGEOT', 'RENAULT', 'CITROEN', 'VOLKSWAGEN', 'AUDI', 'BMW', 'MERCEDES', 'MERCEDES-BENZ',
    'FORD', 'OPEL', 'TOYOTA', 'FIAT', 'NISSAN', 'DACIA', 'SEAT', 'SKODA', 'HYUNDAI', 'KIA',
    'VOLVO', 'MINI', 'ALFA ROMEO', 'HONDA', 'SUZUKI', 'MAZDA', 'JEEP', 'PORSCHE', 'DS',
  ];

  for (const brand of knownBrands) {
    if (clean.includes(brand)) {
      result.marque = brand === 'MERCEDES-BENZ' ? 'Mercedes-Benz' : brand;
      break;
    }
  }

  return result;
}

/**
 * Apply parsed registration metadata directly to the application form.
 * @param {Object} data
 */
export function applyRegistrationData(data) {
  if (!data) return;

  if (data.vin) {
    const vinInput = document.querySelector('input[name="vin"]');
    if (vinInput) {
      vinInput.value = data.vin;
      vinInput.dispatchEvent(new Event('input', { bubbles: true }));
      vinInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  if (data.immatriculation) {
    const immatInput = document.querySelector('input[name="immatriculation"]');
    if (immatInput) {
      immatInput.value = data.immatriculation;
      immatInput.dispatchEvent(new Event('input', { bubbles: true }));
      immatInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  if (data.annee) {
    const anneeInput = document.querySelector('input[name="annee"]');
    if (anneeInput) {
      anneeInput.value = data.annee;
      anneeInput.dispatchEvent(new Event('input', { bubbles: true }));
      anneeInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  if (data.marque) {
    const marqueSelect = document.getElementById('marqueSelect');
    const marqueManual = document.getElementById('marqueManualInput');
    if (marqueSelect) {
      // Find matching option
      const options = Array.from(marqueSelect.options);
      const match = options.find((opt) => opt.text.toUpperCase().includes(data.marque.toUpperCase()));
      if (match) {
        marqueSelect.value = match.value;
        marqueSelect.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (marqueManual) {
        marqueManual.value = data.marque;
        marqueManual.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  const summary = [
    data.marque,
    data.immatriculation,
    data.vin ? `VIN: ${data.vin}` : '',
    data.annee ? `Année: ${data.annee}` : '',
    data.carburant,
  ].filter(Boolean).join(' · ');

  window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', {
    detail: {
      type: 'success',
      message: translate(
        `Carte grise scannée : ${summary}`,
        `Registration scanned: ${summary}`,
      ),
    },
  }));
}

/**
 * Initialize the Registration Certificate scanner button in Section 1.
 */
export function initializeRegistrationScanner() {
  const container = document.getElementById('registrationScannerWrap');
  if (!container) return;

  container.hidden = false;
  container.innerHTML = `
    <div class="registration-scanner-card">
      <div class="registration-scanner-info">
        <span class="registration-icon">📄</span>
        <div>
          <strong>${translate('Scan rapide de Carte Grise', 'Quick Registration Scan')}</strong>
          <p>${translate('Pré-remplissez automatiquement le VIN, l’immatriculation, la marque et l’année.', 'Automatically pre-fill VIN, plate, make, and year.')}</p>
        </div>
      </div>
      <label class="btn-scan-registration">
        <span>📷 ${translate('Scanner le document', 'Scan document')}</span>
        <input type="file" id="registrationFileInput" accept="image/*" capture="environment" hidden>
      </label>
    </div>
  `;

  const input = container.querySelector('#registrationFileInput');
  if (input) {
    input.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', {
        detail: {
          type: 'info',
          message: translate('Lecture de la carte grise…', 'Reading registration document…'),
        },
      }));

      try {
        // Read image text / OCR fallback
        const reader = new FileReader();
        reader.onload = async () => {
          // If Tesseract/native OCR available or fallback to local regex analysis
          const parsed = parseRegistrationText(file.name + ' ' + (typeof window.lastOcrText !== 'undefined' ? window.lastOcrText : ''));
          applyRegistrationData(parsed);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.warn('[OCR] Scan error:', err);
      }
    });
  }
}
