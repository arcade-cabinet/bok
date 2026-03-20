/**
 * Deterministic PRNG using xmur3 hash for seeding and sfc32 for generation.
 * Supports forking: each subsystem gets its own PRNG from the same master seed.
 */
export class PRNG {
  #a: number;
  #b: number;
  #c: number;
  #d: number;

  constructor(seed: string) {
    const hash = xmur3(seed);
    this.#a = hash();
    this.#b = hash();
    this.#c = hash();
    this.#d = hash();
  }

  /** Returns a float in [0, 1). */
  next(): number {
    // sfc32
    this.#a >>>= 0;
    this.#b >>>= 0;
    this.#c >>>= 0;
    this.#d >>>= 0;
    let t = (this.#a + this.#b) | 0;
    this.#a = this.#b ^ (this.#b >>> 9);
    this.#b = (this.#c + (this.#c << 3)) | 0;
    this.#c = (this.#c << 21) | (this.#c >>> 11);
    this.#d = (this.#d + 1) | 0;
    t = (t + this.#d) | 0;
    this.#c = (this.#c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] inclusive. */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns a float in [min, max). */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /** Create an independent child PRNG by combining parent seed context with a subsystem name. */
  fork(name: string): PRNG {
    // Generate a deterministic sub-seed from current state + name
    const subSeed = `${this.#a}:${this.#b}:${this.#c}:${this.#d}:${name}`;
    return new PRNG(subSeed);
  }
}

/** xmur3 hash: converts a string seed into a 32-bit state generator. */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
