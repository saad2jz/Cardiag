export function initializePwa() {
  const installButton = document.getElementById('installAppBtn');
  const status = document.getElementById('installAppStatus');
  const updateBanner = document.getElementById('pwaUpdateBanner');
  const updateTitle = document.getElementById('pwaUpdateTitle');
  const updateText = document.getElementById('pwaUpdateText');
  const updateReload = document.getElementById('pwaUpdateReload');
  const updateDismiss = document.getElementById('pwaUpdateDismiss');
  let installPrompt = null;
  let updateAvailable = false;

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isAppleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isEnglish = () => document.documentElement.lang === 'en';

  const renderUpdateMessage = () => {
    if (!updateBanner || !updateAvailable) return;
    const english = isEnglish();
    updateTitle.textContent = english ? 'Update available' : 'Nouvelle version disponible';
    updateText.textContent = english
      ? 'Reload CarDiag to use the latest improvements.'
      : 'Rechargez CarDiag pour profiter des dernières améliorations.';
    updateReload.textContent = english ? 'Update' : 'Mettre à jour';
    updateDismiss.setAttribute('aria-label', english ? 'Close update notification' : 'Fermer la notification de mise à jour');
  };

  const showUpdate = () => {
    if (sessionStorage.getItem('cardiag_pwa_update_dismissed') === '1') return;
    updateAvailable = true;
    renderUpdateMessage();
    updateBanner?.removeAttribute('hidden');
  };

  updateReload?.addEventListener('click', () => window.location.reload());
  updateDismiss?.addEventListener('click', () => {
    sessionStorage.setItem('cardiag_pwa_update_dismissed', '1');
    updateBanner?.setAttribute('hidden', '');
  });
  window.addEventListener('cardiag:language-change', renderUpdateMessage);

  installButton?.setAttribute('hidden', '');
  if (!isStandalone() && isAppleDevice) {
    setStatus('Sur iPhone/iPad : dans Safari, touchez Partager puis « Sur l’écran d’accueil ».');
  }

  if (isStandalone()) {
    installButton?.setAttribute('hidden', '');
    setStatus('Application installée. Vos fiches restent disponibles hors ligne.');
  }

  if ('serviceWorker' in navigator) {
    // Évite qu'un cache HTTP intermédiaire retarde le téléchargement du
    // service worker qui porte une mise à jour de l'application.
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        const watchInstallingWorker = () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate();
          });
        };
        watchInstallingWorker();
        registration.addEventListener('updatefound', watchInstallingWorker);
        return registration.update();
      })
      .catch(() => setStatus('Le mode hors ligne est indisponible. Vérifiez que l’application est ouverte en HTTPS.'));
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    installButton?.removeAttribute('hidden');
    setStatus('Application prête à être installée sur cet appareil.');
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    installButton?.setAttribute('hidden', '');
    setStatus('Application installée : elle est disponible hors ligne.');
  });

  installButton?.addEventListener('click', async () => {
    if (!installPrompt) {
      setStatus(isAppleDevice
        ? 'Dans Safari : Partager > Sur l’écran d’accueil.'
        : 'Dans le navigateur : ouvrez le menu puis choisissez Installer l’application.');
      return;
    }

    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    installPrompt = null;
    installButton?.setAttribute('hidden', '');
    setStatus(choice.outcome === 'accepted' ? 'Installation en cours…' : 'Installation annulée.');
  });
}
