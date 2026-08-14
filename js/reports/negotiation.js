function roundToFifty(value) {
  return Math.max(0, Math.round(Number(value || 0) / 50) * 50);
}

function formatEuro(value, locale = 'fr-FR') {
  return `${Number(value || 0).toLocaleString(locale)} €`;
}

/**
 * Deterministic negotiation estimate. It never invents a repair price:
 * the condition score sets a conservative percentage and the user-entered
 * repair estimate remains the minimum reduction to request.
 */
export function calculateNegotiation(model, locale = 'fr-FR') {
  const data = model?.data || {};
  const scenario = data.usage_scenario || 'buyer';
  if (!['buyer', 'seller'].includes(scenario)) return null;

  const price = Math.max(0, Number(data.valeur) || 0);
  const repairs = Math.max(0, Number(data.frais_estimation) || 0);
  const score = Number.isFinite(model?.score) ? model.score : null;
  const points = Array.isArray(model?.points) ? model.points : [];
  const defects = points.filter((point) => point.status === 'defaut');
  const warnings = points.filter((point) => point.status === 'moyen');
  const vitalDefects = defects.filter((point) => point.category === 'vital');

  if (!price) {
    return {
      amount: 0,
      targetPrice: 0,
      rate: 0,
      arguments: defects.slice(0, 4).map((point) => point.label),
      label: locale.startsWith('en')
        ? 'Enter the advertised price to calculate a condition-based negotiation range.'
        : 'Renseignez le prix affiché pour calculer une marge de négociation basée sur l’état.',
    };
  }

  const scoreRate = score == null ? 0.05 : score >= 85 ? 0.02 : score >= 70 ? 0.05 : score >= 55 ? 0.08 : 0.12;
  const conditionRate = Math.min(0.10, vitalDefects.length * 0.025 + (defects.length - vitalDefects.length) * 0.012 + warnings.length * 0.004);
  const rate = Math.min(0.25, scoreRate + conditionRate);
  const amount = Math.min(roundToFifty(price * 0.35), roundToFifty(Math.max(repairs, price * rate)));
  const targetPrice = Math.max(0, price - amount);
  const argumentsList = defects
    .slice()
    .sort((a, b) => Number(b.weight || 0) - Number(a.weight || 0))
    .slice(0, 4)
    .map((point) => point.label);

  const label = locale.startsWith('en')
    ? `Suggested reduction: ${formatEuro(amount, 'en-GB')} (${Math.round((amount / price) * 100)}%); target price: ${formatEuro(targetPrice, 'en-GB')}.`
    : `Réduction conseillée : ${formatEuro(amount)} (${Math.round((amount / price) * 100)} %) ; prix cible : ${formatEuro(targetPrice)}.`;

  return { amount, targetPrice, rate: amount / price, arguments: argumentsList, label };
}
