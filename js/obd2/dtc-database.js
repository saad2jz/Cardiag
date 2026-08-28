/**
 * Local DTC (Diagnostic Trouble Code) database for offline lookup and assisted input.
 *
 * Sources: SAE J2012 generic codes + knowledge-base.js curated entries.
 * This table intentionally stays concise (~60 codes) to keep the client bundle small.
 * Codes not found here are delegated to the expert assistant (online).
 */

const DTC_TABLE = Object.freeze({
  // ── Powertrain generic (P0xxx) ──────────────────────────────────────────
  P0010: { fr: 'Circuit actionneur de calage d\'arbre à cames (A) — Banque 1', en: 'Camshaft position actuator circuit (A) — Bank 1', cat: 'powertrain' },
  P0100: { fr: 'Dysfonctionnement du circuit de débit d\'air massique ou volumétrique', en: 'Mass or volume air flow circuit malfunction', cat: 'powertrain' },
  P0101: { fr: 'Plage/performance du circuit de débit d\'air massique', en: 'Mass air flow circuit range/performance', cat: 'powertrain' },
  P0102: { fr: 'Signal bas du circuit de débit d\'air massique', en: 'Mass air flow circuit low input', cat: 'powertrain' },
  P0110: { fr: 'Dysfonctionnement du circuit de température d\'air d\'admission', en: 'Intake air temperature circuit malfunction', cat: 'powertrain' },
  P0115: { fr: 'Dysfonctionnement du circuit de température du liquide de refroidissement', en: 'Engine coolant temperature circuit malfunction', cat: 'powertrain' },
  P0120: { fr: 'Dysfonctionnement du circuit du capteur de position papillon A', en: 'Throttle position sensor A circuit malfunction', cat: 'powertrain' },
  P0130: { fr: 'Dysfonctionnement de la sonde O2 (Banque 1, Sonde 1)', en: 'O2 sensor circuit malfunction (Bank 1, Sensor 1)', cat: 'powertrain' },
  P0131: { fr: 'Tension basse de la sonde O2 (B1S1)', en: 'O2 sensor circuit low voltage (B1S1)', cat: 'powertrain' },
  P0133: { fr: 'Réponse lente de la sonde O2 (B1S1)', en: 'O2 sensor circuit slow response (B1S1)', cat: 'powertrain' },
  P0171: { fr: 'Mélange trop pauvre — Banque 1', en: 'System too lean — Bank 1', cat: 'powertrain' },
  P0172: { fr: 'Mélange trop riche — Banque 1', en: 'System too rich — Bank 1', cat: 'powertrain' },
  P0174: { fr: 'Mélange trop pauvre — Banque 2', en: 'System too lean — Bank 2', cat: 'powertrain' },
  P0175: { fr: 'Mélange trop riche — Banque 2', en: 'System too rich — Bank 2', cat: 'powertrain' },
  P0200: { fr: 'Dysfonctionnement du circuit d\'injecteur', en: 'Injector circuit malfunction', cat: 'powertrain' },
  P0217: { fr: 'Surchauffe moteur', en: 'Engine over-temperature condition', cat: 'powertrain' },
  P0299: { fr: 'Pression de suralimentation insuffisante', en: 'Turbo/Supercharger underboost', cat: 'powertrain' },
  P0300: { fr: 'Ratés de combustion aléatoires / multiples cylindres', en: 'Random/multiple cylinder misfire detected', cat: 'powertrain' },
  P0301: { fr: 'Raté de combustion détecté — Cylindre 1', en: 'Cylinder 1 misfire detected', cat: 'powertrain' },
  P0302: { fr: 'Raté de combustion détecté — Cylindre 2', en: 'Cylinder 2 misfire detected', cat: 'powertrain' },
  P0303: { fr: 'Raté de combustion détecté — Cylindre 3', en: 'Cylinder 3 misfire detected', cat: 'powertrain' },
  P0304: { fr: 'Raté de combustion détecté — Cylindre 4', en: 'Cylinder 4 misfire detected', cat: 'powertrain' },
  P0325: { fr: 'Dysfonctionnement du circuit du capteur de cliquetis (Banque 1)', en: 'Knock sensor 1 circuit malfunction (Bank 1)', cat: 'powertrain' },
  P0340: { fr: 'Dysfonctionnement du circuit du capteur de position d\'arbre à cames', en: 'Camshaft position sensor circuit malfunction', cat: 'powertrain' },
  P0401: { fr: 'Débit de recirculation des gaz (EGR) insuffisant', en: 'Exhaust gas recirculation flow insufficient', cat: 'powertrain' },
  P0402: { fr: 'Débit de recirculation des gaz (EGR) excessif', en: 'Exhaust gas recirculation flow excessive', cat: 'powertrain' },
  P0420: { fr: 'Efficacité du catalyseur sous le seuil — Banque 1', en: 'Catalyst system efficiency below threshold — Bank 1', cat: 'powertrain' },
  P0430: { fr: 'Efficacité du catalyseur sous le seuil — Banque 2', en: 'Catalyst system efficiency below threshold — Bank 2', cat: 'powertrain' },
  P0440: { fr: 'Dysfonctionnement du système d\'émissions évaporatives', en: 'Evaporative emission control system malfunction', cat: 'powertrain' },
  P0442: { fr: 'Petite fuite détectée dans le système EVAP', en: 'EVAP emission control system leak detected (small)', cat: 'powertrain' },
  P0455: { fr: 'Grosse fuite détectée dans le système EVAP', en: 'EVAP emission control system leak detected (gross)', cat: 'powertrain' },
  P0500: { fr: 'Dysfonctionnement du capteur de vitesse du véhicule', en: 'Vehicle speed sensor malfunction', cat: 'powertrain' },
  P0505: { fr: 'Dysfonctionnement du système de régulation de ralenti', en: 'Idle control system malfunction', cat: 'powertrain' },
  P0562: { fr: 'Tension basse du système électrique', en: 'System voltage low', cat: 'powertrain' },
  P0600: { fr: 'Dysfonctionnement du lien de communication du module série (CAN)', en: 'Serial communication link malfunction', cat: 'powertrain' },
  P0700: { fr: 'Dysfonctionnement du système de contrôle de transmission', en: 'Transmission control system malfunction', cat: 'powertrain' },
  P0715: { fr: 'Dysfonctionnement du circuit capteur de régime de turbine', en: 'Input/turbine speed sensor circuit malfunction', cat: 'powertrain' },
  P0730: { fr: 'Rapport de transmission incorrect', en: 'Incorrect gear ratio', cat: 'powertrain' },
  P0741: { fr: 'Performance du circuit de convertisseur de couple / blocage', en: 'Torque converter clutch circuit performance / stuck off', cat: 'powertrain' },

  // ── Powertrain manufacturer-specific (P1xxx) ───────────────────────────
  P1000: { fr: 'Moniteurs OBD non terminés (mémoire récemment effacée)', en: 'OBD monitors not complete (recently cleared memory)', cat: 'powertrain' },

  // ── Chassis (C0xxx) ────────────────────────────────────────────────────
  C0035: { fr: 'Dysfonctionnement du circuit du capteur de vitesse de roue avant gauche', en: 'Left front wheel speed sensor circuit malfunction', cat: 'chassis' },
  C0040: { fr: 'Dysfonctionnement du circuit du capteur de vitesse de roue avant droite', en: 'Right front wheel speed sensor circuit malfunction', cat: 'chassis' },
  C0045: { fr: 'Dysfonctionnement du circuit du capteur de vitesse de roue arrière gauche', en: 'Left rear wheel speed sensor circuit malfunction', cat: 'chassis' },
  C0050: { fr: 'Dysfonctionnement du circuit du capteur de vitesse de roue arrière droite', en: 'Right rear wheel speed sensor circuit malfunction', cat: 'chassis' },
  C0060: { fr: 'Dysfonctionnement de la pompe ABS', en: 'ABS pump motor circuit malfunction', cat: 'chassis' },
  C0110: { fr: 'Dysfonctionnement de la pompe de direction assistée', en: 'Power steering motor circuit', cat: 'chassis' },
  C0242: { fr: 'Dysfonctionnement du circuit de l\'électrovanne ABS', en: 'ABS solenoid valve circuit malfunction', cat: 'chassis' },
  C1095: { fr: 'Dysfonctionnement du module de pompe hydraulique ABS', en: 'ABS hydraulic pump motor circuit malfunction', cat: 'chassis' },
  C1201: { fr: 'Dysfonctionnement du module de contrôle moteur (via ABS)', en: 'Engine control system malfunction (ABS module)', cat: 'chassis' },

  // ── Body (B0xxx) ───────────────────────────────────────────────────────
  B0001: { fr: 'Défaut du circuit de l\'airbag conducteur', en: 'Driver frontal airbag circuit malfunction', cat: 'body' },
  B0002: { fr: 'Défaut du circuit de l\'airbag passager', en: 'Passenger frontal airbag circuit malfunction', cat: 'body' },
  B0028: { fr: 'Dysfonctionnement du capteur de présence de passager', en: 'Occupant sensor circuit malfunction', cat: 'body' },
  B0100: { fr: 'Dysfonctionnement de la commande de verrouillage centralisé', en: 'Central locking system malfunction', cat: 'body' },
  B1000: { fr: 'Dysfonctionnement du module de carrosserie (BCM)', en: 'Body control module malfunction', cat: 'body' },
  B1318: { fr: 'Tension basse de la batterie', en: 'Battery voltage low', cat: 'body' },

  // ── Network (U0xxx) ────────────────────────────────────────────────────
  U0001: { fr: 'Bus CAN haute vitesse — pas de communication', en: 'High speed CAN communication bus — no communication', cat: 'network' },
  U0073: { fr: 'Module de contrôle — perte de communication bus (A)', en: 'Control module — communication bus A off', cat: 'network' },
  U0100: { fr: 'Pas de communication avec le module moteur (ECM/PCM)', en: 'Lost communication with ECM/PCM', cat: 'network' },
  U0101: { fr: 'Pas de communication avec le module de transmission (TCM)', en: 'Lost communication with TCM', cat: 'network' },
  U0121: { fr: 'Pas de communication avec le module ABS', en: 'Lost communication with ABS control module', cat: 'network' },
  U0140: { fr: 'Pas de communication avec le module de carrosserie (BCM)', en: 'Lost communication with body control module', cat: 'network' },
  U0155: { fr: 'Pas de communication avec le combiné d\'instruments', en: 'Lost communication with instrument cluster', cat: 'network' },
});

