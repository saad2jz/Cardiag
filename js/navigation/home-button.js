function isNativePlatform() {
  return Boolean(globalThis.Capacitor?.isNativePlatform?.());
}

/**
 * Adds a persistent CarDiag home action to the application toolbar.
 * It returns to the signed-in dashboard, never to the public marketing page.
 */
export function initializeHomeButton() {
  const header = document.getElementById('wizardHeader');
  if (!header || header.querySelector('[data-cardiag-home]')) return;

  const button = document.createElement('button');
  button.className = 'home-trigger';
  button.type = 'button';
  button.dataset.cardiagHome = '';
  button.setAttribute('aria-label', 'CarDiag, accueil');
  button.title = 'Accueil CarDiag';
  button.innerHTML = '<img src="icons/app-icon.svg" alt="" aria-hidden="true"><span>CarDiag</span>';

  button.addEventListener('click', () => {
    if (!isNativePlatform() && window.cardiagRouter?.navigate) {
      window.cardiagRouter.navigate({ kind: 'dashboard' });
      return;
    }
    // Native builds do not have a public landing route; keep the existing
    // safe wizard fallback there without clearing the current inspection.
    window.cardiagWizard?.goToStep?.(1, 'back');
  });

  window.addEventListener('cardiag:language-change', (event) => {
    const english = event.detail?.language === 'en';
    button.setAttribute('aria-label', english ? 'CarDiag, home' : 'CarDiag, accueil');
    button.title = english ? 'CarDiag home' : 'Accueil CarDiag';
  });

  header.append(button);
}
