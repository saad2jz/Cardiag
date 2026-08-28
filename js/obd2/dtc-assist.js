/**
 * DTC Assisted Input — contextual help for manual code entry.
 *
 * Attaches to the codes_ecm, codes_abs, codes_boite fields and provides:
 *  - Live DTC lookup as the user types (offline, from dtc-database.js)
 *  - A link to the expert assistant for unrecognised codes (online)
 *
 * Works on all platforms (Android, iOS, web).
 */

import { lookupDTC, searchDTCs } from './dtc-database.js';

/** Regex to detect DTC patterns in user input. */
const DTC_PATTERN = /[PCBU]\d{4}/gi;

/** Tracked field names. */
const FIELD_NAMES = ['codes_ecm', 'codes_abs', 'codes_boite'];

/** Active dropdown reference per field name. */
const dropdowns = {};

function language() {
  return window.cardiagI18n?.language === 'en' ? 'en' : 'fr';
}

function escapeHtml(text) {
  return String(text || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Create or reuse the assist dropdown for a given field.
 * @param {HTMLElement} field
 * @param {string} name
 * @returns {HTMLElement}
 */
function getOrCreateDropdown(field, name) {
  if (dropdowns[name]) return dropdowns[name];

  const dd = document.createElement('div');
  dd.className = 'dtc-assist-dropdown';
  dd.setAttribute('role', 'listbox');
  dd.setAttribute('aria-label', 'Codes DTC');
  dd.hidden = true;

  // Position relative to the field's parent .field container.
  const wrapper = field.closest('.field') || field.parentElement;
  if (wrapper) {
    wrapper.style.position = 'relative';
    wrapper.append(dd);
  } else {
    field.insertAdjacentElement('afterend', dd);
  }

  dropdowns[name] = dd;
  return dd;
}

/**
 * Render results into the dropdown.
 * @param {HTMLElement} dropdown
 * @param {Array} results - from lookupDTC / searchDTCs
 * @param {string} rawCode - user-typed code for the assistant link
 */
function renderResults(dropdown, results, rawCode) {
  const lang = language();
  const isOnline = window.cardiagConnectivity?.online !== false;

  if (!results.length && !rawCode) {
    dropdown.hidden = true;
    return;
  }

  let html = '';

  if (results.length) {
    html += results.map((r) => `
      <div class="dtc-assist-item" role="option" tabindex="0" data-dtc-insert="${escapeHtml(r.code)}">
        <span class="dtc-assist-code">${escapeHtml(r.code)}</span>
        <span class="dtc-assist-desc">${escapeHtml(lang === 'en' ? r.en : r.fr)}</span>
      </div>
    `).join('');
  }

  // If the user typed a code that isn't in our local DB, offer the assistant.
  if (rawCode && !results.some((r) => r.code === rawCode.toUpperCase())) {
    const label = lang === 'en'
      ? `Code ${escapeHtml(rawCode.toUpperCase())} not in the local database.`
      : `Code ${escapeHtml(rawCode.toUpperCase())} absent de la base locale.`;
    const linkLabel = lang === 'en' ? '🤖 Ask the expert assistant' : '🤖 Demander à l\'assistant expert';

    html += `<div class="dtc-assist-item dtc-assist-unknown">
      <span class="dtc-assist-desc">${label}</span>`;

    if (isOnline) {
      html += `<a href="#" class="dtc-assist-link" data-dtc-ask="${escapeHtml(rawCode.toUpperCase())}">${linkLabel}</a>`;
    } else {
      const offlineLabel = lang === 'en' ? '(offline — interpretation unavailable)' : '(hors-ligne — interprétation indisponible)';
      html += `<span class="dtc-assist-offline">${offlineLabel}</span>`;
    }

    html += '</div>';
  }

  if (!html) {
    dropdown.hidden = true;
    return;
  }

  dropdown.innerHTML = html;
  dropdown.hidden = false;

  // Wire suggestion clicks to insert the code into the field
  dropdown.querySelectorAll('[data-dtc-insert]').forEach((item) => {
    const insertCode = item.dataset.dtcInsert;
    const handleInsert = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const field = dropdown.closest('.field')?.querySelector('input') || dropdown.previousElementSibling;
      if (field) {
        const tokens = (field.value || '').split(/[\s,;]+/).filter(Boolean);
        const lastToken = tokens[tokens.length - 1];
        if (lastToken && !DTC_PATTERN.test(lastToken)) {
          tokens[tokens.length - 1] = insertCode;
        } else if (!tokens.includes(insertCode)) {
          tokens.push(insertCode);
        }
        field.value = tokens.join(', ');
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        field.focus();
      }
      dropdown.hidden = true;
    };
    item.addEventListener('mousedown', handleInsert);
    item.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleInsert(e); });
  });

  // Wire the assistant link.
  dropdown.querySelectorAll('[data-dtc-ask]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const code = link.dataset.dtcAsk;
      window.dispatchEvent(new CustomEvent('cardiag:inline-help', {
        detail: { text: code, target: link },
      }));
      dropdown.hidden = true;
    });
  });
}

/**
 * Handle input on a tracked field.
 * @param {Event} event
 */
function onFieldInput(event) {
  const field = event.target;
  const name = field.name || field.id;
  const dropdown = getOrCreateDropdown(field, name);
  const value = String(field.value || '');

  // Extract all DTC-like tokens from the input.
  const matches = value.match(DTC_PATTERN) || [];

  if (!matches.length) {
    // If partial typing looks like the start of a code, try a search.
    const partial = value.split(/[\s,;]+/).pop()?.trim();
    if (partial && partial.length >= 2 && /^[PCBU]/i.test(partial)) {
      const results = searchDTCs(partial, { language: language(), limit: 5 });
      renderResults(dropdown, results, null);
    } else {
      dropdown.hidden = true;
    }
    return;
  }

  // Show info for the last typed code.
  const lastCode = matches[matches.length - 1].toUpperCase();
  const found = lookupDTC(lastCode);
  const results = found ? [found] : [];
  renderResults(dropdown, results, lastCode);
}

/**
 * Hide dropdown when the field loses focus (with a small delay so clicks on
 * the dropdown itself register).
 * @param {Event} event
 */
function onFieldBlur(event) {
  const name = event.target.name || event.target.id;
  const dd = dropdowns[name];
  if (dd) setTimeout(() => { dd.hidden = true; }, 200);
}

/**
 * Initialise the DTC assisted input on the diagnostic fields.
 */
export function initializeDtcAssist() {
  for (const name of FIELD_NAMES) {
    const field = document.querySelector(`[name="${name}"]`);
    if (!field) continue;
    field.addEventListener('input', onFieldInput);
    field.addEventListener('focus', onFieldInput);
    field.addEventListener('blur', onFieldBlur);
  }
}
