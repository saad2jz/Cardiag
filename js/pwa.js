export function initializePwa() {
  const installButton = document.getElementById('installAppBtn');
  const status = document.getElementById('installAppStatus');
  let installPrompt = null;

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {
      setStatus('Le mode hors ligne est indisponible.');
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    if (installButton) installButton.hidden = false;
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    if (installButton) installButton.hidden = true;
    setStatus('Application installée : elle est disponible hors ligne.');
  });

  installButton?.addEventListener('click', async () => {
    if (!installPrompt) {
      setStatus('Dans Chrome : menu ⋮ > Installer l’application. Sur iPhone/iPad : Partager > Sur l’écran d’accueil.');
      return;
    }

    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
    setStatus(choice.outcome === 'accepted' ? 'Installation en cours…' : 'Installation annulée.');
  });
}
