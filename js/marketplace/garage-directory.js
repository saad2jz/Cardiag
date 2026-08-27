const form = document.getElementById('garageFilters');
const results = document.getElementById('garageResults');
const count = document.getElementById('garageResultCount');
const more = document.getElementById('garageLoadMore');
let cursor = null;
let filters = {};
function escapeHtml(value) { const node = document.createElement('span'); node.textContent = String(value || ''); return node.innerHTML; }
function card(garage) { return `<article class="garage-card"><a href="/garages/${encodeURIComponent(garage.slug)}"><h2>${escapeHtml(garage.name)}</h2><p>${escapeHtml(garage.city)}${garage.postalCode ? ` · ${escapeHtml(garage.postalCode)}` : ''}</p><p>${garage.reviewCount ? `★ ${garage.ratingAverage.toFixed(1)}/5 (${garage.reviewCount} avis)` : 'Pas encore d’avis publié'}</p><p>${escapeHtml((garage.specialties || []).join(' · ') || 'Spécialités à venir')}</p></a></article>`; }
async function load({ append = false } = {}) { const params = new URLSearchParams(filters); if (append && cursor) params.set('cursor', cursor); params.set('limit','12'); count.textContent = 'Chargement…'; try { const response = await fetch(`/api/garages?${params}`); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); if (!append) results.innerHTML = ''; results.insertAdjacentHTML('beforeend', payload.garages.map(card).join('')); if (!results.children.length) results.innerHTML = '<p>Aucun garage actif ne correspond à votre recherche pour le moment.</p>'; cursor = payload.nextCursor; more.hidden = !cursor; count.textContent = `${results.querySelectorAll('.garage-card').length} garage(s) affiché(s)`; } catch (error) { count.textContent = error.message || 'Annuaire indisponible.'; } }
form?.addEventListener('submit', (event) => { event.preventDefault(); filters = Object.fromEntries(new FormData(form)); cursor = null; load(); });
more?.addEventListener('click', () => load({ append:true }));
load();
