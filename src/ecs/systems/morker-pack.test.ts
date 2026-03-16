import { afterEach, describe, expect, it } from "vitest";
import type { LightSource } from "./light-sources.ts";
import {
	_resetPackState,
	ALPHA_SPEED_MULT,
	ambientLight,
	cleanupMorkerState,
	DAWN_DISSOLVE_DPS,
	dawnDissolveDamage,
	FLANK_RADIUS,
	flankPosition,
	getMorkerState,
	getPackMemberCount,
	HUNT_RANGE,
	isDawnDissolving,
	isSpawnBlockedByLight,
	lightDamage,
	lightSourceDamage,
	nearestLightFleeDir,
	nearestLyktgubbe,
	PACK_MAX,
	PACK_MIN,
	registerPack,
	SIZE_DAY,
	SIZE_NIGHT,
	sizeScale,
	TORCH_DPS,
	TORCH_RADIUS,
} from "./morker-pack.ts";

afterEach(() => {
	_resetPackState();
});

// ─── Ambient Light ───

describe("ambientLight", () => {
	it("returns 1 at noon (timeOfDay 0.25)", () => {
		expect(ambientLight(0.25)).toBeCloseTo(1, 2);
	});

	it("returns 0 at midnight (timeOfDay 0.75)", () => {
		expect(ambientLight(0.75)).toBeCloseTo(0, 2);
	});

	it("returns 0 at sunrise (timeOfDay 0.0)", () => {
		expect(ambientLight(0.0)).toBeCloseTo(0, 2);
	});

	it("returns 0 at sunset (timeOfDay 0.5)", () => {
		expect(ambientLight(0.5)).toBeCloseTo(0, 2);
	});

	it("clamps negative values to 0", () => {
		expect(ambientLight(0.75)).toBeGreaterThanOrEqual(0);
		expect(ambientLight(0.6)).toBeGreaterThanOrEqual(0);
	});
});

// ─── Size Scaling ───

describe("sizeScale", () => {
	it("returns SIZE_NIGHT at midnight", () => {
		expect(sizeScale(0.75)).toBeCloseTo(SIZE_NIGHT, 2);
	});

	it("returns SIZE_DAY at noon", () => {
		expect(sizeScale(0.25)).toBeCloseTo(SIZE_DAY, 2);
	});

	it("interpolates between SIZE_NIGHT and SIZE_DAY", () => {
		const scale = sizeScale(0.125);
		expect(scale).toBeGreaterThan(SIZE_DAY);
		expect(scale).toBeLessThan(SIZE_NIGHT);
	});
});

// ─── Light Damage ───

describe("lightDamage", () => {
	it("returns 0 beyond torch radius", () => {
		expect(lightDamage(TORCH_RADIUS + 1, 1.0)).toBe(0);
	});

	it("returns full damage at distance 0", () => {
		expect(lightDamage(0, 1.0)).toBeCloseTo(TORCH_DPS, 2);
	});

	it("returns half damage at half radius", () => {
		expect(lightDamage(TORCH_RADIUS / 2, 1.0)).toBeCloseTo(TORCH_DPS / 2, 2);
	});

	it("scales with dt", () => {
		const dmg1 = lightDamage(0, 0.016);
		const dmg2 = lightDamage(0, 0.032);
		expect(dmg2).toBeCloseTo(dmg1 * 2, 4);
	});

	it("returns 0 exactly at torch radius", () => {
		expect(lightDamage(TORCH_RADIUS, 1.0)).toBe(0);
	});
});

// ─── Dawn Dissolution ───

describe("isDawnDissolving", () => {
	it("returns true during late-night transition (>0.95)", () => {
		expect(isDawnDissolving(0.96)).toBe(true);
		expect(isDawnDissolving(0.99)).toBe(true);
	});

	it("returns true during early-morning transition (<0.05)", () => {
		expect(isDawnDissolving(0.01)).toBe(true);
		expect(isDawnDissolving(0.04)).toBe(true);
	});

	it("returns false at midnight", () => {
		expect(isDawnDissolving(0.75)).toBe(false);
	});

	it("returns false at noon", () => {
		expect(isDawnDissolving(0.25)).toBe(false);
	});

	it("returns false at timeOfDay exactly 0", () => {
		expect(isDawnDissolving(0)).toBe(false);
	});
});

