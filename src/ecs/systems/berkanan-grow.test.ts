import { describe, expect, it } from "vitest";
import {
	computeGrowthMultiplier,
	computeGrowthRadius,
	type GrowthZone,
	getBestGrowthMultiplier,
	isInGrowthZone,
} from "./berkanan-grow.ts";
import {
	BERKANAN_BASE_MULTIPLIER,
	BERKANAN_BASE_RADIUS,
	BERKANAN_MAX_MULTIPLIER,
	BERKANAN_MAX_RADIUS,
	BERKANAN_MULTIPLIER_PER_STRENGTH,
	BERKANAN_RADIUS_PER_STRENGTH,
} from "./interaction-rune-data.ts";

// ─── computeGrowthRadius ───

describe("computeGrowthRadius", () => {
	it("returns base radius with no signal", () => {
		expect(computeGrowthRadius(0)).toBe(BERKANAN_BASE_RADIUS);
	});

	it("scales linearly with signal strength", () => {
		const r5 = computeGrowthRadius(5);
		expect(r5).toBe(BERKANAN_BASE_RADIUS + 5 * BERKANAN_RADIUS_PER_STRENGTH);
	});

	it("caps at maximum radius", () => {
		expect(computeGrowthRadius(100)).toBe(BERKANAN_MAX_RADIUS);
	});

	it("increases monotonically up to cap", () => {
		let prev = computeGrowthRadius(0);
		for (let s = 1; s <= 15; s++) {
			const cur = computeGrowthRadius(s);
			expect(cur).toBeGreaterThanOrEqual(prev);
			prev = cur;
		}
	});
});

// ─── computeGrowthMultiplier ───

describe("computeGrowthMultiplier", () => {
	it("returns base multiplier with no signal", () => {
		expect(computeGrowthMultiplier(0)).toBe(BERKANAN_BASE_MULTIPLIER);
	});

	it("returns value >= 1.0 (never slows growth)", () => {
		expect(computeGrowthMultiplier(0)).toBeGreaterThanOrEqual(1.0);
	});

	it("scales linearly with signal strength", () => {
		const m5 = computeGrowthMultiplier(5);
		expect(m5).toBe(BERKANAN_BASE_MULTIPLIER + 5 * BERKANAN_MULTIPLIER_PER_STRENGTH);
	});

	it("caps at maximum multiplier", () => {
		expect(computeGrowthMultiplier(100)).toBe(BERKANAN_MAX_MULTIPLIER);
	});

	it("increases monotonically up to cap", () => {
		let prev = computeGrowthMultiplier(0);
		for (let s = 1; s <= 15; s++) {
			const cur = computeGrowthMultiplier(s);
			expect(cur).toBeGreaterThanOrEqual(prev);
			prev = cur;
		}
	});
});

// ─── isInGrowthZone ───

describe("isInGrowthZone", () => {
	const zx = 10;
	const zy = 5;
	const zz = 10;
	const radius = 5;

	it("returns true for block at zone center", () => {
		expect(isInGrowthZone(zx, zy, zz, zx, zy, zz, radius)).toBe(true);
	});

	it("returns true within radius", () => {
		expect(isInGrowthZone(zx, zy, zz, zx + 3, zy, zz, radius)).toBe(true);
	});

	it("returns true at exact radius boundary", () => {
		expect(isInGrowthZone(zx, zy, zz, zx + radius, zy, zz, radius)).toBe(true);
	});

	it("returns false beyond radius", () => {
		expect(isInGrowthZone(zx, zy, zz, zx + radius + 1, zy, zz, radius)).toBe(false);
	});

	it("uses 3D distance", () => {
		// sqrt(3^2 + 3^2 + 3^2) = sqrt(27) ≈ 5.2 > 5
		expect(isInGrowthZone(zx, zy, zz, zx + 3, zy + 3, zz + 3, radius)).toBe(false);
	});
});

// ─── getBestGrowthMultiplier ───

describe("getBestGrowthMultiplier", () => {
	it("returns 1.0 for empty zone list", () => {
		expect(getBestGrowthMultiplier(10, 5, 10, [])).toBe(1.0);
	});

	it("returns zone multiplier when inside one zone", () => {
		const zones: GrowthZone[] = [{ x: 10, y: 5, z: 10, radius: 6, multiplier: 2.5 }];
		expect(getBestGrowthMultiplier(12, 5, 10, zones)).toBe(2.5);
	});

	it("returns 1.0 when outside all zones", () => {
		const zones: GrowthZone[] = [{ x: 10, y: 5, z: 10, radius: 3, multiplier: 3.0 }];
		expect(getBestGrowthMultiplier(20, 5, 10, zones)).toBe(1.0);
	});

	it("returns the highest multiplier when overlapping zones", () => {
		const zones: GrowthZone[] = [
			{ x: 10, y: 5, z: 10, radius: 8, multiplier: 2.0 },
			{ x: 12, y: 5, z: 10, radius: 8, multiplier: 3.5 },
		];
		expect(getBestGrowthMultiplier(11, 5, 10, zones)).toBe(3.5);
	});
});

// ─── Constants ───

describe("Berkanan constants", () => {
	it("base radius is positive", () => {
		expect(BERKANAN_BASE_RADIUS).toBeGreaterThan(0);
	});

	it("radius per strength is positive", () => {
		expect(BERKANAN_RADIUS_PER_STRENGTH).toBeGreaterThan(0);
	});

	it("max radius is greater than base", () => {
		expect(BERKANAN_MAX_RADIUS).toBeGreaterThan(BERKANAN_BASE_RADIUS);
	});

	it("base multiplier is >= 1.0", () => {
		expect(BERKANAN_BASE_MULTIPLIER).toBeGreaterThanOrEqual(1.0);
	});

	it("max multiplier is greater than base", () => {
		expect(BERKANAN_MAX_MULTIPLIER).toBeGreaterThan(BERKANAN_BASE_MULTIPLIER);
	});
});
