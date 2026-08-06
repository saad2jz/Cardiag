(function () {
  let root = null;
  let marqueSelect = null;
  let modeleSelect = null;
  let generationSelect = null;
  let anneeSelect = null;
  let motorisationSelect = null;
  let result = null;
  let loadingText = null;

  let data = [];

  function createPlaceholderOption(text) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = text;
    option.disabled = true;
    option.selected = true;
    option.hidden = true;
    return option;
  }

  function renderBrands() {
    if (!marqueSelect) return;
    marqueSelect.innerHTML = '';
    marqueSelect.appendChild(createPlaceholderOption('Choisissez une marque... *'));
    data.forEach((marque) => {
      const option = document.createElement('option');
      option.value = marque.nom;
      option.textContent = marque.nom;
      marqueSelect.appendChild(option);
    });

    resetDetails(['modele', 'generation', 'annee', 'motorisation']);
  }

  function renderModels() {
    if (!modeleSelect) return;
    const selectedMarque = marqueSelect.value;
    const marque = data.find((item) => item.nom === selectedMarque);
    modeleSelect.innerHTML = '';
    modeleSelect.appendChild(createPlaceholderOption('Choisissez un modèle'));
    resetDetails(['generation', 'annee', 'motorisation']);

    if (!marque || marque.modeles.length === 0) {
      const option = document.createElement('option');
      option.textContent = 'Aucun modèle disponible';
      option.value = '';
      modeleSelect.appendChild(option);
      modeleSelect.disabled = true;
      if (result) {
        result.textContent = marque ? 'Aucun modèle disponible pour cette marque.' : 'Sélectionnez une marque.';
      }
      return;
    }

    modeleSelect.disabled = false;
    marque.modeles.forEach((modele) => {
      const option = document.createElement('option');
      option.value = modele.nom;
      option.textContent = modele.nom;
      modeleSelect.appendChild(option);
    });

    if (result) {
      result.textContent = 'Sélectionnez un modèle.';
    }
  }

  function renderGenerations() {
    if (!generationSelect || !anneeSelect || !motorisationSelect) return;
    const modele = getSelectedModel();
    generationSelect.innerHTML = '';
    generationSelect.appendChild(createPlaceholderOption('Choisissez une génération'));
    resetDetails(['annee', 'motorisation']);

    const generations = Array.isArray(modele?.generations) ? modele.generations : [];
    if (!modele || generations.length === 0) {
      const option = document.createElement('option');
      option.textContent = 'Aucune génération disponible';
      option.value = '';
      generationSelect.appendChild(option);
      generationSelect.disabled = true;
      if (result) {
        result.textContent = modele ? 'Aucune génération disponible pour ce modèle.' : 'Sélectionnez un modèle.';
      }
      return;
    }

    generationSelect.disabled = false;
    generationSelect.value = '';
    generations.forEach((generation, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = formatGenerationLabel(generation);
      generationSelect.appendChild(option);
    });

    if (result) {
      result.textContent = 'Sélectionnez une génération.';
    }
  }

  function renderAnnees() {
    if (!anneeSelect || !motorisationSelect) return;
    const generation = getSelectedGeneration();
    anneeSelect.innerHTML = '';
    anneeSelect.appendChild(createPlaceholderOption('Choisissez une année... *'));
    resetDetails(['motorisation']);

    const years = parseYears(generation?.annees);
    if (!generation || years.length === 0) {
      const option = document.createElement('option');
      option.textContent = 'Aucune année disponible';
      option.value = '';
      anneeSelect.appendChild(option);
      anneeSelect.disabled = true;
      if (result) {
        result.textContent = generation ? 'Aucune année disponible pour cette génération.' : 'Sélectionnez une génération.';
      }
      return;
    }

    anneeSelect.disabled = false;
    anneeSelect.value = '';
    years.forEach((year) => {
      const option = document.createElement('option');
      option.value = String(year);
      option.textContent = String(year);
      anneeSelect.appendChild(option);
    });

    if (result) {
      result.textContent = 'Sélectionnez une année.';
    }
  }

  function renderMotorisations() {
    if (!motorisationSelect) return;
    motorisationSelect.innerHTML = '';
    motorisationSelect.appendChild(createPlaceholderOption('Choisissez une motorisation'));
    renderPotentialIssues();

    const generation = getSelectedGeneration();
    const motorisations = Array.isArray(generation?.motorisations)
      ? generation.motorisations
      : [];

    if (!generation || motorisations.length === 0) {
      const option = document.createElement('option');
      option.textContent = 'Aucune motorisation disponible';
      option.value = '';
      motorisationSelect.appendChild(option);
      motorisationSelect.disabled = true;
      if (result) {
        result.textContent = generation ? 'Aucune motorisation disponible pour cette génération.' : 'Sélectionnez une génération.';
      }
      return;
    }

    motorisationSelect.disabled = false;
    motorisationSelect.value = '';
    motorisations.forEach((motorisation, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = motorisation.nom || `${motorisation.type || ''} ${motorisation.cylindree || ''}`.trim();
      motorisationSelect.appendChild(option);
    });

    if (result) {
      result.textContent = 'Sélectionnez une motorisation.';
    }
  }

  function resetDetails(fields) {
    if (fields.includes('modele') && modeleSelect) {
      modeleSelect.innerHTML = '';
      modeleSelect.appendChild(createPlaceholderOption('Choisissez d\'abord une marque'));
      modeleSelect.disabled = true;
    }
    if (fields.includes('generation') && generationSelect) {
      generationSelect.innerHTML = '';
      generationSelect.appendChild(createPlaceholderOption('Choisissez d\'abord un modèle'));
      generationSelect.disabled = true;
    }
    if (fields.includes('annee') && anneeSelect) {
      anneeSelect.innerHTML = '';
      anneeSelect.appendChild(createPlaceholderOption('Choisissez d\'abord une génération'));
      anneeSelect.disabled = true;
    }
    if (fields.includes('motorisation') && motorisationSelect) {
      motorisationSelect.innerHTML = '';
      motorisationSelect.appendChild(createPlaceholderOption('Choisissez d\'abord une génération'));
      motorisationSelect.disabled = true;
      renderPotentialIssues();
    }
  }

  function getSelectedModel() {
    const selectedMarque = marqueSelect.value;
    const selectedModele = modeleSelect.value;
    const marque = data.find((item) => item.nom === selectedMarque);
    return marque?.modeles?.find((modele) => modele.nom === selectedModele) || null;
  }

  function getSelectedGeneration() {
    const modele = getSelectedModel();
    const rawValue = generationSelect?.value;
    if (!modele || !Array.isArray(modele.generations) || typeof rawValue !== 'string') {
      return null;
    }

    const trimmedValue = rawValue.trim();
    if (!trimmedValue) {
      return null;
    }

    const index = Number.parseInt(trimmedValue, 10);
    if (!Number.isInteger(index) || index < 0 || index >= modele.generations.length) {
      return null;
    }

    return modele.generations[index] || null;
  }

  function getSelectedMotorisation() {
    const generation = getSelectedGeneration();
    const rawValue = motorisationSelect?.value;
    const motorisations = Array.isArray(generation?.motorisations) ? generation.motorisations : [];
    const index = Number.parseInt(rawValue, 10);

    if (!Number.isInteger(index) || index < 0 || index >= motorisations.length) {
      return null;
    }

    return motorisations[index] || null;
  }

  function renderPotentialIssues() {
    const container = document.getElementById('vehicleIssues');
    const summary = document.getElementById('vehicleIssuesSummary');
    const list = document.getElementById('vehicleIssuesList');
    const hiddenField = document.querySelector('input[name="motorisation_points_faibles"]');
    const motorisation = getSelectedMotorisation();
    const issues = Array.isArray(motorisation?.points_faibles)
      ? motorisation.points_faibles
      : [];

    if (!container || !summary || !list) return;

    list.replaceChildren();
    if (hiddenField) hiddenField.value = issues.length ? JSON.stringify(issues) : '';

    if (!issues.length) {
      container.hidden = true;
      return;
    }

    issues.forEach((issue) => {
      const item = document.createElement('li');
      const title = typeof issue === 'string'
        ? issue
        : String(issue?.probleme || issue?.description || 'Point de vigilance documenté');
      const details = typeof issue === 'object' && issue
        ? [issue.gravite, issue.frequence, issue.kilometrage_apparition]
          .filter(Boolean)
          .join(' — ')
        : '';

      item.textContent = details ? `${title} (${details})` : title;
      list.appendChild(item);
    });

    summary.textContent = `${issues.length} point${issues.length > 1 ? 's' : ''} documenté${issues.length > 1 ? 's' : ''} pour cette motorisation. À confirmer lors de l'inspection.`;
    container.hidden = false;
  }

  function formatGenerationLabel(generation) {
    const code = generation.code_chassis || generation.phase || generation.phases?.[0] || 'Génération';
    const years = generation.annees ? ` (${generation.annees})` : '';
    return `${code}${years}`;
  }

  function parseYears(annees) {
    if (!annees) return [];
    if (Array.isArray(annees)) {
      return annees.flatMap((item) => parseYears(String(item)));
    }
    const text = String(annees).trim();
    const years = new Set();
    text.split(/[,;]+/).forEach((part) => {
      const rangeMatch = part.trim().match(/^(\d{4})\s*-\s*(\d{4})$/);
      if (rangeMatch) {
        const start = Number(rangeMatch[1]);
        const end = Number(rangeMatch[2]);
        for (let year = start; year <= end; year += 1) {
          years.add(year);
        }
        return;
      }
      const singleMatch = part.trim().match(/^(\d{4})$/);
      if (singleMatch) {
        years.add(Number(singleMatch[1]));
      }
    });
    return Array.from(years).sort((a, b) => a - b);
  }

  function syncBadgeGroupStates() {
    document.querySelectorAll('.badge-group').forEach((group) => {
      const radios = Array.from(group.querySelectorAll('input[type="radio"]'));
      const labels = Array.from(group.querySelectorAll('label'));

      radios.forEach((radio) => {
        radio.addEventListener('change', () => {
          labels.forEach((label) => {
            label.classList.toggle('is-active', label.htmlFor === radio.id && radio.checked);
          });
        });
      });

      labels.forEach((label) => {
        label.addEventListener('click', () => {
          const radio = document.getElementById(label.htmlFor);
          if (!radio) return;
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });

      radios.forEach((radio) => {
        if (radio.checked) {
          const label = labels.find((item) => item.htmlFor === radio.id);
          if (label) {
            label.classList.add('is-active');
          }
        }
      });
    });
  }

  const defaultWeights = {
    vital: 5,
    chassis: 3,
    esthetique: 1,
  };

  function scoreCategory(item) {
    const section = item.closest('details.section')?.dataset.section;
    if (section === 'moteur' || section === 'diagnostic') return 'vital';
    if (section === 'chassis' || section === 'essai') return 'chassis';
    return 'esthetique';
  }

  function scoreWeights() {
    const fields = {
      vital: document.getElementById('weightVital'),
      chassis: document.getElementById('weightChassis'),
      esthetique: document.getElementById('weightEsthetique'),
    };

    return Object.fromEntries(
      Object.entries(fields).map(([category, field]) => {
        const value = Number.parseInt(field?.value, 10);
        return [category, Number.isFinite(value) && value >= 0 ? value : defaultWeights[category]];
      })
    );
  }

  function updateScore() {
    const items = Array.from(document.querySelectorAll('.check-item'));
    const checkedItems = items.filter((item) => item.querySelector('input[type="radio"]:checked'));
    const scoreGauge = document.getElementById('scoreGauge');
    const miniDash = document.getElementById('miniDash');
    const miniDashRing = document.getElementById('miniDashRing');
    const miniDashScore = document.getElementById('miniDashScore');
    const miniDashVerdict = document.getElementById('miniDashVerdict');
    const miniDashSub = document.getElementById('miniDashSub');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressPct = document.getElementById('progressPct');

    const completion = items.length ? Math.round((checkedItems.length / items.length) * 100) : 0;
    if (progressBar) progressBar.style.width = `${completion}%`;
    if (progressText) progressText.textContent = `${checkedItems.length} point${checkedItems.length > 1 ? 's' : ''} vérifié${checkedItems.length > 1 ? 's' : ''}`;
    if (progressPct) progressPct.textContent = `${completion}%`;

    if (!checkedItems.length) {
      if (scoreGauge) scoreGauge.textContent = 'Score : —';
      if (miniDash) miniDash.classList.remove('show', 'v-achat', 'v-negociation', 'v-fuir');
      return;
    }

    const values = { ok: 100, moyen: 55, defaut: 0 };
    const weights = scoreWeights();
    let weightedScore = 0;
    let totalWeight = 0;

    checkedItems.forEach((item) => {
      const selected = item.querySelector('input[type="radio"]:checked');
      const weight = weights[scoreCategory(item)];
      weightedScore += (values[selected.value] ?? 0) * weight;
      totalWeight += weight;
    });

    const score = totalWeight ? Math.round(weightedScore / totalWeight) : 0;
    const selectedVerdict = document.querySelector('input[name="verdict"]:checked')?.value;
    const verdict = selectedVerdict || (score >= 80 ? 'achat' : score >= 55 ? 'negociation' : 'fuir');
    const verdictLabels = {
      achat: 'ACHAT',
      negociation: 'NÉGOCIATION',
      fuir: 'À FUIR',
    };
    const colors = {
      achat: '#1B8F58',
      negociation: '#C78A00',
      fuir: '#C6303A',
    };

    if (scoreGauge) {
      scoreGauge.textContent = `Score : ${score}%`;
      scoreGauge.dataset.tooltip = `Score pondéré sur ${checkedItems.length} contrôle${checkedItems.length > 1 ? 's' : ''} renseigné${checkedItems.length > 1 ? 's' : ''}.`;
    }
    if (miniDash) {
      miniDash.classList.add('show');
      miniDash.classList.remove('v-achat', 'v-negociation', 'v-fuir');
      miniDash.classList.add(`v-${verdict}`);
    }
    if (miniDashRing) {
      miniDashRing.style.background = `conic-gradient(${colors[verdict]} ${score}%, var(--border) 0)`;
    }
    if (miniDashScore) miniDashScore.textContent = `${score}%`;
    if (miniDashVerdict) miniDashVerdict.innerHTML = `<span class="mini-dash-dot"></span> ${verdictLabels[verdict]}`;
    if (miniDashSub) miniDashSub.textContent = `${checkedItems.length} / ${items.length} vérifiés`;
  }

  function initializeScore() {
    const weightFields = [
      document.getElementById('weightVital'),
      document.getElementById('weightChassis'),
      document.getElementById('weightEsthetique'),
    ];
    weightFields.forEach((field, index) => {
      if (!field) return;
      if (!field.value) field.value = Object.values(defaultWeights)[index];
      field.addEventListener('input', updateScore);
    });

    document.querySelectorAll('.check-item input[type="radio"], input[name="verdict"]').forEach((input) => {
      input.addEventListener('change', updateScore);
    });

    document.getElementById('miniDash')?.addEventListener('click', () => {
      document.querySelector('details[data-section="bilan"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    updateScore();
  }

  function updateResult() {
    const selectedMarque = marqueSelect.value;
    const selectedModele = modeleSelect.value;
    const selectedGeneration = generationSelect?.value;
    const selectedAnnee = anneeSelect?.value;
    const selectedMotorisation = motorisationSelect?.value;

    if (!selectedMarque) {
      if (result) result.textContent = 'Sélectionnez une marque.';
      return;
    }
    if (!selectedModele) {
      if (result) result.textContent = 'Sélectionnez un modèle.';
      return;
    }
    if (!selectedGeneration) {
      if (result) result.textContent = 'Sélectionnez une génération.';
      return;
    }
    if (!selectedAnnee) {
      if (result) result.textContent = 'Sélectionnez une année.';
      return;
    }
    if (!selectedMotorisation) {
      if (result) result.textContent = 'Sélectionnez une motorisation.';
      return;
    }
    if (result) {
      result.textContent = `Vous avez choisi ${selectedModele} (${selectedAnnee}) — motorisation sélectionnée.`;
    }
  }

  async function init() {
    try {
      root = document.querySelector('main');
      marqueSelect = document.getElementById('marqueSelect');
      modeleSelect = document.getElementById('modeleSelect');
      generationSelect = document.getElementById('generationSelect');
      anneeSelect = document.getElementById('anneeSelect');
      motorisationSelect = document.getElementById('motorisationSelect');
      result = document.getElementById('result');
      loadingText = document.querySelector('main p');

      if (!window.dbLoader || typeof window.dbLoader.loadAppData !== 'function') {
        throw new Error('Le chargeur de données n’est pas disponible.');
      }

      if (!window.buildData || typeof window.buildData !== 'function') {
        throw new Error('Le constructeur de données n’est pas disponible.');
      }

      const payload = await window.dbLoader.loadAppData();
      data = window.buildData(payload);
      
      if (loadingText) {
        loadingText.style.display = 'none';
      }
      
      renderBrands();
      syncBadgeGroupStates();
      initializeScore();
      marqueSelect.addEventListener('change', renderModels);
      modeleSelect.addEventListener('change', renderGenerations);
      generationSelect.addEventListener('change', () => {
        renderAnnees();
        updateResult();
      });
      anneeSelect.addEventListener('change', () => {
        renderMotorisations();
        updateResult();
      });
      motorisationSelect.addEventListener('change', () => {
        renderPotentialIssues();
        updateResult();
      });
      updateResult();
    } catch (error) {
      console.error('Erreur app.js:', error);
      if (loadingText) {
        loadingText.textContent = 'Erreur: ' + error.message;
        loadingText.style.display = 'block';
      }
      if (result) {
        result.textContent = 'Le chargement a échoué: ' + error.message;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
