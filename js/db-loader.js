(function (global) {
  async function loadJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Impossible de charger ${url}`);
    }
    return response.json();
  }

  async function loadMarques() {
    return loadJson('data/vehicles.json?v=20260811-1');
  }

  async function loadAppData() {
    const marques = await loadMarques();
    if (!Array.isArray(marques)) {
      throw new Error('La base véhicules unifiée est invalide.');
    }

    const modelesByMarque = Object.fromEntries(
      marques.map((marque) => [marque.nom, Array.isArray(marque.modeles) ? marque.modeles : []])
    );

    return { marques, modelesByMarque };
  }

  async function loadManifest() {
    return loadJson('manifest.json');
  }

  global.dbLoader = { loadManifest, loadMarques, loadAppData };
})(window);
