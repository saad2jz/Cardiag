import { OFFICIAL_LOGOS, getVehicleBrandLogoPath } from '../branding/vehicle-brand-logos.js?v=20260821-1';

const INITIAL_BRAND_LIMIT = 15;
const FEATURED_BRANDS = [
  'Renault', 'Peugeot', 'Citroën', 'Dacia', 'Volkswagen', 'Toyota', 'BMW',
  'Mercedes-Benz', 'Audi', 'Ford', 'Opel', 'Fiat', 'Nissan', 'Hyundai', 'Kia',
  'Seat', 'Skoda', 'Volvo', 'Honda', 'Mazda', 'Suzuki', 'Mini', 'Tesla',
  'Porsche', 'Alfa Romeo', 'Land Rover', 'Lexus', 'Cupra', 'DS Automobiles',
  'Mitsubishi',
];

const BRAND_ALIASES = new Map([
  ['bmw alpina', 'bmw'], ['ford usa', 'ford'], ['ds automobiles', 'ds'],
  ['maruti suzuki', 'suzuki'], ['mercedes benz', 'mercedes'],
]);

const EMBLEM_BRANDS = new Set([
  'alfa romeo', 'audi', 'bmw', 'citroen', 'cupra', 'dacia', 'ds', 'ferrari',
  'fiat', 'ford', 'honda', 'hyundai', 'jeep', 'kia', 'lamborghini',
  'land rover', 'lexus', 'mazda', 'mercedes', 'mini', 'mitsubishi', 'nissan',
  'opel', 'peugeot', 'porsche', 'renault', 'seat', 'skoda', 'smart', 'subaru',
  'suzuki', 'tesla', 'toyota', 'volkswagen', 'volvo',
]);

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function brandKey(name) {
  const normalized = normalize(name);
  return BRAND_ALIASES.get(normalized) || normalized;
}

function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map((word) => word[0]).join('') : words[0]?.slice(0, 2) || '?').toUpperCase().slice(0, 3);
}

