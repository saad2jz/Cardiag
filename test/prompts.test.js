import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildChatInstructions, formatCarContext } from '../src/prompts.js';

const vehicle = {
  marque: 'Renault',
  modele: 'Clio',
  annee: '2020',
  motorisation: '1.5 dCi',
};

test('each usage scenario receives dedicated diagnostic instructions', () => {
  const expectations = {
    buyer: /PARCOURS ACHETEUR.*négociation/is,
    mechanic: /PARCOURS GARAGISTE.*plainte exacte/is,
    rental: /PARCOURS AGENCE DE LOCATION.*kilométrage/is,
    seller: /PARCOURS VENDEUR.*transparent/is,
    owner: /PARCOURS PROPRIÉTAIRE.*vérifications visuelles/is,
  };

  for (const [usageScenario, expected] of Object.entries(expectations)) {
    assert.match(buildChatInstructions({ ...vehicle, usageScenario }), expected);
  }
});

test('an unknown scenario safely falls back to the buyer workflow', () => {
  assert.match(buildChatInstructions({ ...vehicle, usageScenario: 'invalid' }), /PARCOURS ACHETEUR/);
  assert.match(formatCarContext({ ...vehicle, usageScenario: '<script>' }), /&lt;script&gt;/);
});

test('English interface forces every AI response field to English', () => {
  assert.match(
    buildChatInstructions({ ...vehicle, usageScenario: 'owner', language: 'en' }),
    /réponds intégralement en anglais.*champs JSON.*suggestions/is,
  );
});
