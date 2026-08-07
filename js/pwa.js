export function initializePwa() {
  const installButton = document.getElementById('installAppBtn');
  const status = document.getElementById('installAppStatus');
  let installPrompt = null;

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  if (isStandalone()) {
    installButton?.setAttribute('hidden', '');
    setStatus('Application installée. Vos fiches restent disponibles hors ligne.');
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => registration.update())
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
      const isAppleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
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
