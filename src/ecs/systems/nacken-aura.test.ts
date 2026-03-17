import { afterEach, describe, expect, it } from "vitest";
import {
	_resetNackenState,
	AURA_RANGE,
	computeSway,
	DISORIENT_DURATION,
	getNackenData,
	inAuraRange,
	isControlsReversed,
	isIronOfferingNear,
	NACKEN_COLOR,
	OFFERING_RANGE,
	registerNacken,
	SWAY_AMPLITUDE,
	teachRune,
} from "./nacken-aura.ts";

afterEach(() => {
	_resetNackenState();
});

// ─── Disorientation Trigger ───

describe("inAuraRange", () => {
	it("returns true when within aura range", () => {
		expect(inAuraRange(5, 5, 5.5, 5)).toBe(true);
	});

	it("returns false when beyond aura range", () => {
		expect(inAuraRange(0, 0, AURA_RANGE + 5, 0)).toBe(false);
	});

	it("returns true at exact edge of range", () => {
		expect(inAuraRange(0, 0, AURA_RANGE, 0)).toBe(true);
	});
});

describe("computeSway", () => {
	it("returns zero at time zero", () => {
		expect(computeSway(0)).toBeCloseTo(0, 5);
	});

	it("oscillates within amplitude bounds", () => {
		for (let t = 0; t < 10; t += 0.1) {
			const sway = computeSway(t);
			expect(Math.abs(sway)).toBeLessThanOrEqual(SWAY_AMPLITUDE + 0.001);
		}
	});
});

describe("isControlsReversed", () => {
	it("returns true when timer is active", () => {
		expect(isControlsReversed(2.0)).toBe(true);
	});

	it("returns false when timer is zero", () => {
		expect(isControlsReversed(0)).toBe(false);
	});

	it("returns false when timer is negative", () => {
		expect(isControlsReversed(-1)).toBe(false);
	});
});

// ─── Iron Offering ───

describe("isIronOfferingNear", () => {
	it("returns true when offering is close", () => {
		expect(isIronOfferingNear(10, 10, 12, 10)).toBe(true);
	});

	it("returns false when offering is far", () => {
		expect(isIronOfferingNear(0, 0, OFFERING_RANGE + 5, 0)).toBe(false);
	});
});

describe("teachRune", () => {
	it("returns true when rune is available", () => {
		registerNacken(1, 10, 5, 15);
		expect(teachRune(1)).toBe(true);
	});

	it("returns false after rune has been taught", () => {
		registerNacken(1, 10, 5, 15);
		teachRune(1);
		expect(teachRune(1)).toBe(false);
	});

	it("returns false for unknown entity", () => {
		expect(teachRune(999)).toBe(false);
	});
});

// ─── State Management ───

describe("state management", () => {
	it("registers and retrieves Nacken data", () => {
		registerNacken(1, 10, 5, 15);
		const data = getNackenData(1);
		expect(data).toBeDefined();
		expect(data?.seatX).toBe(10);
		expect(data?.seatY).toBe(5);
		expect(data?.seatZ).toBe(15);
		expect(data?.hasTeachRune).toBe(true);
		expect(data?.disorientCooldown).toBe(0);
	});

	it("returns undefined for unknown entity", () => {
		expect(getNackenData(999)).toBeUndefined();
	});
});

// ─── Constants ───

describe("constants", () => {
	it("has reasonable disorientation duration", () => {
		expect(DISORIENT_DURATION).toBe(3);
	});

	it("has green-blue emissive color", () => {
		expect(NACKEN_COLOR).toBe(0x44aaaa);
	});
});
