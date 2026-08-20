import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { translateUiText } from '../js/i18n/i18n.js';

test('tous les intitulés visibles des points de contrôle ont une traduction anglaise', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const labels = [...html.matchAll(/<span class="t">([^<]+)<\/span>/g)]
    .map((match) => match[1].replaceAll('&amp;', '&').trim());
  assert.equal(labels.length, 32);
  labels.forEach((label) => assert.notEqual(translateUiText(label, 'en'), label, `Traduction manquante : ${label}`));
  assert.notEqual(translateUiText("Historique d'entretien disponible ?", 'en'), "Historique d'entretien disponible ?");
});
