import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseVinResponse, parseIMMonitorsResponse } from '../js/obd2/elm327-protocol.js';
import { parseRegistrationText } from '../js/wizard/registration-scanner.js';
import { DEFECT_COST_MATRIX } from '../js/score/repair-estimator.js';

// ─── 1. OBD2 Mode 09 VIN Parsing ────────────────────────────────────────────

test('parseVinResponse extracts 17-character VIN from multi-frame Mode 0902 responses', () => {
  // Typical ELM327 Mode 0902 response with ASCII characters in hex
  // "VF1" (56 46 31) "BB0A0F" (42 42 30 41 30 46) "1234567" (31 32 33 34 35 36 37)
  const rawResponse = `
    49 02 01 00 00 00 31
    49 02 02 56 46 31 42
    49 02 03 42 30 41 30
    49 02 04 46 31 32 33
    49 02 05 34 35 36 37
  `;
  const vin = parseVinResponse(rawResponse);
  assert.equal(vin, '1VF1BB0A0F1234567');
  assert.equal(vin.length, 17);
});

test('parseVinResponse safely returns null on malformed or empty responses', () => {
  assert.equal(parseVinResponse('NO DATA'), null);
  assert.equal(parseVinResponse('49 02 01 00'), null);
  assert.equal(parseVinResponse(''), null);
});

// ─── 2. OBD2 Mode 0101 I/M Readiness Monitors ───────────────────────────────

test('parseIMMonitorsResponse correctly decodes MIL status and monitor readiness', () => {
  // 41 01 82 07 E5 00
  // Byte A = 82 -> MIL is ON (bit 7), 2 DTCs
  // Byte B = 07 -> continuous monitors supported (bit 0,1,2), all ready (bit 4,5,6 = 0)
  // Byte C = E5 -> catalyst (bit 0), evap (bit 2), o2 (bit 5), egr (bit 7) supported
  // Byte D = 00 -> all supported non-continuous monitors are completed/ready
  const raw = '41 01 82 07 E5 00';
  const im = parseIMMonitorsResponse(raw);

  assert.ok(im);
  assert.equal(im.milOn, true, 'MIL should be ON');
  assert.equal(im.dtcCount, 2, 'DTC count should be 2');
  assert.equal(im.monitors.misfire, 'ready');
  assert.equal(im.monitors.fuelSystem, 'ready');
  assert.equal(im.monitors.catalyst, 'ready');
  assert.equal(im.monitors.o2Sensor, 'ready');
  assert.equal(im.monitors.egr, 'ready');
});

test('parseIMMonitorsResponse flags incomplete monitors as not_ready', () => {
  // Byte D has bit 0 set (1 = not ready for catalyst)
  const raw = '41 01 00 07 01 01';
  const im = parseIMMonitorsResponse(raw);

  assert.ok(im);
  assert.equal(im.milOn, false, 'MIL should be OFF');
  assert.equal(im.monitors.catalyst, 'not_ready');
  assert.equal(im.notReadyCount, 1);
});

// ─── 3. Registration Certificate (Carte Grise) OCR Parsing ──────────────────

test('parseRegistrationText extracts standard French Carte Grise metadata', () => {
  const ocrSample = `
    RÉPUBLIQUE FRANÇAISE
    CERTIFICAT D'IMMATRICULATION
    (A) FG-842-KM
    (B) 14/06/2019
    (D.1) PEUGEOT
    (D.2) 208 PURETECH 100
    (E) VF3CCHMK0KT019283
    (P.3) ES
    (P.6) 5
  `;

  const parsed = parseRegistrationText(ocrSample);

  assert.equal(parsed.immatriculation, 'FG-842-KM');
  assert.equal(parsed.dateMec, '14/06/2019');
  assert.equal(parsed.annee, '2019');
  assert.equal(parsed.marque, 'PEUGEOT');
  assert.equal(parsed.vin, 'VF3CCHMK0KT019283');
  assert.equal(parsed.carburant, 'Essence');
  assert.equal(parsed.puissanceFiscale, '5');
});

test('parseRegistrationText gracefully extracts partial fields if document is noisy', () => {
  const partial = 'CARTE GRISE RENAULT CLIO VF15R240H12345678 DATE 22/10/2017 DIESEL GO';
  const parsed = parseRegistrationText(partial);

  assert.equal(parsed.marque, 'RENAULT');
  assert.equal(parsed.vin, 'VF15R240H12345678');
  assert.equal(parsed.annee, '2017');
  assert.equal(parsed.carburant, 'Diesel');
});

// ─── 4. Repair Cost Estimator Matrix ────────────────────────────────────────

test('DEFECT_COST_MATRIX covers key mechanical checkpoints and major DTC fault codes', () => {
  assert.ok(DEFECT_COST_MATRIX.freinage.defaut > 0);
  assert.ok(DEFECT_COST_MATRIX.pneus.defaut > 0);
  assert.ok(DEFECT_COST_MATRIX.vitesses.defaut >= 500, 'Clutch / transmission repair should be priced realistically');
  assert.ok(DEFECT_COST_MATRIX.P0420.cost >= 400, 'Catalyst DTC should have significant cost estimate');
  assert.ok(DEFECT_COST_MATRIX.P0299.cost >= 600, 'Turbo underboost DTC should account for turbocharger repair');
});

// ─── 5. Paint Thickness Classification ──────────────────────────────────────

test('classifyPaintThickness correctly categorizes original paint, respray, and filler', async () => {
  const { classifyPaintThickness, PANELS } = await import('../js/wizard/paint-thickness-profiler.js');

  assert.equal(classifyPaintThickness(110), 'factory', '110 µm is standard factory paint');
  assert.equal(classifyPaintThickness(85), 'factory', '85 µm is factory paint');
  assert.equal(classifyPaintThickness(190), 'respray', '190 µm is a resprayed panel');
  assert.equal(classifyPaintThickness(350), 'filler', '350 µm indicates body filler / mastic');
  assert.equal(classifyPaintThickness(0), 'unknown');
  assert.ok(PANELS.length >= 10, 'Should cover all major vehicle panels');
});

// ─── 6. BLE Transport Module ────────────────────────────────────────────────

test('Bluetooth BLE transport exposes standard connection interface', async () => {
  const { btBle, BluetoothBleTransport } = await import('../js/obd2/bluetooth-ble.js');

  assert.ok(btBle instanceof BluetoothBleTransport);
  assert.equal(typeof btBle.isAvailable, 'function');
  assert.equal(typeof btBle.sendCommand, 'function');
  assert.equal(typeof btBle.disconnect, 'function');
});

