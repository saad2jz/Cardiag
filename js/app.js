import { initializeLegacyFeatures } from './legacy-features.js?v=20260807-2';
import { initializeChatExperience } from './chat-experience.js?v=20260807-2';
import { initializePwa } from './pwa.js?v=20260807-2';

/**
 * Application entry point. Data loading stays separate from the UI controller
 * so the latter never embeds or mutates the unified vehicle database.
 */
async function initializeApp() {
  const status = document.getElementById('result');
  try {
    if (!window.dbLoader?.loadAppData || !window.buildData) {
      throw new Error('Le chargeur de donnees n’est pas disponible.');
    }
    const payload = await window.dbLoader.loadAppData();
    const vehicles = window.buildData(payload);
    initializeLegacyFeatures(vehicles);
    initializeChatExperience();
    initializePwa();
  } catch (error) {
    console.error('Erreur app.js:', error);
    if (status) status.textContent = `Le chargement a echoue : ${error.message}`;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
} else {
  initializeApp();
}