describe("dawnDissolveDamage", () => {
	it("returns DAWN_DISSOLVE_DPS * dt during dissolution", () => {
		expect(dawnDissolveDamage(0.96, 1.0)).toBeCloseTo(DAWN_DISSOLVE_DPS, 2);
	});

	it("returns 0 outside dissolution window", () => {
		expect(dawnDissolveDamage(0.5, 1.0)).toBe(0);
	});
});

// ─── Pack State ───

describe("pack registration", () => {
	it("registers alpha as first entity", () => {
		registerPack([10, 11, 12]);
		const alpha = getMorkerState(10);
		expect(alpha?.isAlpha).toBe(true);
		expect(alpha?.flankIndex).toBe(0);
	});

	it("registers flankers with indices", () => {
		registerPack([10, 11, 12]);
		expect(getMorkerState(11)?.isAlpha).toBe(false);
		expect(getMorkerState(11)?.flankIndex).toBe(0);
		expect(getMorkerState(12)?.flankIndex).toBe(1);
	});

	it("returns undefined for unknown entity", () => {
		expect(getMorkerState(999)).toBeUndefined();
	});

	it("tracks member count", () => {
		registerPack([10, 11, 12]);
		const state = getMorkerState(10);
		expect(state).toBeDefined();
		expect(getPackMemberCount(state?.packId ?? -1)).toBe(3);
	});
});

describe("pack cleanup", () => {
	it("removes entity from pack", () => {
		registerPack([10, 11, 12]);
		cleanupMorkerState(11);
		expect(getMorkerState(11)).toBeUndefined();
	});

	it("promotes new alpha when alpha dies", () => {
		registerPack([10, 11, 12]);
		cleanupMorkerState(10);
		const newAlpha = getMorkerState(11);
		expect(newAlpha?.isAlpha).toBe(true);
	});

	it("re-indexes flankers after alpha death", () => {
		registerPack([10, 11, 12, 13]);
		cleanupMorkerState(10);
		const flanker = getMorkerState(12);
		expect(flanker?.flankIndex).toBe(0);
	});

	it("handles cleanup of unknown entity gracefully", () => {
		cleanupMorkerState(999);
		// No error thrown
	});
});

// ─── Pack Formation ───

describe("flankPosition", () => {
	it("places flankers at FLANK_RADIUS from player", () => {
		const pos = flankPosition(10, 0, 0, 0, 0, 2);
		const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
		expect(dist).toBeCloseTo(FLANK_RADIUS, 1);
	});

	it("distributes flankers symmetrically", () => {
		const left = flankPosition(10, 0, 0, 0, 0, 2);
		const right = flankPosition(10, 0, 0, 0, 1, 2);

		// Symmetric about the alpha-player axis (x axis)
		expect(left.z).toBeCloseTo(-right.z, 1);
	});

	it("flankers approach from opposite side of alpha", () => {
		// Alpha at (10,0), player at (0,0) → flankers should be at negative x
		const pos = flankPosition(10, 0, 0, 0, 0, 1);
		expect(pos.x).toBeLessThan(0);
	});
});

// ─── Lyktgubbe Hunting ───

describe("nearestLyktgubbe", () => {
	it("returns nearest lyktgubbe within hunt range", () => {
		const result = nearestLyktgubbe(0, 0, 20, 0, [
			{ entityId: 1, x: 5, z: 0 },
			{ entityId: 2, x: 10, z: 0 },
		]);
		expect(result?.entityId).toBe(1);
	});

	it("returns null when no lyktgubbar in range", () => {
		const result = nearestLyktgubbe(0, 0, 5, 0, [{ entityId: 1, x: HUNT_RANGE + 5, z: 0 }]);
		expect(result).toBeNull();
	});

	it("prefers lyktgubbe over player when closer", () => {
		const result = nearestLyktgubbe(0, 0, 8, 0, [{ entityId: 1, x: 5, z: 0 }]);
		expect(result?.entityId).toBe(1);
	});

	it("ignores lyktgubbe farther than player", () => {
		const result = nearestLyktgubbe(0, 0, 5, 0, [{ entityId: 1, x: 10, z: 0 }]);
		expect(result).toBeNull();
	});

	it("returns null for empty list", () => {
		expect(nearestLyktgubbe(0, 0, 10, 0, [])).toBeNull();
	});
});

// ─── Light Source Integration ───

