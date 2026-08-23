import { OFFICIAL_LOGOS, getVehicleBrandLogoPath } from '../branding/vehicle-brand-logos.js?v=20260823-5';

const INITIAL_BRAND_LIMIT = 20;
const FEATURED_BRANDS = [
  // Ordre métier demandé : les marques les plus courantes apparaissent sans
  // action, puis les segments premium, sport, électrique et utilitaire.
  'Toyota', 'Volkswagen', 'Ford', 'Honda', 'Hyundai', 'Kia', 'Nissan', 'Chevrolet',
  'Renault', 'Peugeot', 'Citroën', 'Fiat', 'Opel', 'Vauxhall', 'Skoda', 'Seat',
  'Dacia', 'Suzuki', 'Mazda', 'Mitsubishi', 'Subaru',
  'BMW', 'Mercedes-Benz', 'Audi', 'Volvo', 'Lexus', 'Porsche', 'Land Rover', 'Jaguar',
  'Alfa Romeo', 'Mini', 'Cupra', 'DS Automobiles', 'Genesis', 'Infiniti', 'Acura',
  'Cadillac', 'Lincoln', 'Buick', 'Chrysler', 'Maserati',
  'Ferrari', 'Lamborghini', 'McLaren', 'Aston Martin', 'Bentley', 'Rolls-Royce',
  'Bugatti', 'Pagani', 'Koenigsegg', 'Lotus', 'Alpine', 'Maybach', 'Morgan', 'TVR',
  'Rimac', 'Wiesmann', 'De Tomaso', 'Saleen', 'Hennessey', 'Donkervoort',
  'Tesla', 'BYD', 'Polestar', 'Rivian', 'Lucid', 'NIO', 'XPeng', 'Zeekr', 'Fisker',
  'Faraday Future', 'VinFast', 'Leapmotor', 'Aiways',
  'Jeep', 'Ram', 'GMC', 'Dodge', 'Isuzu', 'Iveco', 'Mahindra', 'SsangYong', 'KGM',
  'Ineos', 'Daihatsu', 'Geely', 'Chery', 'Abarth',
];

const BRAND_ALIASES = new Map([
  ['bmw alpina', 'bmw'], ['ford usa', 'ford'], ['ds automobiles', 'ds automobiles'],
  ['maruti suzuki', 'suzuki'], ['mercedes benz', 'mercedes'],
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

function emblemMarkup(name) {
  const logoPath = getVehicleBrandLogoPath(name);
  if (logoPath) {
    return `<span class="brand-emblem has-official-logo" aria-hidden="true"><img class="official-brand-logo" src="${logoPath}" alt="" width="64" height="64" loading="lazy" decoding="async"></span>`;
  }
  // Ne jamais dessiner un faux emblème : l'initiale est volontairement neutre
  // si l'actif local officiel n'est pas encore dans le catalogue.
  return `<span class="brand-emblem brand-logo-placeholder" aria-hidden="true">${initials(name)}</span>`;
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
  const featuredOrder = new Map(FEATURED_BRANDS.map((brand, index) => [brandKey(brand), index]));
  const allBrands = vehicles.map((vehicle) => vehicle.nom).filter(Boolean).sort((a, b) => {
    const aRank = featuredOrder.has(brandKey(a)) ? featuredOrder.get(brandKey(a)) : Number.MAX_SAFE_INTEGER;
    const bRank = featuredOrder.has(brandKey(b)) ? featuredOrder.get(brandKey(b)) : Number.MAX_SAFE_INTEGER;
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
    // Le modèle et la génération/châssis font tous deux partie du même
    // véhicule : l'emblème de la marque conserve le repère visuel choisi.
    if (config.key === 'model' || config.key === 'generation') return emblemMarkup(select.value);
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
