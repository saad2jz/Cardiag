/**
 * OBD2 Live Data Streamer & Session Historian.
 *
 * Runs a sequential half-duplex polling loop over supported Mode 01 PIDs.
 * Targets ~2-5 Hz update rate on Bluetooth Classic SPP ELM327 adapters.
 *
 * Features:
 *  - Automatic discovery of supported PIDs via 0100 / 0120 / 0140 bitmasks
 *  - Timeout control (300-500ms) with non-blocking error recovery
 *  - In-memory time-series session recording
 *  - Export to CSV / JSON
 *  - Non-intrusive plausibility anomaly detection appending timestamped notes to `notes_essai`
 */

import { PID_DEFINITIONS, parsePidResponse } from './pid-table.js';

export class LiveStreamer {
  /**
   * @param {Object} options
   * @param {ELM327Session} options.session
   * @param {Function} [options.onSample] - callback(latestValues, sampleObj)
   * @param {Function} [options.onError] - callback(error)
   * @param {Function} [options.onStatusChange] - callback(isRunning, supportedPids)
   */
  constructor({ session, onSample, onError, onStatusChange } = {}) {
    this.session = session;
    this.onSample = onSample || (() => {});
    this.onError = onError || (() => {});
    this.onStatusChange = onStatusChange || (() => {});

    this.running = false;
    this.supportedPids = [];
    this.history = []; // Array of { timestamp: number, dateIso: string, values: { [pid]: number } }
    this.anomalyHistory = new Set(); // Set of anomaly signatures to prevent spamming notes_essai
    this.loopPromise = null;
    this.sessionStartTime = null;
  }

  /**
   * Start the live streaming loop.
   */
  async start() {
    if (this.running) return;
    this.running = true;
    this.sessionStartTime = Date.now();
    this.history = [];
    this.anomalyHistory.clear();

    try {
      // 1. Discover supported PIDs
      const candidatePids = Object.keys(PID_DEFINITIONS);
      this.supportedPids = await this.session.discoverSupportedPids(candidatePids);

      // Prioritize high-frequency engine vitals first if supported
      const priorityOrder = ['010C', '010D', '0105', '0104', '0111', '010B', '0110', '010E', '0106', '0107', '010F', '012F', '0133'];
      this.supportedPids.sort((a, b) => {
        const idxA = priorityOrder.indexOf(a);
        const idxB = priorityOrder.indexOf(b);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
      });

      this.onStatusChange(true, this.supportedPids);

      // 2. Launch polling loop
      this.loopPromise = this._runPollingLoop();
    } catch (err) {
      this.running = false;
      this.onStatusChange(false, []);
      this.onError(err);
    }
  }

  /**
   * Stop the live streaming loop.
   */
  async stop() {
    if (!this.running) return;
    this.running = false;
    this.onStatusChange(false, this.supportedPids);
    if (this.loopPromise) {
      try { await this.loopPromise; } catch { /* ignore */ }
      this.loopPromise = null;
    }
  }

