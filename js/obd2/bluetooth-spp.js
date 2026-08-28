/**
 * Bluetooth Classic (SPP/RFCOMM) wrapper for Capacitor Android.
 *
 * Abstracts away the concrete Capacitor Bluetooth Serial plugin behind a
 * uniform transport interface consumed by elm327-protocol.js.
 *
 * This module is designed to fail gracefully on platforms where Bluetooth
 * Classic is unavailable (iOS, web, Android without the plugin or permission).
 * It never throws user-visible errors on its own — the caller decides what to show.
 */

let _plugin = null;

/**
 * Try to resolve the Bluetooth Serial Capacitor plugin.
 * Returns null silently on any platform where it isn't available.
 */
function resolvePlugin() {
  if (_plugin) return _plugin;
  try {
    // The plugin registers itself on Capacitor.Plugins or via a global.
    // Support both common patterns from community plugins.
    const cap = window.Capacitor;
    if (!cap) return null;
    _plugin = cap.Plugins?.BluetoothSerial
      ?? cap.Plugins?.BluetoothClassic
      ?? cap.Plugins?.BluetoothCommunication
      ?? null;
  } catch { /* swallow */ }
  return _plugin;
}

/**
 * Whether Bluetooth SPP scanning is available on this device.
 *
 * Returns true only on Android with the Bluetooth Serial plugin loaded.
 */
export function isAvailable() {
  try {
    const platform = window.Capacitor?.getPlatform?.();
    return platform === 'android' && resolvePlugin() !== null;
  } catch {
    return false;
  }
}

/**
 * Request Bluetooth runtime permissions using the app's permission explainer pattern.
 *
 * @returns {Promise<boolean>} true if all required permissions were granted
 */
export async function requestPermissions() {
  if (!isAvailable()) return false;

  // Delegate to the app-level permission helper if available (matches the
  // pre-prompt pattern used for camera and notifications).
  if (typeof window.cardiagPermissions?.bluetooth === 'function') {
    return window.cardiagPermissions.bluetooth();
  }

  // Fallback: ask the plugin directly (no pre-prompt explainer).
  const plugin = resolvePlugin();
  if (!plugin) return false;
  try {
    // Most community plugins expose a checkPermissions/requestPermissions pair.
    if (typeof plugin.requestPermissions === 'function') {
      const result = await plugin.requestPermissions();
      // Exact shape varies; we accept any truthy value as "granted".
      return Boolean(result?.granted ?? result?.bluetooth ?? result);
    }
    // If the plugin has no permission API, assume granted (manifest-only).
    return true;
  } catch (error) {
    console.warn('[BT-SPP] Permission request failed:', error);
    return false;
  }
}

/**
 * List paired Bluetooth devices.
 *
 * @returns {Promise<Array<{ name: string, address: string }>>}
 */
export async function listPairedDevices() {
  const plugin = resolvePlugin();
  if (!plugin) return [];
  try {
    // Plugin API variations
    const raw = await (plugin.listBondedDevices?.() ?? plugin.getPairedDevices?.() ?? plugin.list?.());
    if (!raw) return [];
    const devices = Array.isArray(raw) ? raw : (raw.devices ?? raw.bondedDevices ?? []);
    return devices.map((d) => ({
      name: d.name || d.deviceName || 'Appareil inconnu',
      address: d.address || d.macAddress || d.id || '',
    })).filter((d) => d.address);
  } catch (error) {
    console.warn('[BT-SPP] Could not list paired devices:', error);
    return [];
  }
}

/**
 * Start discovery of nearby Bluetooth devices.
 *
 * @param {{ durationMs?: number }} opts
 * @returns {Promise<Array<{ name: string, address: string }>>}
 */
export async function discoverDevices({ durationMs = 12000 } = {}) {
  const plugin = resolvePlugin();
  if (!plugin) return [];
  try {
    if (typeof plugin.startDiscovery === 'function') {
      await plugin.startDiscovery();
      await new Promise((r) => setTimeout(r, durationMs));
      if (typeof plugin.stopDiscovery === 'function') await plugin.stopDiscovery();
      const raw = await (plugin.getDiscoveredDevices?.() ?? plugin.list?.());
      const devices = Array.isArray(raw) ? raw : (raw?.devices ?? []);
      return devices.map((d) => ({
        name: d.name || d.deviceName || 'Appareil inconnu',
        address: d.address || d.macAddress || d.id || '',
      })).filter((d) => d.address);
    }
    // If no discovery API, just return paired devices.
    return listPairedDevices();
  } catch (error) {
    console.warn('[BT-SPP] Discovery failed:', error);
    return listPairedDevices();
  }
}

// ─── Connection & transport ─────────────────────────────────────────────────

let _connected = false;

/**
 * Connect to a Bluetooth SPP device.
 *
 * @param {string} address — MAC address
 * @returns {Promise<void>}
 */
export async function connect(address) {
  const plugin = resolvePlugin();
  if (!plugin) throw new Error('Plugin Bluetooth non disponible.');
  await (plugin.connect?.({ address }) ?? plugin.connectToDevice?.({ macAddress: address }));
  _connected = true;
}

/**
 * Disconnect from the current Bluetooth SPP device.
 */
export async function disconnect() {
  const plugin = resolvePlugin();
  if (!plugin || !_connected) return;
  try { await (plugin.disconnect?.() ?? plugin.disconnectFromDevice?.()); } catch { /* swallow */ }
  _connected = false;
}

/**
 * Whether we are currently connected.
 */
export function isConnected() {
  return _connected;
}

/**
 * Write a string to the connected device.
 *
 * @param {string} data
 */
export async function write(data) {
  const plugin = resolvePlugin();
  if (!plugin || !_connected) throw new Error('Non connecté.');
  await (plugin.write?.({ data }) ?? plugin.send?.({ data }) ?? plugin.sendData?.({ data }));
}

/**
 * Read data from the connected device until the ELM327 prompt '>' is received
 * or a timeout is reached.
 *
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<string>}
 */
export async function readUntilPrompt(timeoutMs = 5000) {
  const plugin = resolvePlugin();
  if (!plugin || !_connected) throw new Error('Non connecté.');

  let buffer = '';
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const result = await Promise.race([
        plugin.read?.() ?? plugin.readData?.() ?? plugin.receiveData?.(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), Math.max(100, deadline - Date.now()))),
      ]);
      const chunk = typeof result === 'string' ? result : (result?.data ?? result?.value ?? '');
      buffer += chunk;
      if (buffer.includes('>')) return buffer;
    } catch (error) {
      if (error?.message === 'timeout') break;
      throw error;
    }
  }

  // Return whatever we collected even on timeout — the caller's parser
  // may still find useful data in a partial response.
  return buffer;
}

/**
 * Build a transport object compatible with elm327-protocol.js.
 *
 * @returns {{ write: (cmd: string) => Promise<void>, read: (timeout?: number) => Promise<string> }}
 */
export function createTransport() {
  return {
    write,
    read: readUntilPrompt,
  };
}
