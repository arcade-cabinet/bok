import { describe, expect, it } from "vitest";
import { computeBuffMultiplier, computeBuffRadius, getBestBuffMultiplier, isInBuffZone } from "./tiwaz-buff.ts";

describe("tiwaz-buff", () => {
	describe("computeBuffRadius", () => {
		it("returns base radius at zero signal", () => {
			// TIWAZ_BASE_RADIUS = 3
			expect(computeBuffRadius(0)).toBe(3);
		});

		it("scales linearly with signal strength", () => {
			// TIWAZ_RADIUS_PER_STRENGTH = 0.5
			expect(computeBuffRadius(4)).toBe(5);
			expect(computeBuffRadius(10)).toBe(8);
		});

		it("caps at maximum radius", () => {
			// TIWAZ_MAX_RADIUS = 12
			expect(computeBuffRadius(20)).toBe(12);
			expect(computeBuffRadius(100)).toBe(12);
		});
	});

	describe("computeBuffMultiplier", () => {
		it("returns base multiplier at zero signal", () => {
			// TIWAZ_BASE_MULTIPLIER = 1.25
			expect(computeBuffMultiplier(0)).toBe(1.25);
		});

		it("scales linearly with signal strength", () => {
			// TIWAZ_MULTIPLIER_PER_STRENGTH = 0.1
			expect(computeBuffMultiplier(5)).toBeCloseTo(1.75);
		});

		it("caps at maximum multiplier", () => {
			// TIWAZ_MAX_MULTIPLIER = 3.0
			expect(computeBuffMultiplier(20)).toBe(3.0);
			expect(computeBuffMultiplier(100)).toBe(3.0);
		});
	});

	describe("isInBuffZone", () => {
		it("returns true at zone center", () => {
			expect(isInBuffZone(5, 5, 5, 5, 5, 5, 3)).toBe(true);
		});

		it("returns true within radius", () => {
			expect(isInBuffZone(0, 0, 0, 2, 0, 0, 3)).toBe(true);
		});

		it("returns false outside radius", () => {
			expect(isInBuffZone(0, 0, 0, 10, 0, 0, 3)).toBe(false);
		});

		it("returns true at exact boundary", () => {
			expect(isInBuffZone(0, 0, 0, 3, 0, 0, 3)).toBe(true);
		});
	});

	describe("getBestBuffMultiplier", () => {
		it("returns 1.0 with no zones", () => {
			expect(getBestBuffMultiplier(0, 0, 0, [])).toBe(1.0);
		});

		it("returns 1.0 when outside all zones", () => {
			const zones = [{ x: 100, y: 0, z: 0, radius: 3, multiplier: 2.0 }];
			expect(getBestBuffMultiplier(0, 0, 0, zones)).toBe(1.0);
		});

		it("returns zone multiplier when inside", () => {
			const zones = [{ x: 0, y: 0, z: 0, radius: 5, multiplier: 1.5 }];
			expect(getBestBuffMultiplier(1, 0, 0, zones)).toBe(1.5);
		});

		it("returns highest multiplier from overlapping zones", () => {
			const zones = [
				{ x: 0, y: 0, z: 0, radius: 5, multiplier: 1.5 },
				{ x: 1, y: 0, z: 0, radius: 5, multiplier: 2.0 },
			];
			expect(getBestBuffMultiplier(0, 0, 0, zones)).toBe(2.0);
		});

		it("ignores zones entity is not inside", () => {
			const zones = [
				{ x: 0, y: 0, z: 0, radius: 5, multiplier: 1.5 },
				{ x: 100, y: 0, z: 0, radius: 5, multiplier: 3.0 },
			];
			expect(getBestBuffMultiplier(1, 0, 0, zones)).toBe(1.5);
		});
	});
});
