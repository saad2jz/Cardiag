function isNativePlatform() {
  return Boolean(globalThis.Capacitor?.isNativePlatform?.());
}

/**
 * Adds a persistent CarDiag home action to the wizard toolbar.
 * Opening home never resets the active report or the current form values.
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
      window.cardiagRouter.navigate('/');
      return;
    }
    if (!isNativePlatform() && window.cardiagLanding?.show) {
      window.cardiagLanding.show();
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      return;
    }
    window.cardiagWizard?.goToStep?.(1, 'back');
  });

  window.addEventListener('cardiag:language-change', (event) => {
    const english = event.detail?.language === 'en';
    button.setAttribute('aria-label', english ? 'CarDiag, home' : 'CarDiag, accueil');
    button.title = english ? 'CarDiag home' : 'Accueil CarDiag';
  });

  header.append(button);
}
