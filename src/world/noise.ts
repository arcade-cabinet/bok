/**
 * Deterministic PRNG and 2D Simplex noise for procedural world generation.
 * Ported from the original box.html POC.
 */

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function sfc32(a: number, b: number, c: number, d: number): () => number {
  return function () {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const t2 = (t + d) | 0;
    c = (c + t2) | 0;
    return (t2 >>> 0) / 4294967296;
  };
}

const Perm = new Uint8Array(512);

export function initNoise(seedStr: string): void {
  const seedFunc = xmur3(seedStr);
  const rand = sfc32(seedFunc(), seedFunc(), seedFunc(), seedFunc());
  for (let i = 0; i < 256; i++) Perm[i] = Math.floor(rand() * 256);
  for (let i = 0; i < 256; i++) Perm[i + 256] = Perm[i];
}

export function noise2D(x: number, y: number): number {
  const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
  const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = x - X0;
  const y0 = y - Y0;
  let i1: number, j1: number;
  if (x0 > y0) {
    i1 = 1;
    j1 = 0;
  } else {
    i1 = 0;
    j1 = 1;
  }
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1.0 + 2.0 * G2;
  const y2 = y0 - 1.0 + 2.0 * G2;
  const ii = i & 255;
  const jj = j & 255;
  let n0: number, n1: number, n2: number;

  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 < 0) {
    n0 = 0.0;
  } else {
    t0 *= t0;
    const h = Perm[ii + Perm[jj]] & 7;
    const u = h < 4 ? x0 : y0;
    const v = h < 4 ? y0 : x0;
    n0 = t0 * t0 * ((h & 1 ? -1 : 1) * u + (h & 2 ? -2 : 2) * v);
  }

  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 < 0) {
    n1 = 0.0;
  } else {
    t1 *= t1;
    const h = Perm[ii + i1 + Perm[jj + j1]] & 7;
    const u = h < 4 ? x1 : y1;
    const v = h < 4 ? y1 : x1;
    n1 = t1 * t1 * ((h & 1 ? -1 : 1) * u + (h & 2 ? -2 : 2) * v);
  }

  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 < 0) {
    n2 = 0.0;
  } else {
    t2 *= t2;
    const h = Perm[ii + 1 + Perm[jj + 1]] & 7;
    const u = h < 4 ? x2 : y2;
    const v = h < 4 ? y2 : x2;
    n2 = t2 * t2 * ((h & 1 ? -1 : 1) * u + (h & 2 ? -2 : 2) * v);
  }

  return 70.0 * (n0 + n1 + n2);
}

// Seed name generator for the title screen
const adjectives = [
  "Brave", "Dark", "Frosty", "Crimson", "Silent", "Lost", "Ancient",
  "Wandering", "Golden", "Mystic", "Shattered", "Ethereal", "Fierce",
  "Radiant", "Shadowy", "Wild",
];
const nouns = [
  "Fox", "Mountain", "River", "Valley", "Keep", "Shadow", "Crown",
  "Stone", "Forest", "Wolf", "Realm", "Abyss", "Spire", "Oak", "Crystal",
];

export function generateRandomSeedString(): string {
  const a1 = adjectives[Math.floor(Math.random() * adjectives.length)];
  let a2 = adjectives[Math.floor(Math.random() * adjectives.length)];
  let attempts = 0;
  while (a1 === a2 && attempts < 20) {
    a2 = adjectives[Math.floor(Math.random() * adjectives.length)];
    attempts++;
  }
  const n = nouns[Math.floor(Math.random() * nouns.length)];
  return `${a1} ${a2} ${n}`;
}
