/**
 * OBD2 Mode 01 PID Definitions & Formulas.
 *
 * Supported standard PIDs (read-only):
 *  - 010C: Engine RPM ((A*256)+B)/4
 *  - 010D: Vehicle speed (km/h) A
 *  - 0105: Coolant temperature (°C) A-40
 *  - 010B: Intake manifold absolute pressure (kPa) A (Note: honest naming "Pression tubulure")
 *  - 0110: MAF air flow rate (g/s) ((A*256)+B)/100
 *  - 0111: Throttle position (%) A*100/255
 *  - 0104: Calculated engine load (%) A*100/255
 *  - 010E: Timing advance (°) (A/2)-64
 *  - 0106: Short term fuel trim Bank 1 (%) (A-128)*100/128
 *  - 0107: Long term fuel trim Bank 1 (%) (A-128)*100/128
 *  - 010F: Intake air temperature (°C) A-40
 *  - 012F: Fuel tank level input (%) A*100/255
 *  - 0133: Absolute barometric pressure (kPa) A
 */

export const PID_DEFINITIONS = Object.freeze({
  '010C': {
    id: '010C',
    nameFr: 'Régime moteur',
    nameEn: 'Engine RPM',
    shortName: 'RPM',
    unit: 'tr/min',
    unitEn: 'RPM',
    bytes: 2,
    min: 0,
    max: 8000,
    calculate: (A, B) => Math.round(((A * 256) + B) / 4),
    format: (val) => `${val} tr/min`,
    plausibility: {
      warnMin: null,
      warnMax: 6500,
      alertMessageFr: (val) => `Régime moteur élevé constaté (${val} tr/min)`,
      alertMessageEn: (val) => `High engine RPM recorded (${val} RPM)`,
    },
  },
  '010D': {
    id: '010D',
    nameFr: 'Vitesse véhicule',
    nameEn: 'Vehicle speed',
    shortName: 'Vitesse',
    unit: 'km/h',
    unitEn: 'km/h',
    bytes: 1,
    min: 0,
    max: 260,
    calculate: (A) => A,
    format: (val) => `${val} km/h`,
    plausibility: null,
  },
  '0105': {
    id: '0105',
    nameFr: 'Température LDR (moteur)',
    nameEn: 'Coolant temperature',
    shortName: 'LDR',
    unit: '°C',
    unitEn: '°C',
    bytes: 1,
    min: -40,
    max: 140,
    calculate: (A) => A - 40,
    format: (val) => `${val} °C`,
    plausibility: {
      warnMin: 50, // Cold engine during road test warning
      warnMax: 110, // Overheating
      alertMessageFr: (val) => val > 110
        ? `Surchauffe moteur détectée pendant l'essai (${val} °C)`
        : `Moteur anormalement froid pendant l'essai (${val} °C — thermostat ouvert/bloqué ?)`
      ,
      alertMessageEn: (val) => val > 110
        ? `Engine overheating recorded during test (${val} °C)`
        : `Engine running unusually cold (${val} °C — stuck open thermostat?)`
      ,
    },
  },
  '010B': {
    id: '010B',
    nameFr: 'Pression tubulure d\'admission',
    nameEn: 'Intake manifold absolute pressure',
    shortName: 'Pression tubulure',
    unit: 'kPa',
    unitEn: 'kPa',
    bytes: 1,
    min: 0,
    max: 255,
    calculate: (A) => A,
    format: (val) => `${val} kPa`,
    plausibility: null,
  },
  '0110': {
    id: '0110',
    nameFr: 'Débit d\'air massique (MAF)',
    nameEn: 'Mass air flow (MAF)',
    shortName: 'Débit MAF',
    unit: 'g/s',
    unitEn: 'g/s',
    bytes: 2,
    min: 0,
    max: 300,
    calculate: (A, B) => Number((((A * 256) + B) / 100).toFixed(2)),
    format: (val) => `${val} g/s`,
    plausibility: null,
  },
  '0111': {
    id: '0111',
    nameFr: 'Position papillon des gaz',
    nameEn: 'Throttle position',
    shortName: 'Papillon',
    unit: '%',
    unitEn: '%',
    bytes: 1,
    min: 0,
    max: 100,
    calculate: (A) => Math.round((A * 100) / 255),
    format: (val) => `${val} %`,
    plausibility: null,
  },
  '0104': {
    id: '0104',
    nameFr: 'Charge moteur calculée',
    nameEn: 'Calculated engine load',
    shortName: 'Charge moteur',
    unit: '%',
    unitEn: '%',
    bytes: 1,
    min: 0,
    max: 100,
    calculate: (A) => Math.round((A * 100) / 255),
    format: (val) => `${val} %`,
    plausibility: null,
  },
  '010E': {
    id: '010E',
    nameFr: 'Avance à l\'allumage',
    nameEn: 'Timing advance',
    shortName: 'Avance',
    unit: '°',
    unitEn: '°',
    bytes: 1,
    min: -64,
    max: 64,
    calculate: (A) => Number(((A / 2) - 64).toFixed(1)),
    format: (val) => `${val} °`,
    plausibility: {
      warnMin: -30,
      warnMax: 50,
      alertMessageFr: (val) => `Avance à l'allumage atypique relevée (${val}°)`,
      alertMessageEn: (val) => `Unusual timing advance recorded (${val}°)`,
    },
  },
  '0106': {
    id: '0106',
    nameFr: 'Correction carburant court terme (STFT)',
    nameEn: 'Short term fuel trim (STFT B1)',
    shortName: 'STFT B1',
    unit: '%',
    unitEn: '%',
    bytes: 1,
    min: -100,
    max: 100,
    calculate: (A) => Number((((A - 128) * 100) / 128).toFixed(1)),
    format: (val) => `${val > 0 ? '+' : ''}${val} %`,
    plausibility: {
      warnMin: -25,
      warnMax: 25,
      alertMessageFr: (val) => `Correction carburant court terme hors plage (${val > 0 ? '+' : ''}${val}%)`,
      alertMessageEn: (val) => `Short-term fuel trim out of bounds (${val > 0 ? '+' : ''}${val}%)`,
    },
  },
  '0107': {
    id: '0107',
    nameFr: 'Correction carburant long terme (LTFT)',
    nameEn: 'Long term fuel trim (LTFT B1)',
    shortName: 'LTFT B1',
    unit: '%',
    unitEn: '%',
    bytes: 1,
    min: -100,
    max: 100,
    calculate: (A) => Number((((A - 128) * 100) / 128).toFixed(1)),
    format: (val) => `${val > 0 ? '+' : ''}${val} %`,
    plausibility: {
      warnMin: -20,
      warnMax: 20,
      alertMessageFr: (val) => `Correction carburant long terme anormale (${val > 0 ? '+' : ''}${val}% — prise d'air ou défaut injection/richesse)`,
      alertMessageEn: (val) => `Abnormal long-term fuel trim (${val > 0 ? '+' : ''}${val}% — intake leak or fueling defect)`,
    },
  },
  '010F': {
    id: '010F',
    nameFr: 'Température air admission',
    nameEn: 'Intake air temperature (IAT)',
    shortName: 'Temp. admission',
    unit: '°C',
    unitEn: '°C',
    bytes: 1,
    min: -40,
    max: 100,
    calculate: (A) => A - 40,
    format: (val) => `${val} °C`,
    plausibility: {
      warnMin: null,
      warnMax: 80,
      alertMessageFr: (val) => `Température d'air admission très élevée (${val} °C — échangeur inefficace ?)`,
      alertMessageEn: (val) => `High intake air temperature recorded (${val} °C — intercooler issue?)`,
    },
  },
  '012F': {
    id: '012F',
    nameFr: 'Niveau de carburant',
    nameEn: 'Fuel tank level',
    shortName: 'Niveau carburant',
    unit: '%',
    unitEn: '%',
    bytes: 1,
    min: 0,
    max: 100,
    calculate: (A) => Math.round((A * 100) / 255),
    format: (val) => `${val} %`,
    plausibility: null,
  },
  '0133': {
    id: '0133',
    nameFr: 'Pression atmosphérique',
    nameEn: 'Barometric pressure',
    shortName: 'Pression baro',
    unit: 'kPa',
    unitEn: 'kPa',
    bytes: 1,
    min: 0,
    max: 255,
    calculate: (A) => A,
    format: (val) => `${val} kPa`,
    plausibility: null,
  },
});

