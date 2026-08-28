/**
 * ELM327 OBD-II protocol handler.
 *
 * Pure protocol logic — zero network calls, zero Bluetooth dependency.
 * Receives a `transport` object with `write(cmd)` and `read(timeout)` methods.
 *
 * Supports:
 *  - AT initialisation sequence
 *  - Mode 03 (stored DTC) and Mode 07 (pending DTC) reading
 *  - Hex-to-standard DTC parsing (P/C/B/U + 4 digits)
 */

/** Maps the two high bits of the first DTC nibble to a category letter. */
const DTC_PREFIX = { '00': 'P', '01': 'C', '10': 'B', '11': 'U' };

/**
 * Convert two raw bytes (4 hex chars) into a standard DTC string.
 *
 * Byte layout (OBD-II SAE J1979):
 *   bits [15-14] → category (P/C/B/U)
 *   bits [13-12] → second char (0-3)
 *   bits [11-8]  → third char (0-F)
 *   bits [7-4]   → fourth char (0-F)
 *   bits [3-0]   → fifth char (0-F)
 *
 * @param {string} highByte - e.g. "03"
 * @param {string} lowByte  - e.g. "01"
 * @returns {string|null} e.g. "P0301" or null if padding (0000)
 */
export function parseRawDTC(highByte, lowByte) {
  const high = parseInt(highByte, 16);
  const low = parseInt(lowByte, 16);
  if (Number.isNaN(high) || Number.isNaN(low)) return null;
  if (high === 0 && low === 0) return null; // padding

  const categoryBits = `${(high >> 6) & 1}${(high >> 7) & 1 ? '1' : '0'}`;
  // Correct bit extraction: bits 15-14 from the high byte
  const bit15 = (high >> 7) & 1;
  const bit14 = (high >> 6) & 1;
  const prefix = DTC_PREFIX[`${bit15}${bit14}`] || 'P';

  const secondChar = ((high >> 4) & 0x03).toString(16).toUpperCase();
  const thirdChar = (high & 0x0F).toString(16).toUpperCase();
  const fourthChar = ((low >> 4) & 0x0F).toString(16).toUpperCase();
  const fifthChar = (low & 0x0F).toString(16).toUpperCase();

  return `${prefix}${secondChar}${thirdChar}${fourthChar}${fifthChar}`;
}

/**
 * Parse a raw OBD-II response frame into an array of DTC codes.
 *
 * The response may contain multiple lines, each prefixed with "43 " (mode 03)
 * or "47 " (mode 07). Each line carries up to 3 DTCs as 2-byte pairs.
 *
 * @param {string} rawResponse - full text response from ELM327
 * @param {string} [modePrefix='43'] - expected line prefix
 * @returns {string[]} array of DTC codes, e.g. ["P0301", "P0171"]
 */
export function parseDTCResponse(rawResponse, modePrefix = '43') {
  if (!rawResponse) return [];

  const codes = [];
  const lines = String(rawResponse)
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    // Strip spaces for uniform handling
    const cleaned = line.replace(/\s+/g, '').toUpperCase();

    // Must start with the mode-response prefix (43 for mode 03, 47 for mode 07)
    if (!cleaned.startsWith(modePrefix.toUpperCase())) continue;

    // Remaining bytes after the mode prefix
    const payload = cleaned.slice(modePrefix.length);

    // Each DTC is 2 bytes = 4 hex chars
    for (let i = 0; i + 3 < payload.length; i += 4) {
      const highByte = payload.slice(i, i + 2);
      const lowByte = payload.slice(i + 2, i + 4);
      const code = parseRawDTC(highByte, lowByte);
      if (code && !codes.includes(code)) codes.push(code);
    }
  }

  return codes;
}

/**
 * Clean an ELM327 response: remove echo, empty lines, and the trailing prompt.
 * @param {string} raw
 * @returns {string}
 */
function cleanResponse(raw) {
  return String(raw || '')
    .replace(/>/g, '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n');
}

// ─── ELM327 session ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} Transport
 * @property {(command: string) => Promise<void>} write
 * @property {(timeoutMs?: number) => Promise<string>} read
 */

/**
 * Create an ELM327 session from a transport (e.g. Bluetooth SPP).
 *
 * @param {Transport} transport
 * @returns {Promise<ELM327Session>}
 */
