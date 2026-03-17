import { describe, expect, it } from "vitest";
import { MANNAZ_BASE_RADIUS, MANNAZ_MAX_RADIUS, MANNAZ_RADIUS_PER_STRENGTH } from "./interaction-rune-data.ts";
import { type CalmZone, computeCalmRadius, isAiTypeCalmable, isCalmedByZone, isInCalmZone } from "./mannaz-calm.ts";

// ─── computeCalmRadius ───

describe("computeCalmRadius", () => {
	it("returns base radius with no signal", () => {
		expect(computeCalmRadius(0)).toBe(MANNAZ_BASE_RADIUS);
	});

	it("scales linearly with signal strength", () => {
		const r5 = computeCalmRadius(5);
		expect(r5).toBe(MANNAZ_BASE_RADIUS + 5 * MANNAZ_RADIUS_PER_STRENGTH);
	});

	it("caps at maximum radius", () => {
		expect(computeCalmRadius(100)).toBe(MANNAZ_MAX_RADIUS);
	});

	it("caps at max radius for signal strength 15", () => {
		const r15 = computeCalmRadius(15);
		expect(r15).toBeLessThanOrEqual(MANNAZ_MAX_RADIUS);
	});

	it("increases monotonically up to cap", () => {
		let prev = computeCalmRadius(0);
		for (let s = 1; s <= 15; s++) {
			const cur = computeCalmRadius(s);
			expect(cur).toBeGreaterThanOrEqual(prev);
			prev = cur;
		}
	});
});

// ─── isInCalmZone ───

describe("isInCalmZone", () => {
	const zx = 10;
	const zy = 5;
	const zz = 10;
	const radius = 6;

	it("returns true for entity at zone center", () => {
		expect(isInCalmZone(zx, zy, zz, zx, zy, zz, radius)).toBe(true);
	});

	it("returns true within radius", () => {
		expect(isInCalmZone(zx, zy, zz, zx + 3, zy, zz, radius)).toBe(true);
	});

	it("returns true at exact radius boundary", () => {
		expect(isInCalmZone(zx, zy, zz, zx + radius, zy, zz, radius)).toBe(true);
	});

	it("returns false beyond radius", () => {
		expect(isInCalmZone(zx, zy, zz, zx + radius + 1, zy, zz, radius)).toBe(false);
	});

	it("uses 3D distance", () => {
		// sqrt(4^2 + 4^2 + 4^2) = sqrt(48) ≈ 6.93 > 6
		expect(isInCalmZone(zx, zy, zz, zx + 4, zy + 4, zz + 4, radius)).toBe(false);
	});
});

// ─── isAiTypeCalmable ───

describe("isAiTypeCalmable", () => {
	it("returns true for neutral creatures", () => {
		expect(isAiTypeCalmable("neutral")).toBe(true);
	});

	it("returns false for hostile creatures", () => {
		expect(isAiTypeCalmable("hostile")).toBe(false);
	});

	it("returns false for passive creatures", () => {
		expect(isAiTypeCalmable("passive")).toBe(false);
	});

	it("returns false for boss creatures", () => {
		expect(isAiTypeCalmable("boss")).toBe(false);
	});
});

// ─── isCalmedByZone ───

describe("isCalmedByZone", () => {
	it("returns false for empty zone list", () => {
		expect(isCalmedByZone(10, 5, 10, [])).toBe(false);
	});

	it("returns true when inside one zone", () => {
		const zones: CalmZone[] = [{ x: 10, y: 5, z: 10, radius: 6 }];
		expect(isCalmedByZone(12, 5, 10, zones)).toBe(true);
	});

	it("returns false when outside all zones", () => {
		const zones: CalmZone[] = [{ x: 10, y: 5, z: 10, radius: 3 }];
		expect(isCalmedByZone(20, 5, 10, zones)).toBe(false);
	});

	it("returns true if inside any of multiple zones", () => {
		const zones: CalmZone[] = [
			{ x: 0, y: 0, z: 0, radius: 2 },
			{ x: 20, y: 5, z: 20, radius: 5 },
		];
		expect(isCalmedByZone(21, 5, 20, zones)).toBe(true);
	});
});

// ─── Constants ───

describe("Mannaz constants", () => {
	it("base radius is positive", () => {
		expect(MANNAZ_BASE_RADIUS).toBeGreaterThan(0);
	});

	it("radius per strength is positive", () => {
		expect(MANNAZ_RADIUS_PER_STRENGTH).toBeGreaterThan(0);
	});

	it("max radius is greater than base", () => {
		expect(MANNAZ_MAX_RADIUS).toBeGreaterThan(MANNAZ_BASE_RADIUS);
	});
});
