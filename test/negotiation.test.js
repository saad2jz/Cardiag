import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNegotiation } from '../js/reports/negotiation.js';

const base = {
  data: { usage_scenario: 'buyer', valeur: 20_000, frais_estimation: 600 },
  points: [],
};

test('buyer and seller negotiation margins increase when the documented condition worsens', () => {
  const healthy = calculateNegotiation({ ...base, score: 90 });
  const damaged = calculateNegotiation({
    ...base,
    score: 48,
    points: [
      { status: 'defaut', category: 'vital', weight: 5, label: 'Fuite moteur' },
      { status: 'defaut', category: 'chassis', weight: 3, label: 'Freinage' },
    ],
  });
  const seller = calculateNegotiation({ ...base, data: { ...base.data, usage_scenario: 'seller' }, score: 70 });

  assert.ok(healthy.amount >= 600);
  assert.ok(damaged.amount > healthy.amount);
  assert.equal(damaged.targetPrice, 20_000 - damaged.amount);
  assert.match(damaged.label, /Réduction conseillée/);
  assert.ok(seller.amount > 0);
});

test('negotiation is not added to mechanic or owner reports', () => {
  assert.equal(calculateNegotiation({ ...base, data: { ...base.data, usage_scenario: 'mechanic' }, score: 60 }), null);
  assert.equal(calculateNegotiation({ ...base, data: { ...base.data, usage_scenario: 'owner' }, score: 60 }), null);
});