function emblemSvg(name) {
  const key = brandKey(name);
  const label = initials(name);
  const text = `<text x="50" y="55" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
  const marks = {
    audi: '<g fill="none"><circle cx="25" cy="50" r="16"/><circle cx="42" cy="50" r="16"/><circle cx="59" cy="50" r="16"/><circle cx="76" cy="50" r="16"/></g>',
    bmw: '<circle cx="50" cy="50" r="35"/><circle cx="50" cy="50" r="25"/><path d="M50 25v25H25A25 25 0 0 1 50 25Zm0 25h25A25 25 0 0 1 50 75Z" class="brand-fill"/>',
    mercedes: '<circle cx="50" cy="50" r="36"/><path d="M50 15v35L20 70m30-20 30 20"/>',
    volkswagen: '<circle cx="50" cy="50" r="36"/><path d="m28 24 22 52 22-52M34 48h32"/>',
    renault: '<path d="M50 12 77 50 50 88 23 50Z M50 25 65 50 50 75 35 50Z" fill-rule="evenodd"/>',
    citroen: '<path d="m25 48 25-18 25 18M25 68l25-18 25 18"/>',
    toyota: '<ellipse cx="50" cy="50" rx="39" ry="28"/><ellipse cx="50" cy="50" rx="14" ry="28"/><ellipse cx="50" cy="38" rx="28" ry="12"/>',
    ford: '<ellipse cx="50" cy="50" rx="42" ry="25"/><text x="50" y="55" text-anchor="middle" dominant-baseline="middle" class="brand-word">Ford</text>',
    honda: '<rect x="20" y="16" width="60" height="68" rx="15"/><path d="M34 29v42m32-42v42M34 50h32"/>',
    hyundai: '<ellipse cx="50" cy="50" rx="40" ry="27"/><path d="m32 68 18-36m0 36 18-36M41 50h18"/>',
    kia: '<ellipse cx="50" cy="50" rx="42" ry="25"/><text x="50" y="55" text-anchor="middle" dominant-baseline="middle" class="brand-word">KIA</text>',
    nissan: '<circle cx="50" cy="50" r="31"/><path d="M12 39h76v22H12z" class="brand-fill"/><text x="50" y="54" text-anchor="middle" class="brand-cut">NISSAN</text>',
    volvo: '<circle cx="45" cy="55" r="28"/><path d="M64 35 85 14m-20 0h20v20"/>',
    tesla: '<path d="M20 28c20-13 40-13 60 0M50 28v53M32 35c9-7 27-7 36 0"/>',
    porsche: '<path d="M50 10 80 20v30c0 19-11 32-30 40-19-8-30-21-30-40V20Z"/><text x="50" y="56" text-anchor="middle" class="brand-word">P</text>',
    fiat: '<circle cx="50" cy="50" r="36"/><text x="50" y="56" text-anchor="middle" class="brand-word">FIAT</text>',
    dacia: '<path d="M16 27h68v25c0 20-15 31-34 38-19-7-34-18-34-38Z"/><text x="50" y="55" text-anchor="middle" class="brand-word">DC</text>',
    mini: '<circle cx="50" cy="50" r="23"/><path d="M27 39H4m23 11H4m23 11H4m69-22h23M73 50h23M73 61h23"/>',
    'land rover': '<ellipse cx="50" cy="50" rx="42" ry="25"/><text x="50" y="54" text-anchor="middle" class="brand-word">LR</text>',
    lexus: '<ellipse cx="50" cy="50" rx="40" ry="29"/><path d="M55 23 34 72h34"/>',
    mazda: '<ellipse cx="50" cy="50" rx="40" ry="30"/><path d="M20 36c17 4 23 13 30 30 7-17 13-26 30-30"/>',
    subaru: '<ellipse cx="50" cy="50" rx="41" ry="28"/><path d="m30 50 5 2 2 5 2-5 5-2-5-2-2-5-2 5Zm25-10 4 2 2 4 2-4 4-2-4-2-2-4-2 4Z" class="brand-fill"/>',
    mitsubishi: '<path d="m50 10 18 27-18 13-18-13Zm0 40 18-13 18 27-36 20Zm0 0L14 64l18-27Z" class="brand-fill"/>',
    suzuki: '<path d="M71 16 29 37l35 19-35 28M29 37l42-21M64 56 29 84"/>',
    opel: '<circle cx="50" cy="50" r="34"/><path d="M12 54h31l9-14h36L57 54l-9 14H12Z"/>',
    cupra: '<path d="m15 31 25 8 10 13 10-13 25-8-20 38-15 12-15-12Z"/>',
    seat: '<path d="M72 20H35L20 35h44L36 50h29l15 15-15 15H28"/>',
    skoda: '<circle cx="50" cy="50" r="35"/><path d="M25 53c20-21 33-24 53-15-21 4-26 13-34 29Z"/>',
    'alfa romeo': text,
    peugeot: '<path d="M31 79V23h29c14 0 21 8 21 19s-7 19-21 19H44"/>',
    ferrari: '<path d="M24 13h52v45c0 15-11 25-26 32-15-7-26-17-26-32Z"/><text x="50" y="56" text-anchor="middle" class="brand-word">F</text>',
    lamborghini: '<path d="M50 10 80 23 73 64c-5 12-13 20-23 26-10-6-18-14-23-26l-7-41Z"/><text x="50" y="57" text-anchor="middle" class="brand-word">L</text>',
    jeep: '<text x="50" y="57" text-anchor="middle" class="brand-word">Jeep</text>',
    ds: '<path d="M18 25h26v50H18l24-25Zm64 0H57L42 50h24L42 75h40"/>',
    smart: '<circle cx="38" cy="50" r="25"/><path d="M63 50h27V25"/>',
  };
  const content = marks[key] || (EMBLEM_BRANDS.has(key) ? text : text);
  return `<svg viewBox="0 0 100 100" role="img" aria-hidden="true" focusable="false">${content}</svg>`;
}

function emblemMarkup(name) {
  const logoPath = getVehicleBrandLogoPath(name);
  if (logoPath) {
    return `<span class="brand-emblem has-official-logo" aria-hidden="true"><img class="official-brand-logo" src="${logoPath}" alt="" width="64" height="64" loading="lazy" decoding="async"></span>`;
  }
  return `<span class="brand-emblem" data-brand-key="${brandKey(name)}">${emblemSvg(name)}</span>`;
}

function label(key, fallback) {
  return window.cardiagI18n?.t?.(key, fallback) || fallback;
}

function buildPicker() {
  const container = document.createElement('section');
  container.className = 'brand-picker';
  container.setAttribute('aria-labelledby', 'brandPickerTitle');
  container.innerHTML = `
    <div class="brand-picker-head">
      <div><p>${label('brandPicker.kicker', 'CONSTRUCTEUR')}</p><h3 id="brandPickerTitle">${label('brandPicker.title', 'Choisissez la marque')}</h3></div>
      <span class="brand-picker-count" aria-live="polite"></span>
    </div>
    <label class="brand-picker-search">
      <span aria-hidden="true">⌕</span>
      <input type="search" inputmode="search" autocomplete="off" spellcheck="false" placeholder="${label('brandPicker.search', 'Rechercher une marque…')}" aria-label="${label('brandPicker.searchLabel', 'Rechercher une marque de véhicule')}">
    </label>
    <div class="brand-grid" role="listbox" aria-label="${label('brandPicker.listLabel', 'Marques de véhicules')}"></div>
    <button class="brand-picker-more" type="button"></button>
  `;
  return container;
}

const VISUAL_STEPS = [
  { id: 'modeleSelect', key: 'model', icon: '🚘', dependsOn: 'marqueSelect' },
  { id: 'generationSelect', key: 'generation', icon: '🧩', dependsOn: 'modeleSelect' },
  { id: 'anneeSelect', key: 'year', icon: '📅', dependsOn: 'generationSelect' },
  { id: 'motorisationSelect', key: 'engine', icon: '⚙️', dependsOn: 'anneeSelect' },
];

function visualCopy(key) {
  const english = window.cardiagI18n?.language === 'en';
  const values = {
    model: english ? ['MODEL', 'Choose the model', 'Search for a model…'] : ['MODÈLE', 'Choisissez le modèle', 'Rechercher un modèle…'],
    generation: english ? ['GENERATION', 'Choose the generation / chassis', 'Search for a generation…'] : ['GÉNÉRATION', 'Choisissez la génération / châssis', 'Rechercher une génération…'],
    year: english ? ['YEAR', 'Choose the year', 'Search for a year…'] : ['ANNÉE', 'Choisissez l’année', 'Rechercher une année…'],
    engine: english ? ['ENGINE', 'Choose the engine', 'Search for an engine…'] : ['MOTORISATION', 'Choisissez la motorisation', 'Rechercher une motorisation…'],
  };
  return values[key];
}

function buildVisualStep(config) {
  const [kicker, title, searchPlaceholder] = visualCopy(config.key);
  const panel = document.createElement('section');
  panel.className = 'vehicle-choice-picker';
  panel.dataset.choiceFor = config.id;
  panel.hidden = true;
  panel.innerHTML = `
    <div class="brand-picker-head">
      <div><p>${kicker}</p><h3>${title}</h3></div>
      <span class="brand-picker-count" aria-live="polite"></span>
    </div>
    <label class="brand-picker-search">
      <span aria-hidden="true">⌕</span>
      <input type="search" inputmode="search" autocomplete="off" spellcheck="false" placeholder="${searchPlaceholder}">
    </label>
    <div class="brand-grid vehicle-choice-grid" role="listbox" aria-label="${title}"></div>
    <button class="brand-picker-more" type="button"></button>
  `;
  return panel;
}

function setupLogoFallbacks(root) {
  root.querySelectorAll('.has-official-logo img').forEach((image) => {
    image.addEventListener('error', () => image.closest('.has-official-logo')?.classList.add('logo-load-failed'), { once: true });
  });
}

export function initializeBrandPicker(vehicles = []) {
  const select = document.getElementById('marqueSelect');
  const selector = document.querySelector('.vehicle-selector-bar');
  if (!select || !selector || document.querySelector('.brand-picker')) return;

  const picker = buildPicker();
  selector.before(picker);
  const grid = picker.querySelector('.brand-grid');
  const search = picker.querySelector('input');
  const more = picker.querySelector('.brand-picker-more');
  const count = picker.querySelector('.brand-picker-count');
  const featuredOrder = new Map(FEATURED_BRANDS.map((brand, index) => [brand, index]));
  const allBrands = vehicles.map((vehicle) => vehicle.nom).filter(Boolean).sort((a, b) => {
    const aRank = featuredOrder.has(a) ? featuredOrder.get(a) : Number.MAX_SAFE_INTEGER;
    const bRank = featuredOrder.has(b) ? featuredOrder.get(b) : Number.MAX_SAFE_INTEGER;
    return aRank - bRank || a.localeCompare(b, 'fr');
  });
  let expanded = false;

  const visualStates = new Map();
  const visualPanels = VISUAL_STEPS.map((config) => {
    const panel = buildVisualStep(config);
    visualStates.set(config.id, { config, panel, query: '', expanded: false });
    return panel;
  });
  picker.after(...visualPanels);
  selector.classList.add('is-visual-fallback');

  const visualConfirm = document.createElement('button');
  visualConfirm.type = 'button';
  visualConfirm.className = 'vehicle-choice-confirm';
  visualConfirm.textContent = window.cardiagI18n?.language === 'en' ? 'Confirm this vehicle' : 'Valider ce véhicule';
  visualConfirm.hidden = true;
  visualPanels.at(-1).after(visualConfirm);

  function optionValues(selectElement) {
    return [...selectElement.options]
      .filter((option) => option.value)
      .map((option) => ({ value: option.value, label: option.textContent.trim() }));
  }

  function visualIcon(config) {
    if (config.key === 'model') return emblemMarkup(select.value);
    return `<span class="vehicle-choice-icon" aria-hidden="true">${config.icon}</span>`;
  }

  function commitVisualChoice(config, target, value) {
    const optionIndex = [...target.options].findIndex((option) => option.value === value);
    if (optionIndex < 0) return;
    target.selectedIndex = optionIndex;
    const index = VISUAL_STEPS.findIndex((step) => step.id === config.id);
    target.dispatchEvent(new Event('change', { bubbles: true }));
    queueMicrotask(() => {
      renderVisualFlow();
      visualPanels[index + 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function renderVisualStep(state) {
    const { config, panel } = state;
    const target = document.getElementById(config.id);
    const prerequisite = document.getElementById(config.dependsOn);
    const options = target ? optionValues(target) : [];
    const available = Boolean(prerequisite?.value) && !target?.disabled && options.length > 0;
    panel.hidden = !available;
    if (!available) return;

    const query = normalize(state.query);
    const filtered = options.filter((option) => normalize(option.label).includes(query));
    const visible = query || state.expanded ? filtered : filtered.slice(0, 18);
    const targetValue = target.value;
    const gridElement = panel.querySelector('.vehicle-choice-grid');
    gridElement.innerHTML = visible.map((option) => `
      <label class="brand-card vehicle-choice-card${targetValue === option.value ? ' is-selected' : ''}" role="option" aria-selected="${targetValue === option.value}" data-value="${option.value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}">
        <input class="vehicle-choice-input" type="radio" name="visual-${config.id}" value="${option.value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"${targetValue === option.value ? ' checked' : ''}>
        ${visualIcon(config)}
        <strong>${option.label.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</strong>
      </label>
    `).join('');
    setupLogoFallbacks(gridElement);
    panel.querySelector('.brand-picker-count').textContent = String(filtered.length);
    const moreButton = panel.querySelector('.brand-picker-more');
    moreButton.hidden = Boolean(query) || filtered.length <= 18;
    moreButton.textContent = state.expanded
      ? (window.cardiagI18n?.language === 'en' ? 'Show fewer choices' : 'Afficher moins de choix')
      : (window.cardiagI18n?.language === 'en' ? `Show all ${filtered.length} choices` : `Voir les ${filtered.length} choix`);
  }

  function renderVisualFlow() {
    visualStates.forEach(renderVisualStep);
    const make = document.getElementById('marqueSelect')?.value;
    const model = document.getElementById('modeleSelect')?.value;
    const year = document.getElementById('anneeSelect')?.value;
    const engine = document.getElementById('motorisationSelect')?.value;
    visualConfirm.hidden = !(make && model && year && engine);
  }

  function render() {
    const query = normalize(search.value);
    const filtered = allBrands.filter((brand) => normalize(brand).includes(query));
    const visible = query || expanded ? filtered : filtered.slice(0, INITIAL_BRAND_LIMIT);
    const selected = select.value;
    grid.innerHTML = visible.map((brand) => `
      <button class="brand-card${selected === brand ? ' is-selected' : ''}" type="button" role="option" aria-selected="${selected === brand}" data-brand="${brand.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}">
        ${emblemMarkup(brand)}
        <strong>${brand.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</strong>
      </button>
    `).join('');
    setupLogoFallbacks(grid);
    count.textContent = `${filtered.length} ${label(filtered.length > 1 ? 'brandPicker.brands' : 'brandPicker.brand', filtered.length > 1 ? 'marques' : 'marque')}`;
    more.hidden = Boolean(query) || filtered.length <= INITIAL_BRAND_LIMIT;
    more.textContent = expanded
      ? label('brandPicker.less', 'Afficher les marques principales')
      : label('brandPicker.more', `Voir les ${filtered.length} marques`);
  }

  // Capture le clic avant les gestionnaires historiques du formulaire :
  // certains parcours interceptent les événements remontants pour naviguer.
  grid.addEventListener('click', (event) => {
    const card = event.target.closest('.brand-card');
    if (!card) return;
    select.value = card.dataset.brand;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    render();
    queueMicrotask(() => {
      renderVisualFlow();
      visualPanels[0]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, true);
  search.addEventListener('input', render);
  more.addEventListener('click', () => {
    expanded = !expanded;
    render();
    if (!expanded) picker.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  select.addEventListener('change', render);
  VISUAL_STEPS.forEach((config) => {
    const state = visualStates.get(config.id);
    const target = document.getElementById(config.id);
    const searchInput = state.panel.querySelector('input[type="search"]');
    const moreButton = state.panel.querySelector('.brand-picker-more');
    state.panel.querySelector('.vehicle-choice-grid').addEventListener('click', (event) => {
      const card = event.target.closest('.vehicle-choice-card');
      const input = card?.querySelector('.vehicle-choice-input');
      if (!input || !target) return;
      event.preventDefault();
      commitVisualChoice(config, target, input.value);
    }, true);
    searchInput.addEventListener('input', () => {
      state.query = searchInput.value;
      renderVisualStep(state);
    });
    moreButton.addEventListener('click', () => {
      state.expanded = !state.expanded;
      renderVisualStep(state);
    });
    target?.addEventListener('change', renderVisualFlow);
    if (target) new MutationObserver(renderVisualFlow).observe(target, { childList: true, subtree: true });
  });
  visualConfirm.addEventListener('click', () => document.getElementById('vehicleSelectorConfirm')?.click());
  const resetForRecord = () => {
    search.value = '';
    expanded = false;
    visualStates.forEach((state) => {
      state.query = '';
      state.expanded = false;
      state.panel.querySelector('input[type="search"]').value = '';
    });
    render();
    renderVisualFlow();
  };
  window.addEventListener('cardiag:new-vehicle', resetForRecord);
  window.addEventListener('cardiag:record-open', resetForRecord);
  window.addEventListener('cardiag:vehicle-selected', render);
  window.addEventListener('cardiag:language-change', () => {
    picker.querySelector('#brandPickerTitle').textContent = label('brandPicker.title', 'Choisissez la marque');
    picker.querySelector('.brand-picker-head p').textContent = label('brandPicker.kicker', 'CONSTRUCTEUR');
    search.placeholder = label('brandPicker.search', 'Rechercher une marque…');
    search.setAttribute('aria-label', label('brandPicker.searchLabel', 'Rechercher une marque de véhicule'));
    grid.setAttribute('aria-label', label('brandPicker.listLabel', 'Marques de véhicules'));
    visualStates.forEach((state) => {
      const [kicker, title, placeholder] = visualCopy(state.config.key);
      state.panel.querySelector('.brand-picker-head p').textContent = kicker;
      state.panel.querySelector('.brand-picker-head h3').textContent = title;
      state.panel.querySelector('input[type="search"]').placeholder = placeholder;
      state.panel.querySelector('.vehicle-choice-grid').setAttribute('aria-label', title);
    });
    visualConfirm.textContent = window.cardiagI18n?.language === 'en' ? 'Confirm this vehicle' : 'Valider ce véhicule';
    render();
    renderVisualFlow();
  });
  render();
  renderVisualFlow();
}
