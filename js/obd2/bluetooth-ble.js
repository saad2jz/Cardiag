/**
 * Bluetooth Low Energy (BLE) Transport Layer for ELM327 OBD2 Adapters.
 *
 * Supports Web Bluetooth API (Chrome, Android, Edge, Opera) and iOS BLE wrappers.
 * Covers standard ELM327 BLE services:
 *  - Custom HM-10 / CC2541 Service: 0xFFE0 (Char: 0xFFE1)
 *  - Nordic UART Service (NUS): 6E400001-B5A3-F393-E0A9-E50E24DCCA9E
 *  - Standard OBD2 BLE Service: 0x18F0 / 0xFFF0
 */

const BLE_SERVICES = [
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / Vgate iCar BLE
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART
  '0000fff0-0000-1000-8000-00805f9b34fb', // Veepeak BLE
  0xffe0,
  0xfff0,
  0x18f0,
];

export class BluetoothBleTransport {
  constructor() {
    this.device = null;
    this.server = null;
    this.writeChar = null;
    this.readChar = null;
    this.rxBuffer = '';
    this.readResolvers = [];
  }

  /**
   * Check if Web Bluetooth or native BLE is available.
   * @returns {boolean}
   */
  isAvailable() {
    return Boolean(navigator.bluetooth);
  }

  /**
   * Request pairing with a nearby BLE OBD2 adapter.
   * @returns {Promise<BluetoothDevice>}
   */
  async requestDevice() {
    if (!this.isAvailable()) {
      throw new Error('Web Bluetooth non supporté sur ce navigateur.');
    }

    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: 'OBD' },
        { namePrefix: 'V-LINK' },
        { namePrefix: 'IOS-VLINK' },
        { namePrefix: 'VEEPEAK' },
        { namePrefix: 'Carista' },
        { namePrefix: 'Viecar' },
      ],
      optionalServices: BLE_SERVICES,
    });

    this.device = device;
    return device;
  }

  /**
   * Connect to GATT server and discover RX/TX characteristics.
   */
  async connect() {
    if (!this.device) await this.requestDevice();

    this.server = await this.device.gatt.connect();

    // Try discovering standard ELM327 BLE service
    let service = null;
    for (const sUuid of BLE_SERVICES) {
      try {
        service = await this.server.getPrimaryService(sUuid);
        if (service) break;
      } catch { /* try next */ }
    }

    if (!service) {
      throw new Error('Service OBD2 BLE non trouvé sur ce périphérique.');
    }

    const characteristics = await service.getCharacteristics();
    for (const char of characteristics) {
      if (char.properties.notify || char.properties.indicate) {
        this.readChar = char;
        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', (e) => this._onData(e));
      }
      if (char.properties.write || char.properties.writeWithoutResponse) {
        this.writeChar = char;
      }
    }

    if (!this.writeChar) {
      this.writeChar = this.readChar; // Some devices use same characteristic for RX/TX
    }
  }

  _onData(event) {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const chunk = decoder.decode(value);
    this.rxBuffer += chunk;

    if (this.rxBuffer.includes('>')) {
      const parts = this.rxBuffer.split('>');
      const complete = parts[0];
      this.rxBuffer = parts.slice(1).join('>');

      if (this.readResolvers.length) {
        const resolve = this.readResolvers.shift();
        resolve(complete);
      }
    }
  }

  /**
   * Send AT or OBD2 command over BLE and await prompt.
   * @param {string} cmd
   * @param {number} [timeoutMs=4000]
   * @returns {Promise<string>}
   */
  async sendCommand(cmd, timeoutMs = 4000) {
    if (!this.writeChar) throw new Error('BLE non connecté');

    const encoder = new TextEncoder();
    const data = encoder.encode(cmd.trim() + '\r');

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout BLE commande : ${cmd}`));
      }, timeoutMs);

      this.readResolvers.push((res) => {
        clearTimeout(timer);
        resolve(res);
      });

      this.writeChar.writeValue(data).catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  disconnect() {
    if (this.server?.connected) {
      this.server.disconnect();
    }
    this.device = null;
    this.server = null;
  }
}

export const btBle = new BluetoothBleTransport();
