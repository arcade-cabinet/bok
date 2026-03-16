import { describe, expect, it } from "vitest";
import { Face } from "./rune-data.ts";
import { computePushForce, computePushVelocity, findEntitiesInPushRadius, isInPushRadius } from "./uruz-force.ts";

describe("uruz-force", () => {
	describe("computePushForce", () => {
		it("returns 0 below minimum signal threshold", () => {
			expect(computePushForce(0)).toBe(0);
			expect(computePushForce(1)).toBe(0);
		});

		it("returns scaled force at minimum threshold", () => {
			// URUZ_MIN_SIGNAL = 2, URUZ_FORCE_PER_STRENGTH = 0.5
			expect(computePushForce(2)).toBe(1.0);
		});

		it("scales linearly with signal strength", () => {
			expect(computePushForce(4)).toBe(2.0);
			expect(computePushForce(8)).toBe(4.0);
		});

		it("caps at maximum force", () => {
			// URUZ_MAX_FORCE = 6
			expect(computePushForce(15)).toBe(6);
			expect(computePushForce(100)).toBe(6);
		});
	});

	describe("computePushVelocity", () => {
		it("returns zero vector below threshold", () => {
			expect(computePushVelocity(Face.PosX, 1)).toEqual([0, 0, 0]);
		});

		it("pushes in face normal direction for PosX", () => {
			const [vx, vy, vz] = computePushVelocity(Face.PosX, 4);
			expect(vx).toBeCloseTo(2.0);
			expect(vy).toBe(0);
			expect(vz).toBe(0);
		});

		it("pushes in negative X for NegX face", () => {
			const [vx, vy, vz] = computePushVelocity(Face.NegX, 4);
			expect(vx).toBeCloseTo(-2.0);
			expect(vy).toBe(0);
			expect(vz).toBe(0);
		});

		it("pushes upward for PosY face", () => {
			const [vx, vy, vz] = computePushVelocity(Face.PosY, 6);
			expect(vx).toBe(0);
			expect(vy).toBeCloseTo(3.0);
			expect(vz).toBe(0);
		});

		it("pushes in Z direction for PosZ face", () => {
			const [vx, vy, vz] = computePushVelocity(Face.PosZ, 10);
			expect(vx).toBe(0);
			expect(vy).toBe(0);
			expect(vz).toBeCloseTo(5.0);
		});
	});

	describe("isInPushRadius", () => {
		it("returns true for entity at source", () => {
			expect(isInPushRadius(5, 5, 5, 5, 5, 5)).toBe(true);
		});

		it("returns true for entity within radius", () => {
			// URUZ_PUSH_RADIUS = 5
			expect(isInPushRadius(0, 0, 0, 3, 0, 0)).toBe(true);
		});

		it("returns false for entity outside radius", () => {
			expect(isInPushRadius(0, 0, 0, 10, 0, 0)).toBe(false);
		});

		it("returns true at exact boundary", () => {
			expect(isInPushRadius(0, 0, 0, 5, 0, 0)).toBe(true);
		});
	});

	describe("findEntitiesInPushRadius", () => {
		it("returns empty for no entities", () => {
			expect(findEntitiesInPushRadius(0, 0, 0, [])).toEqual([]);
		});

		it("returns indices of entities within radius", () => {
			const entities = [
				{ x: 2, y: 0, z: 0 }, // in range
				{ x: 20, y: 0, z: 0 }, // out of range
				{ x: 0, y: 3, z: 0 }, // in range
			];
			const indices = findEntitiesInPushRadius(0, 0, 0, entities);
			expect(indices).toEqual([0, 2]);
		});

		it("returns all entities when all in range", () => {
			const entities = [
				{ x: 1, y: 0, z: 0 },
				{ x: 0, y: 1, z: 0 },
			];
			expect(findEntitiesInPushRadius(0, 0, 0, entities)).toEqual([0, 1]);
		});
	});
});
