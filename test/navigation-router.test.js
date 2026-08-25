import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspectionPath, newInspectionPath, parseRoute, routePath } from '../js/navigation/router.js';

test('legacy profile and level query parameters resolve to a stable new-inspection route', () => {
  const route = parseRoute('https://cardiag.online/?niveau=complet&profil=acheteur');
  assert.deepEqual(route, {
    kind: 'new-inspection', app: true, profile: 'acheteur', level: 'complet', stage: 'identification', legacy: true,
  });
  assert.equal(routePath(route), '/app/nouvelle/acheteur/complet/identification');

  const levelOnly = parseRoute('https://cardiag.online/?niveau=complet');
  assert.equal(routePath(levelOnly), '/app/nouvelle/acheteur/complet/identification');
});

test('owner routes begin with expert diagnosis while professional and inspection routes stay explicit', () => {
  assert.equal(newInspectionPath('owner', 'complete'), '/app/nouvelle/proprietaire/complet/diagnostic');
  assert.deepEqual(parseRoute('/app/nouvelle/garagiste/rapide/identification'), {
    kind: 'new-inspection', app: true, profile: 'garagiste', level: 'rapide', stage: 'identification',
  });
  assert.equal(inspectionPath('t123', 'controle', 'moteur'), '/app/inspection/t123/controle/moteur');
  assert.deepEqual(parseRoute('/app/inspection/t123/controle/moteur'), {
    kind: 'inspection', app: true, id: 't123', view: 'controle', section: 'moteur',
  });
});

test('legacy fiche links and app utilities preserve their intended boundaries', () => {
  assert.equal(routePath(parseRoute('/fiche/t123')), '/app/inspection/t123/rapport');
  assert.equal(parseRoute('/app/comparer').kind, 'compare');
  assert.equal(parseRoute('/app/parametres').kind, 'settings');
  assert.equal(parseRoute('/r/a-very-private-share-token').kind, 'shared-report');
  assert.equal(parseRoute('/app/inspection/%3Cbad%3E/rapport').kind, 'not-found');
});
