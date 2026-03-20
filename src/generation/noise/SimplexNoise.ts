import { PRNG } from './PRNG';

/**
 * 2D Simplex noise with deterministic permutation table seeded from PRNG.
 */
export class SimplexNoise {
  readonly #perm: Uint8Array;
  readonly #grad: ReadonlyArray<[number, number]> = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];

  constructor(rng: PRNG) {
    // Build a seeded permutation table (256 entries, doubled for wrapping)
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Fisher-Yates shuffle with deterministic PRNG
    for (let i = 255; i > 0; i--) {
      const j = rng.nextInt(0, i);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    this.#perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.#perm[i] = p[i & 255];
    }
  }

  /** Returns noise value in approximately [-1, 1] for 2D coordinates. */
  noise2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

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
      i1 = 1; j1 = 0;
    } else {
      i1 = 0; j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      const gi0 = this.#perm[ii + this.#perm[jj]] % 8;
      n0 = t0 * t0 * (this.#grad[gi0][0] * x0 + this.#grad[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      const gi1 = this.#perm[ii + i1 + this.#perm[jj + j1]] % 8;
      n1 = t1 * t1 * (this.#grad[gi1][0] * x1 + this.#grad[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      const gi2 = this.#perm[ii + 1 + this.#perm[jj + 1]] % 8;
      n2 = t2 * t2 * (this.#grad[gi2][0] * x2 + this.#grad[gi2][1] * y2);
    }

    // Scale to approximately [-1, 1]
    return 70 * (n0 + n1 + n2);
  }

  /** Multi-octave fractal noise. Returns values in approximately [-1, 1]. */
  fbm(x: number, y: number, octaves: number, frequency: number): number {
    let value = 0;
    let freq = frequency;
    let amp = 1;
    let maxAmp = 0;
    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * freq, y * freq) * amp;
      maxAmp += amp;
      freq *= 2;
      amp *= 0.5;
    }
    return value / maxAmp;
  }
}
