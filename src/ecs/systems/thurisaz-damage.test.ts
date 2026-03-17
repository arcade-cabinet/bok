import { describe, expect, it } from "vitest";
import {
	THURISAZ_DAMAGE_PER_STRENGTH,
	THURISAZ_DAMAGE_RADIUS,
	THURISAZ_MAX_DAMAGE,
	THURISAZ_MIN_SIGNAL,
} from "./interaction-rune-data.ts";
import { computeThurisazDamage, findEntitiesInDamageRadius, isInDamageRadius } from "./thurisaz-damage.ts";

// ─── computeThurisazDamage ───

describe("computeThurisazDamage", () => {
	it("returns 0 when signal is below minimum", () => {
		expect(computeThurisazDamage(0)).toBe(0);
		expect(computeThurisazDamage(THURISAZ_MIN_SIGNAL - 1)).toBe(0);
	});

	it("returns damage at minimum signal threshold", () => {
		const dmg = computeThurisazDamage(THURISAZ_MIN_SIGNAL);
		expect(dmg).toBe(THURISAZ_MIN_SIGNAL * THURISAZ_DAMAGE_PER_STRENGTH);
		expect(dmg).toBeGreaterThan(0);
	});

	it("scales linearly with signal strength", () => {
		const dmg5 = computeThurisazDamage(5);
		const dmg10 = computeThurisazDamage(10);
		expect(dmg10).toBe(dmg5 * 2);
	});

	it("caps at THURISAZ_MAX_DAMAGE", () => {
		const dmg = computeThurisazDamage(15);
		expect(dmg).toBeLessThanOrEqual(THURISAZ_MAX_DAMAGE);
	});

	it("damage formula: strength * DAMAGE_PER_STRENGTH capped", () => {
		expect(computeThurisazDamage(5)).toBe(Math.min(5 * THURISAZ_DAMAGE_PER_STRENGTH, THURISAZ_MAX_DAMAGE));
		expect(computeThurisazDamage(7)).toBe(Math.min(7 * THURISAZ_DAMAGE_PER_STRENGTH, THURISAZ_MAX_DAMAGE));
	});
});

// ─── isInDamageRadius ───

describe("isInDamageRadius", () => {
	const sx = 10;
	const sy = 5;
	const sz = 10;

	it("returns true for entity at source", () => {
		expect(isInDamageRadius(sx, sy, sz, sx, sy, sz)).toBe(true);
	});

	it("returns true within radius", () => {
		expect(isInDamageRadius(sx, sy, sz, sx + 1, sy, sz)).toBe(true);
	});

	it("returns true at exact radius boundary", () => {
		expect(isInDamageRadius(sx, sy, sz, sx + THURISAZ_DAMAGE_RADIUS, sy, sz)).toBe(true);
	});

	it("returns false beyond radius", () => {
		expect(isInDamageRadius(sx, sy, sz, sx + THURISAZ_DAMAGE_RADIUS + 1, sy, sz)).toBe(false);
	});

	it("uses 3D distance", () => {
		// sqrt(2^2 + 2^2 + 2^2) = sqrt(12) ≈ 3.46 > 3
		expect(isInDamageRadius(sx, sy, sz, sx + 2, sy + 2, sz + 2)).toBe(false);
	});
});

// ─── findEntitiesInDamageRadius ───

describe("findEntitiesInDamageRadius", () => {
	it("returns empty array for no entities", () => {
		expect(findEntitiesInDamageRadius(10, 5, 10, [])).toEqual([]);
	});

	it("returns indices of entities in range", () => {
		const entities = [
			{ x: 10, y: 5, z: 10 }, // at source — in range
			{ x: 100, y: 100, z: 100 }, // far away — out of range
			{ x: 11, y: 5, z: 10 }, // 1 block away — in range
		];
		const indices = findEntitiesInDamageRadius(10, 5, 10, entities);
		expect(indices).toContain(0);
		expect(indices).not.toContain(1);
		expect(indices).toContain(2);
	});

	it("returns all entities when all in range", () => {
		const entities = [
			{ x: 10, y: 5, z: 10 },
			{ x: 11, y: 5, z: 10 },
		];
		expect(findEntitiesInDamageRadius(10, 5, 10, entities)).toHaveLength(2);
	});
});

// ─── Constants ───

describe("Thurisaz constants", () => {
	it("damage radius is positive", () => {
		expect(THURISAZ_DAMAGE_RADIUS).toBeGreaterThan(0);
	});

	it("min signal is positive", () => {
		expect(THURISAZ_MIN_SIGNAL).toBeGreaterThan(0);
	});

	it("max damage is greater than min damage", () => {
		expect(THURISAZ_MAX_DAMAGE).toBeGreaterThan(THURISAZ_MIN_SIGNAL * THURISAZ_DAMAGE_PER_STRENGTH);
	});
});
