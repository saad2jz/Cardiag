import assert from 'node:assert/strict';
import { test } from 'node:test';

import { lookupDTC, searchDTCs, describeDTC } from '../js/obd2/dtc-database.js';
import { parseRawDTC, parseDTCResponse } from '../js/obd2/elm327-protocol.js';
import { PID_DEFINITIONS, parsePidResponse, parseSupportedPidsBitmask } from '../js/obd2/pid-table.js';
import { LiveStreamer } from '../js/obd2/live-streamer.js';

// ─── 1. DTC Database tests ──────────────────────────────────────────────────

test('lookupDTC resolves standard powertrain, chassis, body, and network codes', () => {
  assert.equal(lookupDTC('P0301')?.cat, 'powertrain');
  assert.match(lookupDTC('P0301')?.fr, /cylindre 1/i);

  assert.equal(lookupDTC('P1000')?.code, 'P1000');
  assert.match(lookupDTC('P1000')?.fr, /mémoire récemment effacée/i);

  assert.equal(lookupDTC('C0035')?.cat, 'chassis');
  assert.match(lookupDTC('C0035')?.fr, /roue avant gauche/i);

  assert.equal(lookupDTC('B0001')?.cat, 'body');
  assert.match(lookupDTC('B0001')?.fr, /airbag conducteur/i);

  assert.equal(lookupDTC('U0100')?.cat, 'network');
  assert.match(lookupDTC('U0100')?.fr, /module moteur/i);

  assert.equal(lookupDTC('UNKNOWN_CODE'), null);
});

test('searchDTCs returns matching suggestions by code prefix or symptom keyword', () => {
  const byCode = searchDTCs('P03');
  assert.ok(byCode.length >= 4);
  assert.ok(byCode.some((r) => r.code === 'P0300'));
  assert.ok(byCode.some((r) => r.code === 'P0301'));

  const byKeyword = searchDTCs('catalyseur', { language: 'fr' });
  assert.ok(byKeyword.some((r) => r.code === 'P0420'));
});

test('describeDTC supports multilingual descriptions', () => {
  assert.match(describeDTC('P0171', 'fr'), /mélange trop pauvre/i);
  assert.match(describeDTC('P0171', 'en'), /system too lean/i);
});

// ─── 2. ELM327 DTC protocol parsing ─────────────────────────────────────────

test('parseRawDTC correctly extracts SAE category prefixes (P, C, B, U) and nibbles', () => {
  // P0301: High byte 0x03 (00 00 0011 -> P03), Low byte 0x01 (0000 0001 -> 01)
  assert.equal(parseRawDTC('03', '01'), 'P0301');

  // P1000: High byte 0x10 (00 01 0000 -> P10), Low byte 0x00 (0000 0000 -> 00)
  assert.equal(parseRawDTC('10', '00'), 'P1000');

  // C0035: High byte 0x40 (01 00 0000 -> C00), Low byte 0x35 (0011 0101 -> 35)
  assert.equal(parseRawDTC('40', '35'), 'C0035');

  // B0001: High byte 0x80 (10 00 0000 -> B00), Low byte 0x01 (0000 0001 -> 01)
  assert.equal(parseRawDTC('80', '01'), 'B0001');

  // U0100: High byte 0xC1 (11 00 0001 -> U01), Low byte 0x00 (0000 0000 -> 00)
  assert.equal(parseRawDTC('C1', '00'), 'U0100');

  // Padding 0000 returns null
  assert.equal(parseRawDTC('00', '00'), null);
});

test('parseDTCResponse decodes multi-frame Mode 03 & 07 responses and ignores padding', () => {
  const rawMode03 = `
    43 03 01 01 71 00 00
    43 10 00 00 00 00 00
  `;
  const codes03 = parseDTCResponse(rawMode03, '43');
  assert.deepEqual(codes03, ['P0301', 'P0171', 'P1000']);

  const rawMode07 = '47 03 02 00 00 00 00';
  const codes07 = parseDTCResponse(rawMode07, '47');
  assert.deepEqual(codes07, ['P0302']);
});

// ─── 3. PID Definitions & Calculation Formulas ──────────────────────────────