export async function createSession(transport) {
  const DEFAULT_TIMEOUT = 5000;

  async function sendCommand(cmd, timeout = DEFAULT_TIMEOUT) {
    await transport.write(`${cmd}\r`);
    const raw = await transport.read(timeout);
    return cleanResponse(raw);
  }

  /** Verify an AT command response contains 'OK' or expected echo. */
  async function sendAT(cmd, timeout = DEFAULT_TIMEOUT) {
    const response = await sendCommand(cmd, timeout);
    if (!response.includes('OK') && !response.toUpperCase().includes(cmd.replace(/\s/g, '').toUpperCase())) {
      console.warn(`[ELM327] Unexpected response for ${cmd}:`, response);
    }
    return response;
  }

  // ── Initialisation sequence ──
  // ATZ can take up to 3 seconds
  const resetResponse = await sendCommand('ATZ', 6000);
  if (!resetResponse.toUpperCase().includes('ELM') && !resetResponse.includes('OK')) {
    throw new Error(`L'adaptateur ne répond pas comme un ELM327. Réponse : ${resetResponse.slice(0, 80)}`);
  }

  await sendAT('ATE0');   // Echo off
  await sendAT('ATL0');   // Linefeed off
  await sendAT('ATSP0');  // Auto protocol detection

  /** @type {ELM327Session} */
  const session = {
    /**
     * Read stored DTCs (Mode 03).
     * @returns {Promise<string[]>}
     */
    async readStoredDTCs() {
      const response = await sendCommand('03', 8000);
      if (response.toUpperCase().includes('NO DATA') || response.toUpperCase().includes('UNABLE TO CONNECT')) {
        return [];
      }
      return parseDTCResponse(response, '43');
    },

    /**
     * Read pending DTCs (Mode 07).
     * @returns {Promise<string[]>}
     */
    async readPendingDTCs() {
      const response = await sendCommand('07', 8000);
      if (response.toUpperCase().includes('NO DATA') || response.toUpperCase().includes('UNABLE TO CONNECT')) {
        return [];
      }
      return parseDTCResponse(response, '47');
    },

    /**
     * Read both stored and pending DTCs, deduplicated.
     * @returns {Promise<{ stored: string[], pending: string[], all: string[] }>}
     */
    async readAllDTCs() {
      const stored = await this.readStoredDTCs();
      const pending = await this.readPendingDTCs();
      const all = [...new Set([...stored, ...pending])];
      return { stored, pending, all };
    },

    /**
     * Query a single Mode 01 PID.
     * @param {string} pidHex - 4 chars, e.g. "010C"
     * @param {number} [timeout=800] - tight timeout for polling loop
     * @returns {Promise<string>} raw response
     */
    async queryPID(pidHex, timeout = 800) {
      const cmd = pidHex.toUpperCase();
      return sendCommand(cmd, timeout);
    },

    /**
     * Discover supported PIDs by querying Mode 01 PID bitmasks (0100, 0120, 0140).
     * @param {string[]} [knownPids] - optional list of target PIDs to filter against
     * @returns {Promise<string[]>} list of supported PID codes (e.g. ["010C", "010D", ...])
     */
    async discoverSupportedPids(knownPids = []) {
      const { parseSupportedPidsBitmask } = await import('./pid-table.js');
      const supported = new Set();

      // Query 0100 (PIDs 01..20)
      try {
        const res00 = await sendCommand('0100', 3000);
        const set00 = parseSupportedPidsBitmask(res00, 0x00);
        set00.forEach((p) => supported.add(p));

        // If PID 0120 is supported (bit 32), query next block 21..40
        if (set00.has('0120')) {
          const res20 = await sendCommand('0120', 3000);
          const set20 = parseSupportedPidsBitmask(res20, 0x20);
          set20.forEach((p) => supported.add(p));

          // If PID 0140 is supported, query next block 41..60
          if (set20.has('0140')) {
            const res40 = await sendCommand('0140', 3000);
            const set40 = parseSupportedPidsBitmask(res40, 0x40);
            set40.forEach((p) => supported.add(p));
          }
        }
      } catch (err) {
        console.warn('[ELM327] PID discovery query failed, falling back to standard list:', err);
      }

      const allFound = Array.from(supported);
      if (!allFound.length) {
        // Fallback if ECU doesn't return bitmask cleanly: return key standard ones
        return knownPids.length ? knownPids : ['010C', '010D', '0105', '0104', '0111'];
      }

      if (knownPids.length) {
        return knownPids.filter((p) => supported.has(p));
      }
      return allFound;
    },

    /**
     * Read vehicle VIN (Mode 09 PID 02).
     * @returns {Promise<string|null>}
     */
    async readVIN() {
      try {
        const response = await sendCommand('0902', 5000);
        return parseVinResponse(response);
      } catch (err) {
        console.warn('[ELM327] VIN read failed:', err);
        return null;
      }
    },

    /**
     * Read I/M readiness status and MIL lamp (Mode 01 PID 01).
     * @returns {Promise<Object|null>}
     */
    async readIMMonitors() {
      try {
        const response = await sendCommand('0101', 3000);
        return parseIMMonitorsResponse(response);
      } catch (err) {
        console.warn('[ELM327] I/M monitors read failed:', err);
        return null;
      }
    },

    /**
     * Close session gracefully.
     */
    async close() {
      try { await sendCommand('ATZ', 3000); } catch { /* ignore close errors */ }
    },
  };

  return session;
}

