const $ = (id) => document.getElementById(id);
const text = (node, value) => { node.textContent = value ?? '—'; };
const API_BASE = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? `${location.origin}/`
  : 'https://fiche-expert-auto.onrender.com/';
const euro = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && String(value).trim() ? `${amount.toLocaleString('fr-FR')} €` : '—';
};

function statusLabel(status) {
  return status === 'ok' ? 'OK' : status === 'moyen' ? 'MOYEN' : status === 'defaut' ? 'DÉFAUT' : 'NON VÉRIFIÉ';
}

// Render serves /r/:token directly, while static hosting restores that path
// through /shared-report.html?token=:token. Accept both canonical entrypoints.
function sharedReportId() {
  const queryToken = new URLSearchParams(location.search).get('token');
  const pathToken = location.pathname.split('/').filter(Boolean).pop() || '';
  const token = queryToken || pathToken;
  return /^[A-Za-z0-9_-]{20,80}$/.test(token) ? token : '';
}

async function load() {
  try {
    const id = sharedReportId();
    if (!id) throw new Error('Rapport indisponible');
    const response = await fetch(`${API_BASE}api/shared-reports/${encodeURIComponent(id)}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Rapport indisponible');
    const report = payload.report;

    document.body.dataset.theme = report.branding?.theme || 'carbon';
    text($('brand').querySelector('strong'), report.branding?.workshopName || 'CarDiag');
    if (report.branding?.logo) {
      const logo = document.createElement('img');
      logo.src = report.branding.logo;
      $('brand').querySelector('span').replaceWith(logo);
    }
    text($('vehicleTitle'), report.title);
    text($('vehicleMeta'), [report.vehicle?.annee, report.vehicle?.motorisation, report.vehicle?.kilometrage && `${report.vehicle.kilometrage} km`, report.vehicle?.vin].filter(Boolean).join(' · '));
    if (report.mainPhoto?.dataUrl) {
      $('vehiclePhoto').src = report.mainPhoto.dataUrl;
      $('vehiclePhoto').hidden = false;
    }
    text($('decision'), report.verdictLabel);
    $('decision').className = `decision ${report.verdict || 'pending'}`;
    text($('scoreValue'), report.score == null ? '—' : `${report.score}%`);
    $('scoreDonut').style.setProperty('--score', report.score || 0);
    text($('summaryText'), report.summary || 'Aucune synthèse consignée.');
    text($('verified'), `${report.done} / ${report.total} points vérifiés`);

    $('categories').replaceChildren(...(report.categories || []).map((category) => {
      const row = document.createElement('div');
      const label = document.createElement('span');
      const weight = document.createElement('small');
      const track = document.createElement('i');
      const bar = document.createElement('b');
      const score = document.createElement('strong');
      label.textContent = `${String(category.label || '').split(' (')[0]} `;
      weight.textContent = `×${category.weight}`;
      label.append(weight);
      bar.style.width = `${Math.max(0, Math.min(100, Number(category.score) || 0))}%`;
      track.append(bar);
      score.textContent = category.score == null ? '—' : `${category.score}%`;
      row.append(label, track, score);
      return row;
    }));

    const groups = Object.groupBy
      ? Object.groupBy(report.points || [], (point) => point.sectionLabel)
      : (report.points || []).reduce((result, point) => ((result[point.sectionLabel] ||= []).push(point), result), {});
    $('points').replaceChildren(...Object.entries(groups).map(([section, points]) => {
      const block = document.createElement('article');
      const title = document.createElement('h3');
      title.textContent = section;
      block.append(title, ...points.map((point) => {
        const row = document.createElement('div');
        row.className = 'point';
        const label = document.createElement('span');
        label.textContent = point.label;
        const status = document.createElement('strong');
        status.className = ['ok', 'moyen', 'defaut'].includes(point.status) ? point.status : 'pending';
        status.textContent = statusLabel(point.status);
        row.append(label, status);
        return row;
      }));
      return block;
    }));

    const budget = [
      ['Valeur affichée', euro(report.budget?.valeur)],
      ['Remise en état', euro(report.budget?.frais)],
      ['Négociation suggérée', report.budget?.marge || '—'],
      ['Budget max', euro(report.budget?.budgetMax)],
    ];
    $('budget').replaceChildren(...budget.map(([label, value]) => {
      const row = document.createElement('div');
      const itemLabel = document.createElement('span');
      itemLabel.textContent = label;
      const itemValue = document.createElement('strong');
      itemValue.textContent = value;
      row.append(itemLabel, itemValue);
      return row;
    }));
    text($('expiry'), `Lien valable jusqu’au ${new Date(payload.expiresAt).toLocaleDateString('fr-FR')}.`);
  } catch (error) {
    $('error').hidden = false;
    text($('error'), error.message);
    document.querySelectorAll('main>section').forEach((section) => { section.hidden = true; });
  }
}

load();
