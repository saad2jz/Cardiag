/**
 * OBD2 Live Gauges UI Component.
 *
 * Injected in Section 6 « Essai Routier Dynamique ».
 * Renders real-time gauges and metric cards using lightweight custom Canvas & SVG.
 * Zero external library dependencies (pure vanilla JS).
 */

import { PID_DEFINITIONS } from './pid-table.js';

function language() {
  return window.cardiagI18n?.language === 'en' ? 'en' : 'fr';
}

function translate(fr, en) {
  return language() === 'en' ? en : fr;
}

function escapeHtml(text) {
  return String(text || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export class LiveGaugesUI {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container - Container element in Section 6
   * @param {Function} options.onToggleStart - callback triggered when start/stop button is clicked
   * @param {Function} options.onExportCSV - callback for CSV export
   * @param {Function} options.onExportJSON - callback for JSON export
   */
  constructor({ container, onToggleStart, onExportCSV, onExportJSON }) {
    this.container = container;
    this.onToggleStart = onToggleStart;
    this.onExportCSV = onExportCSV;
    this.onExportJSON = onExportJSON;

    this.isRunning = false;
    this.supportedPids = [];
    this.latestValues = {};
    this.canvasMap = new Map();
    this.historySlices = new Map(); // pid -> array of last 30 values for sparklines

    this.renderShell();
  }

  renderShell() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="live-gauges-panel">
        <div class="live-gauges-header">
          <div class="live-gauges-title-block">
            <span class="live-gauges-badge">OBD2 LIVE</span>
            <h4>${translate('Paramètres moteur en direct (Essai routier)', 'Live engine parameters (Road test)')}</h4>
          </div>
          <div class="live-gauges-actions">
            <button type="button" class="live-gauges-btn-toggle" id="btnToggleLiveStream">
              <span class="live-btn-icon">📊</span>
              <span class="live-btn-text">${translate('Démarrer le suivi en direct', 'Start live monitoring')}</span>
            </button>
          </div>
        </div>

        <div class="live-gauges-status-bar" id="liveGaugesStatusBar" hidden>
          <div class="live-status-indicator">
            <span class="live-pulse-dot"></span>
            <span id="liveStatusText">${translate('En attente…', 'Waiting…')}</span>
          </div>
          <div class="live-session-stats">
            <span id="liveSampleCount">0 ${translate('points', 'samples')}</span>
            <span class="live-stat-sep">·</span>
            <span id="liveElapsedTime">00:00</span>
          </div>
          <div class="live-export-actions">
            <button type="button" class="live-export-btn" id="btnExportLiveCSV" title="${translate('Exporter les données en CSV', 'Export data to CSV')}">CSV</button>
            <button type="button" class="live-export-btn" id="btnExportLiveJSON" title="${translate('Exporter les données en JSON', 'Export data to JSON')}">JSON</button>
          </div>
        </div>

        <div class="live-gauges-grid" id="liveGaugesGrid">
          <div class="live-gauges-empty-state">
            <p>${translate(
              'Connectez votre boîtier OBD2 Bluetooth et cliquez sur « Démarrer le suivi » pour visualiser les paramètres réels du véhicule pendant l’essai.',
              'Connect your Bluetooth OBD2 adapter and click "Start live monitoring" to view real-time vehicle parameters during the road test.',
            )}</p>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    this.container.querySelector('#btnToggleLiveStream')?.addEventListener('click', () => {
      if (this.onToggleStart) this.onToggleStart();
    });

    this.container.querySelector('#btnExportLiveCSV')?.addEventListener('click', () => {
      if (this.onExportCSV) this.onExportCSV();
    });

    this.container.querySelector('#btnExportLiveJSON')?.addEventListener('click', () => {
      if (this.onExportJSON) this.onExportJSON();
    });
  }

  /**
   * Update status bar and toggle button state.
   */
  setStreamingState(isRunning, supportedPids = []) {
    this.isRunning = isRunning;
    this.supportedPids = supportedPids;

    const btn = this.container.querySelector('#btnToggleLiveStream');
    const statusBar = this.container.querySelector('#liveGaugesStatusBar');
    const statusText = this.container.querySelector('#liveStatusText');

    if (btn) {
      btn.classList.toggle('is-recording', isRunning);
      btn.querySelector('.live-btn-icon').textContent = isRunning ? '⏹' : '📊';
      btn.querySelector('.live-btn-text').textContent = isRunning
        ? translate('Arrêter le suivi', 'Stop monitoring')
        : translate('Démarrer le suivi en direct', 'Start live monitoring');
    }

    if (statusBar) {
      statusBar.hidden = !isRunning && this.canvasMap.size === 0;
    }

    if (statusText) {
      statusText.textContent = isRunning
        ? translate(`Flux actif (${supportedPids.length} capteurs)`, `Active stream (${supportedPids.length} sensors)`)
        : translate('Suivi arrêté', 'Monitoring stopped');
    }

    if (isRunning && supportedPids.length) {
      this.buildGaugesGrid(supportedPids);
    }
  }

  /**
   * Build the responsive cards for the detected supported PIDs.
   */
  buildGaugesGrid(pids) {
    const grid = this.container.querySelector('#liveGaugesGrid');
    if (!grid) return;

    this.canvasMap.clear();
    this.historySlices.clear();
    const lang = language();

    grid.innerHTML = pids.map((pid) => {
      const def = PID_DEFINITIONS[pid];
      if (!def) return '';

      const name = lang === 'en' ? def.nameEn : def.nameFr;
      const unit = lang === 'en' ? def.unitEn : def.unit;
      const isPrimary = ['010C', '010D', '0105', '0104'].includes(pid);

      return `
        <div class="gauge-card ${isPrimary ? 'gauge-card-primary' : ''}" data-pid="${pid}">
          <div class="gauge-card-header">
            <span class="gauge-name">${escapeHtml(name)}</span>
            <span class="gauge-unit">${escapeHtml(unit)}</span>
          </div>
          <div class="gauge-value-row">
            <span class="gauge-numeric" id="val_${pid}">--</span>
            <span class="gauge-unit-inline">${escapeHtml(unit)}</span>
          </div>
          <div class="gauge-visual-wrap">
            <canvas class="gauge-sparkline-canvas" id="canvas_${pid}" width="160" height="40"></canvas>
          </div>
        </div>
      `;
    }).join('');

    // Cache canvas references
    pids.forEach((pid) => {
      const canvas = grid.querySelector(`#canvas_${pid}`);
      if (canvas) {
        this.canvasMap.set(pid, canvas);
        this.historySlices.set(pid, []);
      }
    });
  }

  /**
   * Receive new sample from streamer and update live UI.
   */
  updateValues(values, sampleCount = 0, elapsedMs = 0) {
    this.latestValues = values;

    // Update session timers
    const countEl = this.container.querySelector('#liveSampleCount');
    if (countEl) {
      countEl.textContent = `${sampleCount} ${translate('points', 'samples')}`;
    }

    const timeEl = this.container.querySelector('#liveElapsedTime');
    if (timeEl) {
      const totalSec = Math.floor(elapsedMs / 1000);
      const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const s = String(totalSec % 60).padStart(2, '0');
      timeEl.textContent = `${m}:${s}`;
    }

    // Update gauge values and sparklines
    for (const [pid, val] of Object.entries(values)) {
      const valEl = this.container.querySelector(`#val_${pid}`);
      if (valEl) {
        valEl.textContent = String(val);
      }

      // Update history buffer for sparkline
      const history = this.historySlices.get(pid);
      if (history) {
        history.push(val);
        if (history.length > 30) history.shift();
        this.drawSparkline(pid, history);
      }
    }
  }

  /**
   * Draw a lightweight sparkline graph on the canvas.
   */
  drawSparkline(pid, history) {
    const canvas = this.canvasMap.get(pid);
    if (!canvas || history.length < 2) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const def = PID_DEFINITIONS[pid];
    const minVal = def?.min ?? Math.min(...history);
    const maxVal = def?.max ?? Math.max(...history);
    const range = (maxVal - minVal) || 1;

    // Gradient styling
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    grad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    ctx.beginPath();
    history.forEach((val, i) => {
      const x = (i / (history.length - 1)) * width;
      const normalized = Math.max(0, Math.min(1, (val - minVal) / range));
      const y = height - (normalized * (height - 6)) - 3;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill area under line
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }
}
