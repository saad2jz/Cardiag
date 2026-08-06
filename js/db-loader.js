(function (global) {
  function slugify(value) {
    return String(value)
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .toLowerCase();
  }

  async function loadJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Impossible de charger ${url}`);
    }
    return response.json();
  }

  async function loadMarques() {
    return loadJson('data/marques.json');
  }

  function normalizeModeleSource(source) {
    if (!source) return [];

    if (Array.isArray(source)) {
      return source.map((item) => ({
        marque: item.marque,
        modeles: Array.isArray(item.modeles) ? item.modeles : [],
      }));
    }

    if (typeof source === 'object') {
      if (source.marque && Array.isArray(source.modeles)) {
        return [{ marque: source.marque, modeles: source.modeles }];
      }
      if (Array.isArray(source.marques)) {
        return source.marques.map((item) => ({
          marque: item.marque,
          modeles: Array.isArray(item.modeles) ? item.modeles : [],
        }));
      }
    }

    return [];
  }

  async function tryLoadModelFile(url) {
    try {
      return await loadJson(url);
    } catch (error) {
      return null;
    }
  }

  async function loadAppData() {
    const marques = await loadMarques();
    const modelesByMarque = {};

    const fileCandidates = [
      'alpine.json',
      'bugatti.json',
      'citroen.json',
      'ds-automobiles.json',
      'fiat_fiabilite.json',
      'land_rover.json',
      'maserati_fiabilite.json',
      'mclaren.json',
      'peugeot.json',
      'renault.json',
      'simca.json',
      'stellantis_ferrari_lambo_fiabilite_global.json',
      'talbot.json',
      'toutes_marques.json',
    ];

    const allModels = [];
    for (const fileName of fileCandidates) {
      const payload = await tryLoadModelFile(`data/modeles/${fileName}`);
      if (!payload) continue;
      allModels.push(...normalizeModeleSource(payload));
    }

    for (const marque of marques) {
      const normalizedNom = String(marque.nom).trim();
      const directSlug = slugify(normalizedNom);
      let modeleList = [];

      const matchFromFiles = allModels.find((item) =>
        String(item.marque).trim().toLowerCase() === normalizedNom.toLowerCase()
      );

      if (matchFromFiles) {
        modeleList = matchFromFiles.modeles;
      } else {
        const directFile = await tryLoadModelFile(`data/modeles/${directSlug}.json`);
        if (directFile) {
          modeleList = Array.isArray(directFile) ? directFile : directFile.modeles || [];
        }
      }

      modelesByMarque[marque.nom] = modeleList;
    }

    return { marques, modelesByMarque };
  }

  async function loadManifest() {
    return loadJson('manifest.json');
  }

  global.dbLoader = { loadManifest, loadMarques, loadAppData };
})(window);