  /**
   * Internal sequential polling loop.
   */
  async _runPollingLoop() {
    const PIDs = this.supportedPids;
    if (!PIDs.length) {
      throw new Error('Aucun PID standard OBD2 supporté détecté.');
    }

    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 15;

    while (this.running) {
      const cycleStart = Date.now();
      const cycleValues = {};

      for (const pid of PIDs) {
        if (!this.running) break;

        try {
          // Send PID request with 450ms timeout
          const raw = await this.session.queryPID(pid, 450);
          if (raw && !raw.includes('NO DATA') && !raw.includes('UNABLE')) {
            const val = parsePidResponse(raw, pid);
            if (val !== null) {
              cycleValues[pid] = val;
              consecutiveErrors = 0;
              this._checkPlausibility(pid, val);
            }
          }
        } catch (err) {
          consecutiveErrors++;
          // Non-blocking timeout for single PID failure
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            this.running = false;
            this.onStatusChange(false, this.supportedPids);
            this.onError(new Error('Perte de communication avec le boîtier OBD2 pendant l\'essai.'));
            return;
          }
        }
      }

      if (Object.keys(cycleValues).length > 0) {
        const sample = {
          timestamp: Date.now() - this.sessionStartTime,
          dateIso: new Date().toISOString(),
          values: cycleValues,
        };
        this.history.push(sample);
        this.onSample(cycleValues, sample);
      }

      // Maintain reasonable cycle frequency without hammering bus (~200ms rest between bursts if cycle was very fast)
      const elapsed = Date.now() - cycleStart;
      const targetCycleMs = Math.max(200, PIDs.length * 70);
      if (elapsed < targetCycleMs && this.running) {
        await new Promise((r) => setTimeout(r, targetCycleMs - elapsed));
      }
    }
  }

  /**
   * Check plausibility thresholds and add a non-intrusive dated note in notes_essai.
   */
  _checkPlausibility(pid, value) {
    const def = PID_DEFINITIONS[pid];
    if (!def || !def.plausibility) return;

    const { warnMin, warnMax, alertMessageFr, alertMessageEn } = def.plausibility;
    const isOutOfRange = (warnMin !== null && value < warnMin) || (warnMax !== null && value > warnMax);
    if (!isOutOfRange) return;

    const signature = `${pid}-${Math.round(value / 5) * 5}`;
    if (this.anomalyHistory.has(signature)) return;
    this.anomalyHistory.add(signature);

    const lang = (typeof window !== 'undefined' && window.cardiagI18n?.language === 'en') ? 'en' : 'fr';
    const msg = lang === 'en' ? alertMessageEn(value) : alertMessageFr(value);
    const now = new Date().toLocaleTimeString(lang === 'en' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const noteEntry = `[OBD2 Live ${now}] ⚠️ ${msg}`;

    // Append to notes_essai textarea without blocking the user
    if (typeof document !== 'undefined') {
      const textarea = document.querySelector('textarea[name="notes_essai"]');
      if (textarea) {
        const current = textarea.value ? textarea.value.trim() : '';
        if (!current.includes(msg)) {
          textarea.value = current ? `${current}\n${noteEntry}` : noteEntry;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', {
              detail: {
                type: 'info',
                message: `Alerte essai routier enregistrée : ${msg}`,
              },
            }));
          }
        }
      }
    }
  }

  /**
   * Export session history to CSV string.
   * @returns {string}
   */
  exportToCSV() {
    if (!this.history.length) return '';

    const pids = this.supportedPids;
    const lang = (typeof window !== 'undefined' && window.cardiagI18n?.language === 'en') ? 'en' : 'fr';

    const headers = [
      'Timestamp_ms',
      'Time_ISO',
      ...pids.map((p) => {
        const def = PID_DEFINITIONS[p];
        const name = lang === 'en' ? (def?.nameEn || p) : (def?.nameFr || p);
        const unit = lang === 'en' ? (def?.unitEn || '') : (def?.unit || '');
        return `"${name} (${unit})"`;
      }),
    ];

    const rows = this.history.map((sample) => {
      return [
        sample.timestamp,
        sample.dateIso,
        ...pids.map((p) => (sample.values[p] !== undefined ? sample.values[p] : '')),
      ].join(';');
    });

    return [headers.join(';'), ...rows].join('\n');
  }

  /**
   * Export session history to JSON string.
   * @returns {string}
   */
  exportToJSON() {
    return JSON.stringify({
      sessionStart: this.sessionStartTime ? new Date(this.sessionStartTime).toISOString() : null,
      sampleCount: this.history.length,
      supportedPids: this.supportedPids.map((p) => ({
        pid: p,
        name: PID_DEFINITIONS[p]?.nameFr || p,
        unit: PID_DEFINITIONS[p]?.unit || '',
      })),
      samples: this.history,
    }, null, 2);
  }
}
