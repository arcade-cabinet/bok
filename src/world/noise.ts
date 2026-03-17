/**
 * Deterministic PRNG and 2D Simplex noise for procedural world generation.
 * Ported from the original box.html POC.
 *
 * Two-layer PRNG architecture:
 *  - worldRng: seeded from the world seed string, deterministic per-world.
 *    Used for terrain, spawns, enemy behavior, and all gameplay-affecting randomness.
 *  - cosmeticRng: seeded from Date.now() at module load, non-deterministic.
 *    Used for particles, screen shake, UI animations — anything purely visual.
 */

export function xmur3(str: string): () => number {
	let h = 1779033703 ^ str.length;
	for (let i = 0; i < str.length; i++) {
		h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
		h = (h << 13) | (h >>> 19);
	}
	return () => {
		h = Math.imul(h ^ (h >>> 16), 2246822507);
		h = Math.imul(h ^ (h >>> 13), 3266489909);
		h ^= h >>> 16;
		return h >>> 0;
	};
}

export function sfc32(a: number, b: number, c: number, d: number): () => number {
	return () => {
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

// ─── Two-layer PRNG ───

/** World PRNG — deterministic per seed. Initialized in initNoise(). */
let _worldRng: (() => number) | null = null;

/** Cosmetic PRNG — non-deterministic, for visual-only randomness. */
let _cosmeticRng: () => number = (() => {
	const s = xmur3(String(Date.now()));
	return sfc32(s(), s(), s(), s());
})();

/** Deterministic per-world random [0,1). Call only after initNoise(). */
export function worldRng(): number {
	if (!_worldRng) throw new Error("worldRng called before initNoise()");
	return _worldRng();
}

/** Non-deterministic cosmetic random [0,1). Safe to call anytime. */
export function cosmeticRng(): number {
	return _cosmeticRng();
}

/** Re-seed cosmetic PRNG (e.g. on title screen load). */
export function reseedCosmetic(seed?: number): void {
	const s = xmur3(String(seed ?? Date.now()));
	_cosmeticRng = sfc32(s(), s(), s(), s());
}

const Perm = new Uint8Array(512);

export function initNoise(seedStr: string): void {
	const seedFunc = xmur3(seedStr);
	const rand = sfc32(seedFunc(), seedFunc(), seedFunc(), seedFunc());

	// Initialize world PRNG from the same seed (but separate stream)
	const wSeed = xmur3(`${seedStr}:world`);
	_worldRng = sfc32(wSeed(), wSeed(), wSeed(), wSeed());

	// Build a true permutation via Fisher-Yates shuffle
	for (let i = 0; i < 256; i++) Perm[i] = i;
	for (let i = 255; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		const tmp = Perm[i];
		Perm[i] = Perm[j];
		Perm[j] = tmp;
	}
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

// ─── 3D Simplex Noise (for cave generation) ───

/** 3D gradient: 12-direction gradient set mapped from hash bits. */
function grad3(hash: number, x: number, y: number, z: number): number {
	const h = hash & 15;
	const u = h < 8 ? x : y;
	const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
	return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/** 3D simplex noise. Returns approximately [-1, 1]. Requires initNoise(). */
export function noise3D(x: number, y: number, z: number): number {
	const F3 = 1.0 / 3.0;
	const G3 = 1.0 / 6.0;
	const s = (x + y + z) * F3;
	const i = Math.floor(x + s);
	const j = Math.floor(y + s);
	const k = Math.floor(z + s);
	const t = (i + j + k) * G3;
	const x0 = x - (i - t);
	const y0 = y - (j - t);
	const z0 = z - (k - t);

	// Determine which simplex (of 6) we're in
	let i1: number, j1: number, k1: number;
	let i2: number, j2: number, k2: number;
	if (x0 >= y0) {
		if (y0 >= z0) {
			i1 = 1;
			j1 = 0;
			k1 = 0;
			i2 = 1;
			j2 = 1;
			k2 = 0;
		} else if (x0 >= z0) {
			i1 = 1;
			j1 = 0;
			k1 = 0;
			i2 = 1;
			j2 = 0;
			k2 = 1;
		} else {
			i1 = 0;
			j1 = 0;
			k1 = 1;
			i2 = 1;
			j2 = 0;
			k2 = 1;
		}
	} else {
		if (y0 < z0) {
			i1 = 0;
			j1 = 0;
			k1 = 1;
			i2 = 0;
			j2 = 1;
			k2 = 1;
		} else if (x0 < z0) {
			i1 = 0;
			j1 = 1;
			k1 = 0;
			i2 = 0;
			j2 = 1;
			k2 = 1;
		} else {
			i1 = 0;
			j1 = 1;
			k1 = 0;
			i2 = 1;
			j2 = 1;
			k2 = 0;
		}
	}

	const x1 = x0 - i1 + G3;
	const y1 = y0 - j1 + G3;
	const z1 = z0 - k1 + G3;
	const x2 = x0 - i2 + 2.0 * G3;
	const y2 = y0 - j2 + 2.0 * G3;
	const z2 = z0 - k2 + 2.0 * G3;
	const x3 = x0 - 1.0 + 3.0 * G3;
	const y3 = y0 - 1.0 + 3.0 * G3;
	const z3 = z0 - 1.0 + 3.0 * G3;

	const ii = i & 255;
	const jj = j & 255;
	const kk = k & 255;
	let n0: number, n1: number, n2: number, n3: number;

	let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
	if (t0 < 0) {
		n0 = 0;
	} else {
		t0 *= t0;
		n0 = t0 * t0 * grad3(Perm[ii + Perm[jj + Perm[kk]]], x0, y0, z0);
	}

	let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
	if (t1 < 0) {
		n1 = 0;
	} else {
		t1 *= t1;
		n1 = t1 * t1 * grad3(Perm[ii + i1 + Perm[jj + j1 + Perm[kk + k1]]], x1, y1, z1);
	}

	let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
	if (t2 < 0) {
		n2 = 0;
	} else {
		t2 *= t2;
		n2 = t2 * t2 * grad3(Perm[ii + i2 + Perm[jj + j2 + Perm[kk + k2]]], x2, y2, z2);
	}

	let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
	if (t3 < 0) {
		n3 = 0;
	} else {
		t3 *= t3;
		n3 = t3 * t3 * grad3(Perm[ii + 1 + Perm[jj + 1 + Perm[kk + 1]]], x3, y3, z3);
	}

	return 32.0 * (n0 + n1 + n2 + n3);
}
