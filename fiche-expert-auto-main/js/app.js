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
      motorisationSelect.addEventListener('change', updateResult);
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
