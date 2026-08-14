import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const outputDirectory = new URL('../icons/', import.meta.url);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  typeBuffer.copy(header, 4);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([header, typeBuffer, data, checksum]);
}

function createIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const color = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];
  const ink = color('#0A1830');
  const steel = color('#4778AC');
  const white = color('#EAF0FA');
  const green = color('#1B8F58');
  const gold = color('#E9C46A');
  const setPixel = (x, y, rgba) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const offset = (y * size + x) * 4;
    pixels.set(rgba, offset);
  };
  const rectangle = (x, y, width, height, rgba) => {
    for (let py = Math.max(0, y); py < Math.min(size, y + height); py += 1) {
      for (let px = Math.max(0, x); px < Math.min(size, x + width); px += 1) setPixel(px, py, rgba);
    }
  };
  const circle = (cx, cy, radius, rgba) => {
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) setPixel(x, y, rgba);
      }
    }
  };

  rectangle(0, 0, size, size, ink);
  const unit = size / 512;
  rectangle(112 * unit, 278 * unit, 288 * unit, 70 * unit, steel);
  rectangle(142 * unit, 222 * unit, 228 * unit, 56 * unit, steel);
  rectangle(120 * unit, 348 * unit, 272 * unit, 56 * unit, white);
  rectangle(170 * unit, 364 * unit, 172 * unit, 40 * unit, ink);
  circle(184 * unit, 350 * unit, 23 * unit, green);
  circle(328 * unit, 350 * unit, 23 * unit, green);
  rectangle(231 * unit, 82 * unit, 50 * unit, 46 * unit, gold);
  rectangle(203 * unit, 105 * unit, 106 * unit, 22 * unit, gold);

  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    rows[y * (size * 4 + 1)] = 0;
    pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(outputDirectory, { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(new URL(`app-icon-${size}.png`, outputDirectory), createIcon(size));
}
