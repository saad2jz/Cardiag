import assert from 'node:assert/strict';
import { test } from 'node:test';
import { comparisonPath, inspectionPath, newInspectionPath, parseRoute, routePath } from '../js/navigation/router.js';

test('legacy profile and level query parameters resolve to the stateless creation route', () => {
  const route = parseRoute('https://cardiag.online/?niveau=complet&profil=acheteur');
  assert.deepEqual(route, {
    kind: 'new-inspection', app: true, profile: 'acheteur', level: 'complet', legacy: true,
  });
  assert.equal(routePath(route), '/app/inspection/nouveau');

  const levelOnly = parseRoute('https://cardiag.online/?niveau=complet');
  assert.equal(routePath(levelOnly), '/app/inspection/nouveau');
});

test('new inspections are stateless while existing inspection routes remain explicit', () => {
  assert.equal(newInspectionPath('owner', 'complete'), '/app/inspection/nouveau');
  assert.deepEqual(parseRoute('/app/nouvelle/garagiste/rapide/identification'), {
    kind: 'new-inspection', app: true, profile: 'garagiste', level: 'rapide', legacy: true,
  });
  assert.equal(inspectionPath('t123', 'controle', 'moteur'), '/app/inspection/t123/controle/moteur');
  assert.deepEqual(parseRoute('/app/inspection/t123/controle/moteur'), {
    kind: 'inspection', app: true, id: 't123', view: 'controle', section: 'moteur',
  });
});

test('legacy fiche links and app utilities preserve their intended boundaries', () => {
  assert.equal(routePath(parseRoute('/fiche/t123')), '/app/inspection/t123/rapport');
  assert.deepEqual(parseRoute('/app/comparer?ids=t123,t456,t123'), { kind: 'compare', app: true, ids: ['t123', 't456'] });
  assert.equal(comparisonPath(['t123', 't456']), '/app/comparer?ids=t123%2Ct456');
  assert.equal(parseRoute('/app/parametres').kind, 'settings');
  assert.equal(parseRoute('/r/a-very-private-share-token').kind, 'shared-report');
  assert.equal(parseRoute('/app/inspection/%3Cbad%3E/rapport').kind, 'not-found');
});

test('GitHub Pages recovery restores deep application routes from its 404 document', () => {
  const recovered = parseRoute('https://cardiag.online/?_r=%2Fapp%2Fnouvelle%2Fproprietaire%2Fcomplet%2Fdiagnostic');
  assert.deepEqual(recovered, {
    kind: 'new-inspection', app: true, profile: 'proprietaire', level: 'complet', legacy: true,
  });
  assert.deepEqual(parseRoute('https://cardiag.online/?_r=%2Fexemple-rapport'), {
    kind: 'demo-report', app: false, legacy: true,
  });
});

test('the production static host keeps protected browser URLs canonical', async () => {
  const originalLocation = globalThis.location;
  const originalHistory = globalThis.history;
  const pushes = [];
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { hostname: 'cardiag.online', pathname: '/', search: '' } });
  Object.defineProperty(globalThis, 'history', { configurable: true, value: { pushState: (_state, _title, path) => pushes.push(path) } });
  const { navigate } = await import(`../js/navigation/router.js?transport=${Date.now()}`);
  navigate({ kind: 'new-inspection', profile: 'acheteur', level: 'complet' });
  assert.equal(pushes[0], '/app/inspection/nouveau');
  Object.defineProperty(globalThis, 'location', { configurable: true, value: originalLocation });
  Object.defineProperty(globalThis, 'history', { configurable: true, value: originalHistory });
});
