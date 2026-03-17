import { afterEach, describe, expect, it } from "vitest";
import {
	_resetVittraState,
	DEBUFF_RANGE,
	getVisibility,
	getVittraData,
	inDebuffRange,
	isOfferingNearMound,
	isVittraBiome,
	MOUND_AGGRO_RANGE,
	OFFERING_RANGE,
	ORBIT_RADIUS,
	OTUR_HUNGER_MULT,
	orbitPosition,
	registerVittra,
	shouldAggravate,
	shouldRetreat,
} from "./vittra-debuff.ts";

afterEach(() => {
	_resetVittraState();
});

// ─── Debuff Application ───

describe("inDebuffRange", () => {
	it("returns true when within debuff range", () => {
		expect(inDebuffRange(5, 5, 5.5, 5)).toBe(true);
	});

	it("returns false when beyond debuff range", () => {
		expect(inDebuffRange(0, 0, DEBUFF_RANGE + 5, 0)).toBe(false);
	});

	it("returns true at exact edge of range", () => {
		// At exactly DEBUFF_RANGE distance, dx²+dz² = DEBUFF_RANGE² → should be true (<=)
		expect(inDebuffRange(0, 0, DEBUFF_RANGE, 0)).toBe(true);
	});
});

describe("otur debuff constants", () => {
	it("multiplier increases hunger decay", () => {
		expect(OTUR_HUNGER_MULT).toBeGreaterThan(1);
	});
});

// ─── Appeasement ───

describe("isOfferingNearMound", () => {
	it("returns true when offering is close to mound", () => {
		expect(isOfferingNearMound(10, 10, 11, 10)).toBe(true);
	});

	it("returns false when offering is far from mound", () => {
		expect(isOfferingNearMound(0, 0, OFFERING_RANGE + 5, 0)).toBe(false);
	});
});

// ─── Aggravation ───

describe("shouldAggravate", () => {
	it("returns true when mining near mound", () => {
		expect(shouldAggravate(10, 10, 12, 10)).toBe(true);
	});

	it("returns false when mining far from mound", () => {
		expect(shouldAggravate(0, 0, MOUND_AGGRO_RANGE + 5, 0)).toBe(false);
	});
});

// ─── Biome Check ───

describe("isVittraBiome", () => {
	it("returns true for Bokskogen", () => {
		expect(isVittraBiome(1)).toBe(true); // Biome.Bokskogen
	});

	it("returns true for Myren", () => {
		expect(isVittraBiome(4)).toBe(true); // Biome.Myren
	});

	it("returns false for Fjallen", () => {
		expect(isVittraBiome(2)).toBe(false); // Biome.Fjallen
	});
});

// ─── Visibility ───

describe("getVisibility", () => {
	it("returns 0 (transparent) when passive", () => {
		expect(getVisibility(false)).toBe(0);
	});

	it("returns 1 (solid) when aggravated", () => {
		expect(getVisibility(true)).toBe(1);
	});
});

// ─── Movement ───

describe("orbitPosition", () => {
	it("computes position on orbit circle", () => {
		const result = orbitPosition(10, 10, 0);
		expect(result.x).toBeCloseTo(10 + ORBIT_RADIUS, 1);
		expect(result.z).toBeCloseTo(10, 1);
	});

	it("varies with angle", () => {
		const a = orbitPosition(0, 0, 0);
		const b = orbitPosition(0, 0, Math.PI / 2);
		expect(a.x).not.toBeCloseTo(b.x, 1);
	});
});

// ─── Retreat ───

describe("shouldRetreat", () => {
	it("returns true during daytime", () => {
		expect(shouldRetreat(0.25)).toBe(true);
	});

	it("returns false at night", () => {
		expect(shouldRetreat(0.75)).toBe(false);
	});

	it("returns false at early night", () => {
		expect(shouldRetreat(0.05)).toBe(false);
	});
});

// ─── State Management ───

describe("state management", () => {
	it("registers and retrieves Vittra data", () => {
		registerVittra(1, 10, 5, 15);
		const data = getVittraData(1);
		expect(data).toBeDefined();
		expect(data?.moundX).toBe(10);
		expect(data?.moundY).toBe(5);
		expect(data?.moundZ).toBe(15);
		expect(data?.aggravated).toBe(false);
		expect(data?.appeased).toBe(false);
	});

	it("returns undefined for unknown entity", () => {
		expect(getVittraData(999)).toBeUndefined();
	});

	it("aggravation state can be mutated", () => {
		registerVittra(1, 0, 0, 0);
		const data = getVittraData(1);
		expect(data?.aggravated).toBe(false);
		if (data) data.aggravated = true;
		expect(getVittraData(1)?.aggravated).toBe(true);
	});

	it("appeasement state can be mutated", () => {
		registerVittra(1, 0, 0, 0);
		const data = getVittraData(1);
		if (data) data.appeased = true;
		expect(getVittraData(1)?.appeased).toBe(true);
	});
});