/**
 * Parse an OBD2 Mode 01 hex response frame.
 * Format usually: "41 [PID] [A] [B]..."
 *
 * @param {string} rawResponse
 * @param {string} pidHex - 4 chars, e.g. "010C"
 * @returns {number|null} converted numeric value, or null on parse failure
 */
export function parsePidResponse(rawResponse, pidHex) {
  if (!rawResponse) return null;
  const def = PID_DEFINITIONS[pidHex.toUpperCase()];
  if (!def) return null;

  // Mode 01 response starts with "41" followed by the 2-hex PID
  const pidSub = pidHex.slice(2).toUpperCase(); // e.g. "0C"
  const cleaned = String(rawResponse).replace(/\s+/g, '').toUpperCase();

  // Find occurrences of "41" + pidSub
  const expectedPrefix = `41${pidSub}`;
  const idx = cleaned.indexOf(expectedPrefix);
  if (idx === -1) return null;

  const dataPayload = cleaned.slice(idx + expectedPrefix.length);
  if (dataPayload.length < def.bytes * 2) return null;

  const A = parseInt(dataPayload.slice(0, 2), 16);
  if (Number.isNaN(A)) return null;

  if (def.bytes === 1) {
    return def.calculate(A);
  }

  const B = parseInt(dataPayload.slice(2, 4), 16);
  if (Number.isNaN(B)) return null;

  return def.calculate(A, B);
}

