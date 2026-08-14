const STORAGE_KEY = 'cardiag_design_preferences';
const THEMES = new Set(['carbon', 'workshop', 'premium']);
const DEFAULTS = { theme: 'carbon', workshopName: 'CarDiag', logo: '', banner: '', avatar: '' };

function preferencesApi() {
  return window.Capacitor?.Plugins?.Preferences;
}

async function readPreferences() {
  try {
    const native = preferencesApi();
    const raw = native ? (await native.get({ key: STORAGE_KEY })).value : localStorage.getItem(STORAGE_KEY);
    return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
  } catch { return { ...DEFAULTS }; }
}

async function savePreferences(value) {
  const serialized = JSON.stringify(value);
  try {
    const native = preferencesApi();
    if (native) await native.set({ key: STORAGE_KEY, value: serialized });
    else localStorage.setItem(STORAGE_KEY, serialized);
  } catch { /* Le thème actif reste appliqué en mémoire. */ }
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[char]);
}

function compressBrandImage(file, kind) {
  const limits = kind === 'banner' ? [1280, 460] : [420, 420];
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const ratio = Math.min(1, limits[0] / image.width, limits[1] / image.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/webp', .78));
      URL.revokeObjectURL(image.src);
    };
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}

function buildPanel() {
  const panel = document.createElement('aside');
  panel.id = 'designPanel';
  panel.className = 'design-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <header><div><p class="panel-kicker">DESIGN SYSTEM</p><h2>Personnaliser CarDiag</h2></div><button type="button" data-design-close aria-label="Fermer">×</button></header>
    <fieldset class="theme-picker"><legend>Ambiance</legend>
      <label><input type="radio" name="design_theme" value="carbon"><span><b>Dark Racing</b><small>Carbone & orange</small></span></label>
      <label><input type="radio" name="design_theme" value="workshop"><span><b>Atelier Pro</b><small>Clair & technique</small></span></label>
      <label><input type="radio" name="design_theme" value="premium"><span><b>Minimal Premium</b><small>Graphite & ivoire</small></span></label>
    </fieldset>
    <label class="design-field">Nom de l’atelier<input name="workshop_name" maxlength="60" placeholder="CarDiag"></label>
    <div class="branding-grid">
      <label>Logo<input type="file" accept="image/*" data-brand-file="logo"><span data-brand-preview="logo">Importer</span></label>
      <label>Bannière<input type="file" accept="image/*" data-brand-file="banner"><span data-brand-preview="banner">Importer</span></label>
      <label>Avatar<input type="file" accept="image/*" data-brand-file="avatar"><span data-brand-preview="avatar">Importer</span></label>
    </div>
    <button type="button" class="design-clear" data-brand-clear>Effacer les visuels</button>`;
  document.body.append(panel);
  return panel;
}

function applyBranding(state) {
  document.documentElement.dataset.theme = THEMES.has(state.theme) ? state.theme : 'carbon';
  document.querySelectorAll('.brand-wordmark').forEach((node) => { node.textContent = state.workshopName || 'CarDiag'; });
  document.querySelectorAll('.brand-logo').forEach((image) => {
    if (state.logo) image.src = state.logo;
  });
  document.documentElement.style.setProperty('--brand-banner-image', state.banner ? `url("${state.banner}")` : 'none');
  document.documentElement.style.setProperty('--brand-avatar-image', state.avatar ? `url("${state.avatar}")` : 'none');
  document.body.classList.toggle('has-brand-banner', Boolean(state.banner));
  document.body.classList.toggle('has-brand-avatar', Boolean(state.avatar));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--app-chrome').trim() || '#0b0a09');
  window.dispatchEvent(new CustomEvent('cardiag:branding-change', { detail: state }));
}

export async function initializeThemeManager() {
  let state = await readPreferences();
  const panel = buildPanel();
  const header = document.getElementById('wizardHeader');
  const button = document.createElement('button');
  button.className = 'design-trigger';
  button.type = 'button';
  button.setAttribute('aria-label', 'Thèmes et identité visuelle');
  button.innerHTML = '<span class="design-trigger-logo"></span><span class="design-trigger-name"></span>';
  header?.append(button);

  const render = () => {
    applyBranding(state);
    panel.querySelector(`[name="design_theme"][value="${state.theme}"]`)?.setAttribute('checked', '');
    panel.querySelector('[name="workshop_name"]').value = state.workshopName || '';
    button.querySelector('.design-trigger-name').textContent = state.workshopName || 'CarDiag';
    button.style.setProperty('--trigger-logo', state.logo ? `url("${state.logo}")` : 'url("icons/app-icon.svg")');
    panel.querySelectorAll('[data-brand-preview]').forEach((preview) => {
      const value = state[preview.dataset.brandPreview];
      preview.style.backgroundImage = value ? `url("${value}")` : '';
      preview.classList.toggle('has-image', Boolean(value));
      preview.textContent = value ? '' : 'Importer';
    });
  };
  const persist = async () => { render(); await savePreferences(state); };

  button.addEventListener('click', () => { panel.hidden = false; requestAnimationFrame(() => panel.classList.add('is-open')); });
  panel.querySelector('[data-design-close]').addEventListener('click', () => {
    panel.classList.remove('is-open');
    window.setTimeout(() => { panel.hidden = true; }, 220);
  });
  panel.querySelectorAll('[name="design_theme"]').forEach((input) => input.addEventListener('change', () => {
    state.theme = input.value;
    persist();
  }));
  panel.querySelector('[name="workshop_name"]').addEventListener('input', (event) => {
    state.workshopName = event.target.value.trim().slice(0, 60) || 'CarDiag';
    persist();
  });
  panel.querySelectorAll('[data-brand-file]').forEach((input) => input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    state[input.dataset.brandFile] = await compressBrandImage(file, input.dataset.brandFile);
    input.value = '';
    await persist();
  }));
  panel.querySelector('[data-brand-clear]').addEventListener('click', async () => {
    state = { ...state, logo: '', banner: '', avatar: '' };
    await persist();
  });

  window.cardiagBranding = {
    get current() { return { ...state }; },
    async update(values={}) {
      state = { ...state, ...values };
      await persist();
      return { ...state };
    },
    pdfHeaderHtml() {
      const logo = state.logo ? `<img src="${state.logo}" alt="">` : '';
      const bannerStyle = state.banner ? ` style="background-image:url('${state.banner}')"` : '';
      return `<div class="ps-brand-header"${bannerStyle}>${logo}<div><strong>${escapeHtml(state.workshopName)}</strong><span>Rapport d’expertise automobile</span></div></div>`;
    },
  };
  render();
}
