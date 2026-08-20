import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeLocalProfile, validateProfileContact } from '../js/onboarding/profile-onboarding.js';
import { translateUiText } from '../js/i18n/i18n.js';

test('professional profile is normalized as a mechanic workshop', () => {
  const profile = normalizeLocalProfile({
    type: 'professional',
    role: 'buyer',
    garageName: '  Atelier Central  ',
    contactName: ' Camille ',
    siret: '123 456 789 012 34',
  });

  assert.equal(profile.type, 'professional');
  assert.equal(profile.role, 'mechanic');
  assert.equal(profile.garageName, 'Atelier Central');
  assert.equal(profile.contactName, 'Camille');
  assert.equal(profile.siret, '12345678901234');
});

test('rental agency profile keeps its fleet role and normalized fleet metadata', () => {
  const profile = normalizeLocalProfile({
    type: 'professional', professionalKind: 'rental', role: 'mechanic', fleetSize: ' 125 vehicles ', fleetReference: ' PARIS-NORD ',
  });
  assert.equal(profile.professionalKind, 'rental');
  assert.equal(profile.role, 'rental');
  assert.equal(profile.fleetSize, '125');
  assert.equal(profile.fleetReference, 'PARIS-NORD');
});

test('personal profile keeps a supported vehicle-report goal', () => {
  assert.equal(normalizeLocalProfile({ type: 'personal', role: 'seller' }).role, 'seller');
  assert.equal(normalizeLocalProfile({ type: 'personal', role: 'unknown' }).role, 'owner');
});

test('interface dictionary translates vehicle workflow labels both ways', () => {
  assert.equal(translateUiText('Identification du véhicule', 'en'), 'Vehicle identification');
  assert.equal(translateUiText('Châssis requis', 'en'), 'Chassis required');
  assert.equal(translateUiText('Personnaliser CarDiag', 'en'), 'Customize CarDiag');
  assert.equal(translateUiText('Vehicle identification', 'fr'), 'Identification du véhicule');
});

test('profile contact validation detects reversed email and phone fields', () => {
  assert.deepEqual(validateProfileContact('dgxhj', 'client@gmail.com'), {
    valid: false, code: 'swapped', field: 'email',
  });
});

test('profile contact validation accepts common French and international formats', () => {
  assert.equal(validateProfileContact('client@example.com', '06 12 34 56 78').valid, true);
  assert.equal(validateProfileContact('garage@example.fr', '+33 (0)1 44 55 66 77').valid, true);
});

test('profile contact validation rejects malformed contact details', () => {
  assert.equal(validateProfileContact('client', '06 12 34 56 78').code, 'email');
  assert.equal(validateProfileContact('client@example.com', 'telephone').code, 'phone');
});
