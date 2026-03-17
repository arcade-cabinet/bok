import { describe, expect, it } from "vitest";
import { computeWardRadius, isBlockedByWard, isInWardZone, type WardZone } from "./algiz-ward.ts";
import { ALGIZ_BASE_RADIUS, ALGIZ_MAX_RADIUS, ALGIZ_RADIUS_PER_STRENGTH } from "./interaction-rune-data.ts";

// ─── computeWardRadius ───

describe("computeWardRadius", () => {
	it("returns base radius with no signal", () => {
		expect(computeWardRadius(0)).toBe(ALGIZ_BASE_RADIUS);
	});

	it("scales linearly with signal strength", () => {
		const r5 = computeWardRadius(5);
		expect(r5).toBe(ALGIZ_BASE_RADIUS + 5 * ALGIZ_RADIUS_PER_STRENGTH);
	});

	it("caps at maximum radius", () => {
		expect(computeWardRadius(100)).toBe(ALGIZ_MAX_RADIUS);
	});

	it("caps at max radius for signal strength 15", () => {
		const r15 = computeWardRadius(15);
		expect(r15).toBeLessThanOrEqual(ALGIZ_MAX_RADIUS);
	});

	it("increases monotonically up to cap", () => {
		let prev = computeWardRadius(0);
		for (let s = 1; s <= 15; s++) {
			const cur = computeWardRadius(s);
			expect(cur).toBeGreaterThanOrEqual(prev);
			prev = cur;
		}
	});
});

// ─── isInWardZone ───

describe("isInWardZone", () => {
	const wx = 10;
	const wy = 5;
	const wz = 10;
	const radius = 6;

	it("returns true for entity at ward center", () => {
		expect(isInWardZone(wx, wy, wz, wx, wy, wz, radius)).toBe(true);
	});

	it("returns true within radius", () => {
		expect(isInWardZone(wx, wy, wz, wx + 3, wy, wz, radius)).toBe(true);
	});

	it("returns true at exact radius boundary", () => {
		expect(isInWardZone(wx, wy, wz, wx + radius, wy, wz, radius)).toBe(true);
	});

	it("returns false beyond radius", () => {
		expect(isInWardZone(wx, wy, wz, wx + radius + 1, wy, wz, radius)).toBe(false);
	});

	it("uses 3D distance", () => {
		// sqrt(4^2 + 4^2 + 4^2) = sqrt(48) ≈ 6.93 > 6
		expect(isInWardZone(wx, wy, wz, wx + 4, wy + 4, wz + 4, radius)).toBe(false);
	});
});

// ─── isBlockedByWard ───

describe("isBlockedByWard", () => {
	it("returns false for empty ward list", () => {
		expect(isBlockedByWard(10, 5, 10, [])).toBe(false);
	});

	it("returns true when inside one ward", () => {
		const wards: WardZone[] = [{ x: 10, y: 5, z: 10, radius: 6 }];
		expect(isBlockedByWard(12, 5, 10, wards)).toBe(true);
	});

	it("returns false when outside all wards", () => {
		const wards: WardZone[] = [{ x: 10, y: 5, z: 10, radius: 3 }];
		expect(isBlockedByWard(20, 5, 10, wards)).toBe(false);
	});

	it("returns true if inside any of multiple wards", () => {
		const wards: WardZone[] = [
			{ x: 0, y: 0, z: 0, radius: 2 },
			{ x: 20, y: 5, z: 20, radius: 5 },
		];
		expect(isBlockedByWard(21, 5, 20, wards)).toBe(true);
	});
});

// ─── Constants ───

describe("Algiz constants", () => {
	it("base radius is positive", () => {
		expect(ALGIZ_BASE_RADIUS).toBeGreaterThan(0);
	});

	it("radius per strength is positive", () => {
		expect(ALGIZ_RADIUS_PER_STRENGTH).toBeGreaterThan(0);
	});

	it("max radius is greater than base", () => {
		expect(ALGIZ_MAX_RADIUS).toBeGreaterThan(ALGIZ_BASE_RADIUS);
	});
});
