import { authClient } from '../auth/firebase-client.js?v=20260902-3';

const status = document.getElementById('adminStatus');
const garages = document.getElementById('adminGarages');
const reviews = document.getElementById('adminReviews');

function escapeHtml(value) {
  const node = document.createElement('span');
  node.textContent = String(value || '');
  return node.innerHTML;
}

function garageUrl(garage) {
  const slug = String(garage?.slug || garage?.id || '').trim();
  return slug ? `/garages/${encodeURIComponent(slug)}` : '';
}

async function api(path, options) {
  return authClient.api(`/api/admin/${path}`, options);
}

async function refresh() {
  try {
    const [garageData, reviewData] = await Promise.all([
      api('garages?status=pending'),
      api('garage-reviews?status=pending'),
    ]);
    garages.innerHTML = garageData.garages.length
      ? garageData.garages.map((garage) => `<article class="admin-item"><strong>${escapeHtml(garage.name)}</strong><p>${escapeHtml(garage.city)} · ${escapeHtml(garage.email)}</p><button type="button" data-garage="${garage.id}" data-status="active">Publier</button><button type="button" data-garage="${garage.id}" data-status="rejected">Rejeter</button></article>`).join('')
      : '<p>Aucune candidature en attente.</p>';
    reviews.innerHTML = reviewData.reviews.length
      ? reviewData.reviews.map((review) => `<article class="admin-item"><strong>${review.rating}/5 · ${escapeHtml(review.authorName)}</strong><p>${escapeHtml(review.comment)}</p><button type="button" data-review="${review.id}" data-status="published">Publier</button><button type="button" data-review="${review.id}" data-status="rejected">Rejeter</button></article>`).join('')
      : '<p>Aucun avis en attente.</p>';
    status.textContent = 'Administration prête.';
  } catch (error) {
    status.textContent = error.message || 'Accès administrateur refusé.';
  }
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-garage],[data-review]');
  if (!button) return;
  button.disabled = true;
  try {
    if (button.dataset.garage) {
      const result = await api(`garages/${encodeURIComponent(button.dataset.garage)}/status`, {
        method: 'PATCH', body: JSON.stringify({ status: button.dataset.status }),
      });
      // A published garage gets a real public URL immediately. Pending and
      // rejected actions remain on this moderation page deliberately.
      if (button.dataset.status === 'active') {
        const url = garageUrl(result.garage);
        if (url) {
          status.textContent = 'Garage publié. Redirection vers sa fiche…';
          window.location.assign(url);
          return;
        }
      }
    } else {
      await api(`garage-reviews/${encodeURIComponent(button.dataset.review)}/status`, {
        method: 'PATCH', body: JSON.stringify({ status: button.dataset.status }),
      });
    }
    await refresh();
  } catch (error) {
    status.textContent = error.message || 'Action impossible.';
    button.disabled = false;
  }
});

document.getElementById('adminGarageForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"], button:not([type])');
  button.disabled = true;
  status.textContent = 'Création du garage…';
  try {
    const result = await api('garages', {
      method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    form.reset();
    if (result.garage?.status === 'active') {
      const url = garageUrl(result.garage);
      if (url) {
        status.textContent = 'Garage créé. Redirection vers sa fiche…';
        window.location.assign(url);
        return;
      }
    }
    status.textContent = 'Garage enregistré en attente de compléments.';
    await refresh();
  } catch (error) {
    status.textContent = error.message || 'Création impossible.';
  } finally {
    button.disabled = false;
  }
});

await authClient.initialize();
if (!authClient.user) {
  status.textContent = 'Connectez-vous avec un compte administrateur pour continuer.';
} else {
  await refresh();
}
