/**
 * Generate PWA placeholder icons for Bok.
 * Pure Node.js — no external dependencies.
 *
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');

/** CRC32 lookup table */
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crcVal = crc32(crcInput);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuffer, data, crcBuf]);
}

// Simple 4x7 bitmap glyphs for B, O, K
const glyphs = {
  B: [
    [1, 1, 1, 0],
    [1, 0, 0, 1],
    [1, 1, 1, 0],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 1, 1, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [0, 1, 1, 0],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
  ],
  K: [
    [1, 0, 0, 1],
    [1, 0, 1, 0],
    [1, 1, 0, 0],
    [1, 1, 0, 0],
    [1, 0, 1, 0],
    [1, 0, 0, 1],
    [0, 0, 0, 0],
  ],
};

function createPng(size) {
  const bgR = 0x2c, bgG = 0x1e, bgB = 0x16; // #2c1e16
  const fgR = 0xfd, fgG = 0xf6, fgB = 0xe3; // #fdf6e3

  const pixelScale = Math.max(1, Math.floor(size / 32));
  const charW = 4 * pixelScale;
  const charH = 7 * pixelScale;
  const gap = pixelScale;
  const textW = charW * 3 + gap * 2;
  const startX = Math.floor((size - textW) / 2);
  const startY = Math.floor((size - charH) / 2);

  // Raw pixel data: filter byte + RGB per pixel, per row
  const rawRowLen = 1 + size * 3;
  const rawData = Buffer.alloc(rawRowLen * size);

  const letters = ['B', 'O', 'K'];

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rawRowLen;
    rawData[rowOffset] = 0; // filter: None

    for (let x = 0; x < size; x++) {
      const pixOffset = rowOffset + 1 + x * 3;

      let isFg = false;
      for (let li = 0; li < 3; li++) {
        const lx = startX + li * (charW + gap);
        if (x >= lx && x < lx + charW && y >= startY && y < startY + charH) {
          const gx = Math.floor((x - lx) / pixelScale);
          const gy = Math.floor((y - startY) / pixelScale);
          if (gx < 4 && gy < 7 && glyphs[letters[li]][gy][gx]) {
            isFg = true;
            break;
          }
        }
      }

      if (isFg) {
        rawData[pixOffset] = fgR;
        rawData[pixOffset + 1] = fgG;
        rawData[pixOffset + 2] = fgB;
      } else {
        rawData[pixOffset] = bgR;
        rawData[pixOffset + 1] = bgG;
        rawData[pixOffset + 2] = bgB;
      }
    }
  }

  const compressed = deflateSync(rawData);

  // PNG file structure
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const png = createPng(size);
  const outPath = resolve(publicDir, `pwa-${size}x${size}.png`);
  writeFileSync(outPath, png);
  console.log(`Generated ${outPath} (${png.length} bytes)`);
}

console.log('PWA icons generated successfully.');