/**
 * Parse bitmask response from PID support queries: 0100, 0120, 0140.
 * Response: 4 bytes (8 hex characters) representing 32 bits for PIDs 01..20, 21..40, 41..60.
 *
 * @param {string} rawResponse
 * @param {number} baseOffset - 0x00 for 0100, 0x20 for 0120, 0x40 for 0140
 * @returns {Set<string>} set of supported PID codes, e.g. {"010C", "010D", ...}
 */
export function parseSupportedPidsBitmask(rawResponse, baseOffset = 0x00) {
  const supported = new Set();
  if (!rawResponse) return supported;

  const sub = baseOffset.toString(16).padStart(2, '0').toUpperCase();
  const cleaned = String(rawResponse).replace(/\s+/g, '').toUpperCase();
  const prefix = `41${sub}`;
  const idx = cleaned.indexOf(prefix);
  if (idx === -1) return supported;

  const hexBytes = cleaned.slice(idx + prefix.length, idx + prefix.length + 8);
  if (hexBytes.length < 8) return supported;

  for (let byteIndex = 0; byteIndex < 4; byteIndex++) {
    const byteVal = parseInt(hexBytes.slice(byteIndex * 2, byteIndex * 2 + 2), 16);
    if (Number.isNaN(byteVal)) continue;

    for (let bit = 7; bit >= 0; bit--) {
      const isSet = (byteVal & (1 << bit)) !== 0;
      if (isSet) {
        const pidNum = baseOffset + (byteIndex * 8) + (7 - bit) + 1;
        const pidHex = `01${pidNum.toString(16).padStart(2, '0').toUpperCase()}`;
        supported.add(pidHex);
      }
    }
  }

  return supported;
}