/**
 * Parse Mode 09 PID 02 VIN response from ELM327.
 * Response is split across frames with prefix "49 02 [frame_number]".
 * Hex bytes represent ASCII characters of the 17-character VIN.
 *
 * @param {string} rawResponse
 * @returns {string|null} 17-character VIN or null
 */
export function parseVinResponse(rawResponse) {
  if (!rawResponse) return null;
  const lines = String(rawResponse)
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim().replace(/\s+/g, '').toUpperCase())
    .filter((l) => l.includes('4902'));

  let hexChars = '';
  for (const line of lines) {
    const idx = line.indexOf('4902');
    if (idx === -1) continue;
    // Skip '4902' + 2 chars of sequence number
    const payload = line.slice(idx + 6);
    hexChars += payload;
  }

  // Convert hex to ASCII
  let vin = '';
  for (let i = 0; i + 1 < hexChars.length; i += 2) {
    const code = parseInt(hexChars.slice(i, i + 2), 16);
    if (code >= 32 && code <= 126) {
      vin += String.fromCharCode(code);
    }
  }

  // Clean and validate 17-character standard VIN (A-Z, 0-9 without I, O, Q)
  const cleanVin = vin.replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase();
  const match = cleanVin.match(/[A-HJ-NPR-Z0-9]{17}/);
  return match ? match[0] : (cleanVin.length >= 11 ? cleanVin.slice(0, 17) : null);
}

/**
 * Parse Mode 01 PID 01 Inspection/Maintenance (I/M) Readiness status.
 *
 * @param {string} rawResponse
 * @returns {{ milOn: boolean, dtcCount: number, readyCount: number, notReadyCount: number, monitors: Object } | null}
 */
export function parseIMMonitorsResponse(rawResponse) {
  if (!rawResponse) return null;
  const cleaned = String(rawResponse).replace(/\s+/g, '').toUpperCase();
  const idx = cleaned.indexOf('4101');
  if (idx === -1) return null;

  const payload = cleaned.slice(idx + 4);
  if (payload.length < 8) return null;

  const A = parseInt(payload.slice(0, 2), 16);
  const B = parseInt(payload.slice(2, 4), 16);
  const C = parseInt(payload.slice(4, 6), 16);
  const D = parseInt(payload.slice(6, 8), 16);

  const milOn = (A & 0x80) !== 0;
  const dtcCount = A & 0x7F;

  // Monitor tests status
  const monitors = {};

  // Continuous monitors (Byte B)
  // Misfire: Bit 0 supported, Bit 4 ready (0 = complete/ready)
  if ((B & 0x01) !== 0) monitors.misfire = (B & 0x10) === 0 ? 'ready' : 'not_ready';
  // Fuel system: Bit 1 supported, Bit 5 ready
  if ((B & 0x02) !== 0) monitors.fuelSystem = (B & 0x20) === 0 ? 'ready' : 'not_ready';
  // Comprehensive components: Bit 2 supported, Bit 6 ready
  if ((B & 0x04) !== 0) monitors.components = (B & 0x40) === 0 ? 'ready' : 'not_ready';

  // Non-continuous monitors (Byte C & D)
  // Catalyst: Byte C bit 0 supported, Byte D bit 0 ready
  if ((C & 0x01) !== 0) monitors.catalyst = (D & 0x01) === 0 ? 'ready' : 'not_ready';
  // Heated catalyst: Byte C bit 1 supported, Byte D bit 1 ready
  if ((C & 0x02) !== 0) monitors.heatedCatalyst = (D & 0x02) === 0 ? 'ready' : 'not_ready';
  // Evaporative system: Byte C bit 2 supported, Byte D bit 2 ready
  if ((C & 0x04) !== 0) monitors.evap = (D & 0x04) === 0 ? 'ready' : 'not_ready';
  // Oxygen sensor: Byte C bit 5 supported, Byte D bit 5 ready
  if ((C & 0x20) !== 0) monitors.o2Sensor = (D & 0x20) === 0 ? 'ready' : 'not_ready';
  // EGR / VVT: Byte C bit 7 supported, Byte D bit 7 ready
  if ((C & 0x80) !== 0) monitors.egr = (D & 0x80) === 0 ? 'ready' : 'not_ready';

  let readyCount = 0;
  let notReadyCount = 0;
  for (const status of Object.values(monitors)) {
    if (status === 'ready') readyCount++;
    if (status === 'not_ready') notReadyCount++;
  }

  return { milOn, dtcCount, readyCount, notReadyCount, monitors };
}



