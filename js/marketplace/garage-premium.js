import { authClient } from '../auth/firebase-client.js?v=20260902-3';

const panel = document.getElementById('garagePremiumManager');

function render(garage, configured) {
  const active = Boolean(garage.premium?.active);
  const periodEnd = garage.premium?.currentPeriodEnd
    ? new Date(garage.premium.currentPeriodEnd).toLocaleDateString('fr-FR')
    : '';
  const disabled = configured ? '' : ' disabled';
  panel.hidden = false;
  panel.innerHTML = `
    <h2>Visibilité premium</h2>
    <p>${active ? `Votre garage est actuellement recommandé dans l’annuaire${periodEnd ? ` jusqu’au ${periodEnd}` : ''}.` : 'Mettez votre garage en avant dans l’annuaire avec le badge « Recommandé ». Le référencement standard reste gratuit.'}</p>
    ${active ? `<button type="button" data-garage-portal${disabled}>Gérer mon abonnement</button>` : `<button type="button" data-garage-checkout${disabled}>Passer premium</button>`}
    ${configured ? '' : '<p class="garage-premium-note">La facturation premium sera disponible prochainement.</p>'}
    <p data-garage-premium-status role="status"></p>`;
}

async function openStripe(path, garageId, button) {
  const status = panel.querySelector('[data-garage-premium-status]');
  button.disabled = true;
  status.textContent = 'Redirection sécurisée vers Stripe…';
  try {
    const payload = await authClient.api(path, { method:'POST', body:JSON.stringify({ garageId }) });
    if (!payload.url) throw new Error('Stripe n’a pas renvoyé de lien.');
    window.location.assign(payload.url);
  } catch (error) {
    status.textContent = error.message || 'Ouverture de Stripe impossible.';
    button.disabled = false;
  }
}

async function initializePremiumManager() {
  if (!panel) return;
  const garageId = String(panel.dataset.garageId || '');
  if (!garageId) return;
  try {
    await authClient.initialize();
    if (!authClient.user) return;
    const result = await authClient.api(`/api/account/garages/${encodeURIComponent(garageId)}/premium`);
    render(result.garage, result.configured);
    panel.querySelector('[data-garage-checkout]')?.addEventListener('click', (event) => openStripe('/api/account/billing/checkout', garageId, event.currentTarget));
    panel.querySelector('[data-garage-portal]')?.addEventListener('click', (event) => openStripe('/api/account/billing/portal', garageId, event.currentTarget));
  } catch (error) {
    // A non-manager must not be told who owns the garage. The public page
    // remains entirely usable and the private manager area stays hidden.
    panel.hidden = true;
  }
}

initializePremiumManager();
