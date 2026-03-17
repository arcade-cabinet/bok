import { describe, expect, it } from "vitest";
import {
	CREATURE_FLEE_THRESHOLD,
	JATTEN_SPAWN_THRESHOLD,
	TREMOR_THRESHOLD,
	computeShakeIntensity,
	computeWarningPhase,
	shouldCreaturesFlee,
	shouldSpawnJatten,
	shouldTremor,
} from "./jatten-triggers.ts";

// ─── Warning Phase Detection ───

describe("computeWarningPhase", () => {
	it("returns 'none' below tremor threshold", () => {
		expect(computeWarningPhase(799)).toBe("none");
		expect(computeWarningPhase(0)).toBe("none");
	});

	it("returns 'tremor' at 800+", () => {
		expect(computeWarningPhase(800)).toBe("tremor");
		expect(computeWarningPhase(850)).toBe("tremor");
		expect(computeWarningPhase(899)).toBe("tremor");
	});

	it("returns 'flee' at 900+", () => {
		expect(computeWarningPhase(900)).toBe("flee");
		expect(computeWarningPhase(950)).toBe("flee");
		expect(computeWarningPhase(999)).toBe("flee");
	});

	it("returns 'spawn' at 1000+", () => {
		expect(computeWarningPhase(1000)).toBe("spawn");
		expect(computeWarningPhase(1500)).toBe("spawn");
	});
});

// ─── Tremor Check ───

describe("shouldTremor", () => {
	it("returns true at tremor threshold", () => {
		expect(shouldTremor(TREMOR_THRESHOLD)).toBe(true);
	});

	it("returns false below tremor threshold", () => {
		expect(shouldTremor(TREMOR_THRESHOLD - 1)).toBe(false);
	});

	it("returns true above tremor threshold but below flee", () => {
		expect(shouldTremor(850)).toBe(true);
	});
});

// ─── Camera Shake Intensity ───

describe("computeShakeIntensity", () => {
	it("returns 0 below tremor threshold", () => {
		expect(computeShakeIntensity(700)).toBe(0);
	});

	it("returns zero at exact tremor threshold (ramp starts here)", () => {
		expect(computeShakeIntensity(TREMOR_THRESHOLD)).toBe(0);
	});

	it("returns positive just above tremor threshold", () => {
		const intensity = computeShakeIntensity(TREMOR_THRESHOLD + 1);
		expect(intensity).toBeGreaterThan(0);
		expect(intensity).toBeLessThanOrEqual(1);
	});

	it("increases with inscription level", () => {
		const low = computeShakeIntensity(800);
		const mid = computeShakeIntensity(900);
		const high = computeShakeIntensity(1000);
		expect(mid).toBeGreaterThan(low);
		expect(high).toBeGreaterThan(mid);
	});

	it("clamps at 1.0 for very high levels", () => {
		expect(computeShakeIntensity(2000)).toBe(1);
	});
});

// ─── Creature Flee ───

describe("shouldCreaturesFlee", () => {
	it("returns true at flee threshold", () => {
		expect(shouldCreaturesFlee(CREATURE_FLEE_THRESHOLD)).toBe(true);
	});

	it("returns false below flee threshold", () => {
		expect(shouldCreaturesFlee(CREATURE_FLEE_THRESHOLD - 1)).toBe(false);
	});
});

// ─── Jatten Spawn ───

describe("shouldSpawnJatten", () => {
	it("returns true at spawn threshold", () => {
		expect(shouldSpawnJatten(JATTEN_SPAWN_THRESHOLD, false)).toBe(true);
	});

	it("returns false below spawn threshold", () => {
		expect(shouldSpawnJatten(JATTEN_SPAWN_THRESHOLD - 1, false)).toBe(false);
	});

	it("returns false if already spawned", () => {
		expect(shouldSpawnJatten(JATTEN_SPAWN_THRESHOLD, true)).toBe(false);
	});

	it("returns false for very high level if already spawned", () => {
		expect(shouldSpawnJatten(2000, true)).toBe(false);
	});
});

// ─── Threshold Constants ───

describe("thresholds", () => {
	it("tremor starts at 800", () => {
		expect(TREMOR_THRESHOLD).toBe(800);
	});

	it("creature flee starts at 900", () => {
		expect(CREATURE_FLEE_THRESHOLD).toBe(900);
	});

	it("jatten spawns at 1000", () => {
		expect(JATTEN_SPAWN_THRESHOLD).toBe(1000);
	});

	it("thresholds are in ascending order", () => {
		expect(TREMOR_THRESHOLD).toBeLessThan(CREATURE_FLEE_THRESHOLD);
		expect(CREATURE_FLEE_THRESHOLD).toBeLessThan(JATTEN_SPAWN_THRESHOLD);
	});
});
