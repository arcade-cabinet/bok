import { describe, expect, it } from "vitest";
import { computeDesaturation, computeVignetteIntensity, isHealthCritical } from "./diegetic-effects.ts";

describe("computeVignetteIntensity", () => {
	it("returns 0 at full health", () => {
		expect(computeVignetteIntensity(100, 100)).toBe(0);
	});

	it("returns 0 at 80% health (threshold)", () => {
		expect(computeVignetteIntensity(80, 100)).toBe(0);
	});

	it("returns low intensity at 60% health", () => {
		const intensity = computeVignetteIntensity(60, 100);
		expect(intensity).toBeGreaterThan(0);
		expect(intensity).toBeLessThan(0.2);
	});

	it("returns moderate intensity at 40% health", () => {
		const intensity = computeVignetteIntensity(40, 100);
		expect(intensity).toBeGreaterThan(0.2);
		expect(intensity).toBeLessThan(0.4);
	});

	it("returns max intensity at 0 health", () => {
		expect(computeVignetteIntensity(0, 100)).toBeCloseTo(0.6);
	});

	it("clamps health above max", () => {
		expect(computeVignetteIntensity(120, 100)).toBe(0);
	});

	it("handles zero maxHealth", () => {
		expect(computeVignetteIntensity(50, 0)).toBe(0);
	});

	it("clamps negative health to 0", () => {
		expect(computeVignetteIntensity(-10, 100)).toBeCloseTo(0.6);
	});
});

describe("isHealthCritical", () => {
	it("returns false at full health", () => {
		expect(isHealthCritical(100, 100)).toBe(false);
	});

	it("returns false at 20% health (at threshold)", () => {
		expect(isHealthCritical(20, 100)).toBe(false);
	});

	it("returns true at 19% health", () => {
		expect(isHealthCritical(19, 100)).toBe(true);
	});

	it("returns false at 0 health (dead)", () => {
		expect(isHealthCritical(0, 100)).toBe(false);
	});

	it("handles zero maxHealth", () => {
		expect(isHealthCritical(50, 0)).toBe(false);
	});
});

describe("computeDesaturation", () => {
	it("returns 1.0 at full hunger (full color)", () => {
		expect(computeDesaturation(100, 100)).toBe(1);
	});

	it("returns 1.0 at 50% hunger (threshold)", () => {
		expect(computeDesaturation(50, 100)).toBe(1);
	});

	it("returns partial desaturation at 25% hunger", () => {
		const sat = computeDesaturation(25, 100);
		expect(sat).toBeGreaterThan(0.3);
		expect(sat).toBeLessThan(1);
	});

	it("returns max desaturation (0.3) at 0 hunger", () => {
		expect(computeDesaturation(0, 100)).toBeCloseTo(0.3);
	});

	it("handles zero maxHunger", () => {
		expect(computeDesaturation(50, 0)).toBe(1);
	});

	it("clamps hunger above max", () => {
		expect(computeDesaturation(120, 100)).toBe(1);
	});
});
