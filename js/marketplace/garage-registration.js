import { authClient } from '../auth/firebase-client.js';

document.getElementById('garageRegistration')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.getElementById('garageRegistrationStatus');
  const button = form.querySelector('button');
  button.disabled = true;
  status.textContent = 'Envoi…';
  try {
    const payload = Object.fromEntries(new FormData(form));
    await authClient.initialize().catch(() => null);
    const token = await authClient.getIdToken().catch(() => '');
    const response = await fetch('/api/garages/applications', {
      method:'POST',
      headers:{ 'content-type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) },
      body:JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    form.reset();
    status.textContent = token
      ? 'Merci. Votre candidature est enregistrée ; ce compte pourra gérer le premium après validation du garage.'
      : 'Merci. Votre candidature est enregistrée et sera vérifiée avant publication.';
  } catch (error) {
    status.textContent = error.message || 'Envoi impossible.';
  } finally {
    button.disabled = false;
  }
});