describe("lightSourceDamage", () => {
	it("returns 0 when outside all light sources", () => {
		const sources: LightSource[] = [{ x: 0, y: 0, z: 0, radius: 4 }];
		expect(lightSourceDamage(10, 0, 10, sources, 1.0)).toBe(0);
	});

	it("deals damage when inside a light source", () => {
		const sources: LightSource[] = [{ x: 5, y: 5, z: 5, radius: 4 }];
		const dmg = lightSourceDamage(5, 5, 5, sources, 1.0);
		expect(dmg).toBeGreaterThan(0);
	});

	it("deals more damage closer to source center", () => {
		const sources: LightSource[] = [{ x: 0, y: 0, z: 0, radius: 8 }];
		const close = lightSourceDamage(1, 0, 0, sources, 1.0);
		const far = lightSourceDamage(6, 0, 0, sources, 1.0);
		expect(close).toBeGreaterThan(far);
	});

	it("scales with dt", () => {
		const sources: LightSource[] = [{ x: 0, y: 0, z: 0, radius: 8 }];
		const d1 = lightSourceDamage(2, 0, 0, sources, 0.016);
		const d2 = lightSourceDamage(2, 0, 0, sources, 0.032);
		expect(d2).toBeCloseTo(d1 * 2, 4);
	});
});

describe("isSpawnBlockedByLight", () => {
	it("blocks spawn inside light radius", () => {
		const sources: LightSource[] = [{ x: 10, y: 5, z: 10, radius: 4 }];
		expect(isSpawnBlockedByLight(10, 5, 11, sources)).toBe(true);
	});

	it("allows spawn outside light radius", () => {
		const sources: LightSource[] = [{ x: 10, y: 5, z: 10, radius: 4 }];
		expect(isSpawnBlockedByLight(20, 5, 20, sources)).toBe(false);
	});

	it("allows spawn when no light sources", () => {
		expect(isSpawnBlockedByLight(0, 0, 0, [])).toBe(false);
	});

	it("checks multiple sources", () => {
		const sources: LightSource[] = [
			{ x: 0, y: 0, z: 0, radius: 2 },
			{ x: 10, y: 0, z: 0, radius: 2 },
		];
		expect(isSpawnBlockedByLight(10, 0, 1, sources)).toBe(true);
		expect(isSpawnBlockedByLight(5, 0, 0, sources)).toBe(false);
	});
});

describe("nearestLightFleeDir", () => {
	it("returns null when not in any light", () => {
		const sources: LightSource[] = [{ x: 0, y: 0, z: 0, radius: 4 }];
		expect(nearestLightFleeDir(10, 0, 10, sources)).toBeNull();
	});

	it("returns direction away from nearest light source", () => {
		const sources: LightSource[] = [{ x: 0, y: 0, z: 0, radius: 8 }];
		const dir = nearestLightFleeDir(3, 0, 0, sources);
		expect(dir).not.toBeNull();
		expect(dir!.dx).toBeGreaterThan(0); // flee away from origin (positive x)
	});

	it("returns normalized direction", () => {
		const sources: LightSource[] = [{ x: 0, y: 0, z: 0, radius: 8 }];
		const dir = nearestLightFleeDir(3, 0, 4, sources);
		expect(dir).not.toBeNull();
		const len = Math.sqrt(dir!.dx * dir!.dx + dir!.dz * dir!.dz);
		expect(len).toBeCloseTo(1, 3);
	});

	it("picks nearest light source when multiple overlap", () => {
		const sources: LightSource[] = [
			{ x: 0, y: 0, z: 0, radius: 10 },
			{ x: 5, y: 0, z: 0, radius: 10 },
		];
		// At (4, 0, 0): dist to source0 = 4, dist to source1 = 1
		// Should flee from source1 (nearest), away from x=5 → negative x
		const dir = nearestLightFleeDir(4, 0, 0, sources);
		expect(dir).not.toBeNull();
		expect(dir!.dx).toBeLessThan(0);
	});

	it("handles zero-distance case", () => {
		const sources: LightSource[] = [{ x: 5, y: 0, z: 5, radius: 4 }];
		const dir = nearestLightFleeDir(5, 0, 5, sources);
		expect(dir).not.toBeNull();
		// Should return a default direction, not NaN
		expect(Number.isNaN(dir!.dx)).toBe(false);
	});
});

// ─── Constants validation ───

describe("constants", () => {
	it("pack size range is valid", () => {
		expect(PACK_MIN).toBeGreaterThanOrEqual(3);
		expect(PACK_MAX).toBeLessThanOrEqual(5);
		expect(PACK_MAX).toBeGreaterThanOrEqual(PACK_MIN);
	});

	it("alpha speed multiplier is > 1", () => {
		expect(ALPHA_SPEED_MULT).toBeGreaterThan(1);
	});
});
