/**
 * OBD2 Controller — main orchestrator for the OBD2 scan & live streaming features.
 *
 * Platform detection → conditional UI injection → Bluetooth scan, live streaming or manual input.
 *
 * - Android with BT plugin:
 *    • Section 7: "🔌 Scanner via Bluetooth" button + DTC parsing + P1000 detection
 *    • Section 6: "📊 Démarrer le suivi en direct" live gauges panel (RPM, Speed, Temp, Fuel trims, etc.)
 * - iOS / Web / Android without BT:
 *    • Section 7: manual assisted input only (no intrusive error, clean fallback)
 *    • Section 6: live gauges panel absent cleanly
 */

import * as btSpp from './bluetooth-spp.js';
import { createSession } from './elm327-protocol.js';
import { lookupDTC } from './dtc-database.js';
import { initializeDtcAssist } from './dtc-assist.js';
import { LiveStreamer } from './live-streamer.js';
import { LiveGaugesUI } from './live-gauges.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function language() {
  return window.cardiagI18n?.language === 'en' ? 'en' : 'fr';
}

function translate(fr, en) {
  return language() === 'en' ? en : fr;
}

function escapeHtml(text) {
  return String(text || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Show a feedback toast via the existing wizard-feedback mechanism.
 * @param {'info'|'error'|'success'} type
 * @param {string} message
 */
function feedback(type, message) {
  window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', { detail: { type, message } }));
}

function triggerDownload(filename, textContent, mimeType = 'text/plain') {
  const blob = new Blob([textContent], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── State ──────────────────────────────────────────────────────────────────

let activeSession = null;
let activeDevice = null;
let liveStreamer = null;
let liveGauges = null;
let scanning = false;
let lastScanMeta = null;

// ─── Shared Connection Manager ──────────────────────────────────────────────

/**
 * Show device selection modal and establish an ELM327 session.
 * @returns {Promise<{ session: ELM327Session, device: { name: string, address: string } } | null>}
 */
async function ensureSession() {
  if (activeSession && btSpp.isConnected()) {
    return { session: activeSession, device: activeDevice };
  }

  // 1. Request Bluetooth permissions
  const granted = await btSpp.requestPermissions();
  if (!granted) {
    feedback('error', translate(
      'Impossible d\'accéder au Bluetooth. Autorisez l\'accès dans les paramètres Android.',
      'Cannot access Bluetooth. Allow access in Android settings.',
    ));
    return null;
  }

  // 2. Discover devices
  const paired = await btSpp.listPairedDevices();
  const discovered = await btSpp.discoverDevices({ durationMs: 6000 });
  const seen = new Set();
  const allDevices = [];
  for (const d of [...paired, ...discovered]) {
    if (!seen.has(d.address)) { seen.add(d.address); allDevices.push(d); }
  }

  if (!allDevices.length) {
    feedback('error', translate(
      'Aucun boîtier OBD2 détecté. Vérifiez qu\'il est allumé et appairé.',
      'No OBD2 adapter detected. Make sure it is powered on and paired.',
    ));
    return null;
  }

  // 3. User selects device
  const device = await showDeviceSelector(allDevices);
  if (!device) return null;

  // 4. Connect via Bluetooth Classic SPP
  try {
    await btSpp.connect(device.address);
  } catch (err) {
    feedback('error', translate(
      `Impossible de se connecter à ${device.name}. Vérifiez que le contact du véhicule est mis.`,
      `Cannot connect to ${device.name}. Make sure vehicle ignition is on.`,
    ));
    return null;
  }

  // 5. Initialise ELM327 session
  try {
    const session = await createSession(btSpp.createTransport());
    activeSession = session;
    activeDevice = device;
    return { session, device };
  } catch (err) {
    feedback('error', translate(
      'L\'adaptateur ne répond pas au protocole ELM327.',
      'Adapter does not respond to ELM327 protocol.',
    ));
    await btSpp.disconnect();
    activeSession = null;
    activeDevice = null;
    return null;
  }
}

async function closeActiveSession() {
  if (liveStreamer && liveStreamer.running) {
    await liveStreamer.stop();
  }
  if (activeSession) {
    try { await activeSession.close(); } catch { /* swallow */ }
    activeSession = null;
  }
  await btSpp.disconnect();
  activeDevice = null;
}

// ─── Device selector modal ──────────────────────────────────────────────────

function showDeviceSelector(devices) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'obd2-device-overlay';
    overlay.innerHTML = `
      <div class="obd2-device-modal">
        <p class="panel-kicker">${translate('SÉLECTION DU BOÎTIER OBD2', 'SELECT OBD2 ADAPTER')}</p>
        <h3>${translate('Appareils Bluetooth détectés', 'Detected Bluetooth devices')}</h3>
        <ul class="obd2-device-list" role="listbox">
          ${devices.map((d, i) => `
            <li role="option" tabindex="0" data-index="${i}" class="obd2-device-item">
              <span class="obd2-device-name">${escapeHtml(d.name)}</span>
              <span class="obd2-device-address">${escapeHtml(d.address)}</span>
            </li>
          `).join('')}
        </ul>
        <p class="obd2-device-hint">${translate(
          'Choisissez votre adaptateur ELM327 (noms courants : OBDII, V-LINK, ELM327…).',
          'Select your ELM327 adapter (common names: OBDII, V-LINK, ELM327…).',
        )}</p>
        <button type="button" class="obd2-device-cancel">${translate('Annuler', 'Cancel')}</button>
      </div>
    `;
    document.body.append(overlay);

    function pick(index) {
      overlay.remove();
      resolve(devices[index] ?? null);
    }

    overlay.querySelectorAll('[data-index]').forEach((el) => {
      el.addEventListener('click', () => pick(Number(el.dataset.index)));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(Number(el.dataset.index)); });
    });
    overlay.querySelector('.obd2-device-cancel')?.addEventListener('click', () => { overlay.remove(); resolve(null); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(null); } });
  });
}

