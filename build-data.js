(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.buildData = api.buildData;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function buildData(payload) {
    const marques = payload?.marques || [];
    const byMarque = payload?.modelesByMarque || {};

    return marques.map((marque) => {
      const modeles = Array.isArray(byMarque[marque.nom]) ? byMarque[marque.nom] : [];

      return {
        nom: marque.nom,
        modeles: modeles
          .map((modele) => ({
            nom: String(modele.nom || modele.name || '').trim(),
            generations: Array.isArray(modele.generations) ? modele.generations : [],
            annees: modele.annees || '',
            motorisations: Array.isArray(modele.motorisations) ? modele.motorisations : [],
          }))
          .filter((modele) => modele.nom),
      };
    });
  }

  return { buildData };
});