test('all required Mode 01 PIDs are defined with exact conversion formulas', () => {
  const requiredPids = [
    '010C', '010D', '0105', '010B', '0110', '0111',
    '0104', '010E', '0106', '0107', '010F', '012F', '0133',
  ];

  for (const pid of requiredPids) {
    assert.ok(PID_DEFINITIONS[pid], `PID ${pid} doit être défini.`);
    assert.ok(PID_DEFINITIONS[pid].nameFr, `PID ${pid} doit avoir un nom FR.`);
    assert.ok(typeof PID_DEFINITIONS[pid].calculate === 'function', `PID ${pid} doit avoir une formule calculate.`);
  }

  // 010C: RPM = ((A*256)+B)/4 -> A=0x1F, B=0x40 (8000) / 4 = 2000 RPM
  assert.equal(PID_DEFINITIONS['010C'].calculate(0x1F, 0x40), 2000);

  // 010D: Speed = A -> A=0x5A = 90 km/h
  assert.equal(PID_DEFINITIONS['010D'].calculate(0x5A), 90);

  // 0105: Coolant = A-40 -> A=0x82 (130) - 40 = 90 °C
  assert.equal(PID_DEFINITIONS['0105'].calculate(0x82), 90);

  // 010B: Intake Manifold Pressure = A -> A=0x65 = 101 kPa
  assert.equal(PID_DEFINITIONS['010B'].calculate(0x65), 101);

  // 0110: MAF = ((A*256)+B)/100 -> A=0x08, B=0x34 (2100) / 100 = 21 g/s
  assert.equal(PID_DEFINITIONS['0110'].calculate(0x08, 0x34), 21);

  // 0111: Throttle % = A*100/255 -> A=0xFF (255) = 100%
  assert.equal(PID_DEFINITIONS['0111'].calculate(0xFF), 100);

  // 0104: Engine load % = A*100/255 -> A=0x80 (128) = 50%
  assert.equal(PID_DEFINITIONS['0104'].calculate(0x80), 50);

  // 010E: Timing advance = (A/2)-64 -> A=0x80 (128/2 - 64) = 0°
  assert.equal(PID_DEFINITIONS['010E'].calculate(0x80), 0);

  // 0106 / 0107: Fuel trim = (A-128)*100/128 -> A=0x80 = 0% ; A=0x90 (144) = +12.5%
  assert.equal(PID_DEFINITIONS['0106'].calculate(0x80), 0);
  assert.equal(PID_DEFINITIONS['0107'].calculate(0x90), 12.5);

  // 010F: IAT = A-40 -> A=0x46 (70) - 40 = 30 °C
  assert.equal(PID_DEFINITIONS['010F'].calculate(0x46), 30);

  // 012F: Fuel level % = A*100/255 -> A=0xFF = 100%
  assert.equal(PID_DEFINITIONS['012F'].calculate(0xFF), 100);

  // 0133: Baro = A -> A=0x64 = 100 kPa
  assert.equal(PID_DEFINITIONS['0133'].calculate(0x64), 100);
});

test('parsePidResponse extracts and calculates values from raw hex frames', () => {
  // Mode 01 response for RPM: "41 0C 1A F8" -> ((0x1A*256)+0xF8)/4 = 6904 / 4 = 1726 RPM
  const rpm = parsePidResponse('41 0C 1A F8', '010C');
  assert.equal(rpm, 1726);

  // Mode 01 response for Speed: "41 0D 46" -> 70 km/h
  const speed = parsePidResponse('41 0D 46', '010D');
  assert.equal(speed, 70);

  // Coolant temp: "41 05 82" -> 90 °C
  const temp = parsePidResponse('41 05 82', '0105');
  assert.equal(temp, 90);
});

test('parseSupportedPidsBitmask decodes supported PID flags from 0100 response', () => {
  // 0100 bitmask: 41 00 BE 3E B8 11
  // BE (10111110) -> PIDs 01, 03, 04, 05, 06, 07
  // 3E (00111110) -> PIDs 0B, 0C, 0D, 0E, 0F
  // B8 (10111000) -> PIDs 11, 13, 14, 15
  // 11 (00010001) -> PIDs 1C, 20
  const supported = parseSupportedPidsBitmask('41 00 BE 3E B8 11', 0x00);
  assert.ok(supported.has('0104'), 'Engine load supported');
  assert.ok(supported.has('0105'), 'Coolant temp supported');
  assert.ok(supported.has('010C'), 'RPM supported');
  assert.ok(supported.has('010D'), 'Speed supported');
  assert.ok(supported.has('0120'), 'PID 0120 supported');
});

// ─── 4. Live Streamer Export & Session Recording ────────────────────────────

test('LiveStreamer exports session records to structured CSV and JSON', () => {
  const streamer = new LiveStreamer();
  streamer.supportedPids = ['010C', '010D', '0105'];
  streamer.sessionStartTime = Date.now() - 5000;
  streamer.history = [
    { timestamp: 0, dateIso: '2026-08-28T23:00:00.000Z', values: { '010C': 850, '010D': 0, '0105': 88 } },
    { timestamp: 1000, dateIso: '2026-08-28T23:00:01.000Z', values: { '010C': 2100, '010D': 35, '0105': 89 } },
    { timestamp: 2000, dateIso: '2026-08-28T23:00:02.000Z', values: { '010C': 2450, '010D': 60, '0105': 90 } },
  ];

  const csv = streamer.exportToCSV();
  assert.ok(csv.includes('Timestamp_ms'));
  assert.ok(csv.includes('850;0;88'));
  assert.ok(csv.includes('2450;60;90'));

  const json = JSON.parse(streamer.exportToJSON());
  assert.equal(json.sampleCount, 3);
  assert.equal(json.samples[0].values['010C'], 850);
  assert.equal(json.samples[2].values['010D'], 60);
});