// ─── Section 7: DTC Scan Flow ───────────────────────────────────────────────

function injectScanButton() {
  const container = document.getElementById('obd2ScanControls');
  if (!container) return;

  container.hidden = false;
  container.innerHTML = `
    <button type="button" id="obd2ScanBtn" class="obd2-scan-btn" aria-label="${translate('Scanner via Bluetooth', 'Scan via Bluetooth')}">
      <span class="obd2-scan-icon">🔌</span>
      <span class="obd2-scan-label">${translate('Scanner via Bluetooth', 'Scan via Bluetooth')}</span>
    </button>
    <div id="obd2ScanStatus" class="obd2-scan-status" hidden></div>
  `;

  document.getElementById('obd2ScanBtn')?.addEventListener('click', startScanFlow);
}

function updateScanStatus(message, state = 'loading') {
  const el = document.getElementById('obd2ScanStatus');
  if (!el) return;
  el.hidden = !message;
  el.textContent = message;
  el.dataset.state = state;
}

function updateScanTrace(deviceName, timestamp) {
  const el = document.getElementById('obd2ScanTrace');
  if (!el) return;
  const date = timestamp.toLocaleString(language() === 'en' ? 'en-GB' : 'fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  el.hidden = false;
  el.innerHTML = `<span class="obd2-trace-icon">✅</span> ${translate(
    `Codes lus automatiquement le ${date} via <strong>${escapeHtml(deviceName)}</strong>`,
    `Codes read automatically on ${date} via <strong>${escapeHtml(deviceName)}</strong>`,
  )}`;

  let hidden = document.querySelector('input[name="obd2_scan_source"]');
  if (!hidden) {
    hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = 'obd2_scan_source';
    const form = document.getElementById('ficheForm') || document.querySelector('form') || document.body;
    form.append(hidden);
  }
  hidden.value = JSON.stringify({ device: deviceName, timestamp: timestamp.toISOString() });
  hidden.dispatchEvent(new Event('change', { bubbles: true }));

  lastScanMeta = { device: deviceName, timestamp };
}

function classifyDTC(code) {
  const upper = String(code).toUpperCase();
  if (upper.startsWith('C')) return 'codes_abs';
  if (/^P07/.test(upper)) return 'codes_boite';
  return 'codes_ecm';
}

function injectCodes(codes) {
  if (!codes.length) return;

  const grouped = { codes_ecm: [], codes_abs: [], codes_boite: [] };
  for (const code of codes) {
    grouped[classifyDTC(code)].push(code);
  }

  for (const [fieldName, fieldCodes] of Object.entries(grouped)) {
    if (!fieldCodes.length) continue;
    const field = document.querySelector(`[name="${fieldName}"]`);
    if (!field) continue;

    const existing = String(field.value || '').trim();
    const codeStr = fieldCodes.join(', ');

    if (existing) {
      const confirmMsg = translate(
        `Le champ contient déjà : « ${existing} ».\nAjouter les codes lus : ${codeStr} ?`,
        `The field already contains: "${existing}".\nAdd scanned codes: ${codeStr}?`,
      );
      if (confirm(confirmMsg)) {
        field.value = `${existing}, ${codeStr}`;
      }
    } else {
      field.value = codeStr;
    }
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (codes.some((c) => c.toUpperCase() === 'P1000')) {
    const p1000Radio = document.getElementById('p1000_def');
    if (p1000Radio && !p1000Radio.checked) {
      p1000Radio.checked = true;
      p1000Radio.dispatchEvent(new Event('change', { bubbles: true }));
      feedback('info', translate(
        'Code P1000 détecté automatiquement — mémoire défauts récemment effacée.',
        'P1000 code detected automatically — fault memory recently cleared.',
      ));
    }
  }
}

async function startScanFlow() {
  if (scanning) return;
  scanning = true;

  const btn = document.getElementById('obd2ScanBtn');
  if (btn) btn.disabled = true;

  try {
    updateScanStatus(translate('Connexion à l\'adaptateur…', 'Connecting to adapter…'), 'loading');
    const conn = await ensureSession();
    if (!conn) {
      updateScanStatus(translate('Connexion annulée.', 'Connection cancelled.'), 'error');
      return;
    }

    updateScanStatus(translate('Lecture des codes défauts (Modes 03 & 07)…', 'Reading fault codes (Modes 03 & 07)…'), 'loading');
    const result = await conn.session.readAllDTCs();

    if (result.all.length === 0) {
      updateScanStatus(translate('Aucun code défaut actif.', 'No active fault codes.'), 'success');
      feedback('success', translate(
        'Scan terminé — aucun code défaut détecté.',
        'Scan complete — no fault codes detected.',
      ));
    } else {
      const summary = result.all.map((code) => {
        const info = lookupDTC(code);
        const desc = info ? (language() === 'en' ? info.en : info.fr) : '';
        return desc ? `${code} (${desc})` : code;
      }).join(', ');

      updateScanStatus(translate(
        `${result.all.length} code(s) lu(s) : ${result.all.join(', ')}`,
        `${result.all.length} code(s) read: ${result.all.join(', ')}`,
      ), 'success');
      feedback('success', translate(
        `Scan terminé — ${result.all.length} code(s) : ${summary}`,
        `Scan complete — ${result.all.length} code(s): ${summary}`,
      ));

      injectCodes(result.all);
    }

    // Read VIN (Mode 0902)
    try {
      const vin = await conn.session.readVIN();
      if (vin) {
        const vinInput = document.querySelector('input[name="vin"]');
        if (vinInput) {
          const currentVin = String(vinInput.value || '').trim().toUpperCase();
          if (!currentVin) {
            vinInput.value = vin;
            vinInput.dispatchEvent(new Event('input', { bubbles: true }));
            vinInput.dispatchEvent(new Event('change', { bubbles: true }));
            feedback('info', translate(`VIN lu via OBD2 (${vin}) renseigné automatiquement.`, `VIN read via OBD2 (${vin}) pre-filled automatically.`));
          } else if (currentVin !== vin) {
            feedback('error', translate(
              `⚠️ Discordance VIN : VIN calculatrice = ${vin} vs VIN saisi = ${currentVin}`,
              `⚠️ VIN Mismatch: ECU VIN = ${vin} vs Entered VIN = ${currentVin}`,
            ));
          }
        }
      }
    } catch { /* ignore optional VIN error */ }

    // Read I/M Readiness Monitors (Mode 0101)
    try {
      const im = await conn.session.readIMMonitors();
      if (im) {
        renderIMMonitorsCard(im);
      }
    } catch { /* ignore optional I/M error */ }

    updateScanTrace(conn.device.name, new Date());
  } catch (error) {
    console.error('[OBD2] Scan error:', error);
    updateScanStatus(translate('Erreur lors du scan.', 'Scan error.'), 'error');
    feedback('error', translate(`Erreur scan : ${error?.message || error}`, `Scan error: ${error?.message || error}`));
  } finally {
    scanning = false;
    if (btn) btn.disabled = false;
  }
}

function renderIMMonitorsCard(im) {
  let card = document.getElementById('obd2ImMonitorsStatus');
  if (!card) {
    const controls = document.getElementById('obd2ScanControls');
    if (!controls) return;
    card = document.createElement('div');
    card.id = 'obd2ImMonitorsStatus';
    card.className = 'obd2-im-monitors-card';
    controls.insertAdjacentElement('afterend', card);
  }

  const lang = language();
  const monitorLabels = {
    misfire: lang === 'en' ? 'Misfire' : 'Ratés d\'allumage',
    fuelSystem: lang === 'en' ? 'Fuel System' : 'Système carburant',
    components: lang === 'en' ? 'Components' : 'Composants globaux',
    catalyst: lang === 'en' ? 'Catalyst' : 'Catalyseur',
    heatedCatalyst: lang === 'en' ? 'Heated Catalyst' : 'Catalyseur chauffé',
    evap: lang === 'en' ? 'EVAP System' : 'Purge EVAP',
    o2Sensor: lang === 'en' ? 'O2 Sensor' : 'Sondes Lambda',
    egr: lang === 'en' ? 'EGR / VVT' : 'EGR / VVT',
  };

  card.hidden = false;
  card.innerHTML = `
    <div class="im-monitors-header">
      <span class="im-badge">I/M READINESS</span>
      <strong>${translate('Moniteurs d’Autotest Antipollution', 'Emissions Readiness Monitors')}</strong>
      <span class="im-mil-status ${im.milOn ? 'is-mil-on' : 'is-mil-off'}">
        ${im.milOn ? '🔴 MIL ALLUMÉ' : '🟢 MIL ÉTEINT'}
      </span>
    </div>
    <div class="im-monitors-grid">
      ${Object.entries(im.monitors).map(([key, status]) => `
        <div class="im-item ${status === 'ready' ? 'is-ready' : 'is-not-ready'}">
          <span class="im-item-name">${escapeHtml(monitorLabels[key] || key)}</span>
          <span class="im-item-state">${status === 'ready' ? '✅ Prêt' : '⚠️ Non terminé'}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ─── Section 6: Live Streaming Flow ─────────────────────────────────────────

function initializeLiveGauges() {
  const container = document.getElementById('obd2LiveGaugesContainer');
  if (!container) return;

  container.hidden = false;

  liveGauges = new LiveGaugesUI({
    container,
    onToggleStart: async () => {
      if (liveStreamer && liveStreamer.running) {
        await liveStreamer.stop();
        liveGauges.setStreamingState(false, liveStreamer.supportedPids);
        feedback('info', translate('Suivi en direct arrêté.', 'Live monitoring stopped.'));
        return;
      }

      feedback('info', translate('Connexion et recherche des capteurs supportés…', 'Connecting and discovering supported sensors…'));
      const conn = await ensureSession();
      if (!conn) return;

      liveStreamer = new LiveStreamer({
        session: conn.session,
        onSample: (values, sample) => {
          liveGauges.updateValues(values, liveStreamer.history.length, sample.timestamp);
        },
        onError: (err) => {
          feedback('error', translate(`Erreur flux direct : ${err.message}`, `Live stream error: ${err.message}`));
          liveGauges.setStreamingState(false);
          closeActiveSession();
        },
        onStatusChange: (isRunning, pids) => {
          liveGauges.setStreamingState(isRunning, pids);
        },
      });

      try {
        await liveStreamer.start();
        feedback('success', translate('Suivi en direct démarré.', 'Live monitoring started.'));
      } catch (err) {
        feedback('error', translate(`Impossible de démarrer le flux : ${err.message}`, `Failed to start stream: ${err.message}`));
      }
    },
    onExportCSV: () => {
      if (!liveStreamer || !liveStreamer.history.length) {
        feedback('info', translate('Aucune donnée enregistrée pour cette session.', 'No data recorded for this session.'));
        return;
      }
      const csv = liveStreamer.exportToCSV();
      const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      triggerDownload(`cardiag-obd2-live-${dateStr}.csv`, csv, 'text/csv;charset=utf-8;');
      feedback('success', translate('Export CSV téléchargé.', 'CSV export downloaded.'));
    },
    onExportJSON: () => {
      if (!liveStreamer || !liveStreamer.history.length) {
        feedback('info', translate('Aucune donnée enregistrée pour cette session.', 'No data recorded for this session.'));
        return;
      }
      const json = liveStreamer.exportToJSON();
      const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      triggerDownload(`cardiag-obd2-live-${dateStr}.json`, json, 'application/json;charset=utf-8;');
      feedback('success', translate('Export JSON téléchargé.', 'JSON export downloaded.'));
    },
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Initialise the OBD2 controller.
 *
 * - Detects platform
 * - Injects scan button on Android if BT plugin available
 * - Initialises live gauges component in Section 6 if on Android with BT
 * - Initialises manual DTC assisted input on all platforms
 */
export function initializeObd2Controller() {
  // Always initialise the assisted input (all platforms).
  initializeDtcAssist();

  // Android + BT plugin features:
  if (btSpp.isAvailable()) {
    injectScanButton();
    initializeLiveGauges();
  }

  // Re-render on language change.
  window.addEventListener('cardiag:language-change', () => {
    if (btSpp.isAvailable()) {
      injectScanButton();
      initializeLiveGauges();
    }
    if (lastScanMeta) updateScanTrace(lastScanMeta.device, lastScanMeta.timestamp);
  });

  // Handle new vehicle reset
  window.addEventListener('cardiag:new-vehicle', () => {
    lastScanMeta = null;
    const trace = document.getElementById('obd2ScanTrace');
    if (trace) trace.hidden = true;
    const hidden = document.querySelector('input[name="obd2_scan_source"]');
    if (hidden) hidden.value = '';
    if (liveStreamer && liveStreamer.running) {
      liveStreamer.stop();
      if (liveGauges) liveGauges.setStreamingState(false);
    }
  });

  // Restore scan trace banner when opening a saved report
  window.addEventListener('cardiag:record-open', () => {
    const hidden = document.querySelector('input[name="obd2_scan_source"]');
    if (hidden && hidden.value) {
      try {
        const meta = JSON.parse(hidden.value);
        if (meta?.device && meta?.timestamp) {
          updateScanTrace(meta.device, new Date(meta.timestamp));
        }
      } catch { /* ignore */ }
    }
  });
}

