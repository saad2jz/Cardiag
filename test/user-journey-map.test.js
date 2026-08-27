import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { newInspectionPath, parseRoute, routePath } from '../js/navigation/router.js';

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const landing = await readFile(new URL('../js/landing/landing.js', import.meta.url), 'utf8');
const controller = await readFile(new URL('../js/navigation/route-controller.js', import.meta.url), 'utf8');

const journeys = Object.freeze([
  { role: 'buyer', profile: 'acheteur', stage: 'identification' },
  { role: 'seller', profile: 'vendeur', stage: 'identification' },
  { role: 'owner', profile: 'proprietaire', stage: 'diagnostic' },
  { role: 'mechanic', profile: 'garagiste', stage: 'identification' },
  { role: 'rental', profile: 'location', stage: 'identification' },
]);

test('every public journey enters through the same stateless creation URL', () => {
  for (const journey of journeys) {
    assert.match(index, new RegExp(`data-landing-role="${journey.role}"`));
    for (const level of ['rapide', 'complet']) {
      const path = newInspectionPath(journey.profile, level);
      assert.equal(path, '/app/inspection/nouveau');
      const route = parseRoute(path);
      assert.equal(route.kind, 'new-inspection');
      assert.equal(route.app, true);
      assert.equal(route.profile, '');
      assert.equal(route.level, '');
      assert.equal(routePath(route), path);
    }
  }
});

test('public calls to action always save the selected journey before opening authentication', () => {
  assert.match(landing, /rememberAuthReturn\(role, level\)/);
  assert.match(landing, /window\.cardiagOpenAuthentication\(\{ view: 'login' \}\)/);
  assert.match(landing, /enter\(pending\.role \|\| '', pending\.level \|\| ''\)/);
  assert.match(landing, /persistEntryChoice\(role, selectedLevel\)/);
  assert.match(app, /initializeLazyAccountFeature\(\);/);
  assert.match(app, /The landing is immediately interactive/);
});

test('protected routes resume after authentication instead of leaving an unauthenticated user on a blank page', () => {
  for (const path of [
    '/app', '/app/comparer', '/app/parametres',
    '/app/inspection/nouveau',
    '/app/inspection/test_42/identification',
    '/app/inspection/test_42/contexte',
    '/app/inspection/test_42/controle/moteur',
    '/app/inspection/test_42/rapport',
    '/app/inspection/test_42/assistant',
  ]) {
    assert.equal(parseRoute(path).app, true, path);
  }
  assert.match(controller, /cardiagRequireAuthentication/);
  assert.match(controller, /cardiag:authentication-complete/);
  assert.match(controller, /applyRoute\(router\.current\)/);
});

test('public report and legal pages stay public while malformed application URLs fail safely', () => {
  for (const path of ['/exemple-rapport', '/privacy.html', '/terms.html', '/account-deletion.html', '/r/random-token']) {
    assert.equal(parseRoute(path).app, false, path);
  }
  for (const path of ['/app/nouvelle/unknown/complet/identification', '/app/inspection/bad%3Cid%3E/rapport']) {
    assert.equal(parseRoute(path).kind, 'not-found', path);
  }
});