/**
 * Look up a single DTC code.
 * @param {string} code - e.g. "P0301"
 * @returns {{ code: string, fr: string, en: string, cat: string } | null}
 */
export function lookupDTC(code) {
  if (!code) return null;
  const normalized = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const entry = DTC_TABLE[normalized];
  return entry ? { code: normalized, fr: entry.fr, en: entry.en, cat: entry.cat } : null;
}

/**
 * Search DTC codes matching a partial string.
 * @param {string} partial - e.g. "P03" or "raté"
 * @param {{ language?: string, limit?: number }} opts
 * @returns {Array<{ code: string, fr: string, en: string, cat: string }>}
 */
export function searchDTCs(partial, { language = 'fr', limit = 8 } = {}) {
  if (!partial || String(partial).trim().length < 2) return [];
  const needle = String(partial).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const needleLower = String(partial).toLowerCase();
  const results = [];
  for (const [code, entry] of Object.entries(DTC_TABLE)) {
    if (results.length >= limit) break;
    if (code.includes(needle)) {
      results.push({ code, fr: entry.fr, en: entry.en, cat: entry.cat });
    } else if (entry[language]?.toLowerCase().includes(needleLower)) {
      results.push({ code, fr: entry.fr, en: entry.en, cat: entry.cat });
    }
  }
  return results;
}

/**
 * Return the description string for a code in the given language.
 * @param {string} code
 * @param {string} [language='fr']
 * @returns {string|null}
 */
export function describeDTC(code, language = 'fr') {
  const entry = lookupDTC(code);
  if (!entry) return null;
  return language === 'en' ? entry.en : entry.fr;
}
