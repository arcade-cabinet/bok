import { afterEach, describe, expect, test } from "vitest";
import { Vehicle } from "yuka";
import {
	createVoxelAvoidanceBehavior,
	resetObstaclePool,
	sampleVoxelObstacles,
	updateAvoidanceBehavior,
} from "./yuka-voxel-obstacles.ts";

afterEach(() => {
	resetObstaclePool();
});

// ─── Helpers ───

function makeVehicle(x: number, y: number, z: number, vx = 0, vz = 1): Vehicle {
	const v = new Vehicle();
	v.position.set(x, y, z);
	v.velocity.set(vx, 0, vz);
	return v;
}

// Block lookup: a wall of solid blocks at z=5, x=0..3
function wallAt5(bx: number, by: number, bz: number): number {
	if (bz === 5 && bx >= 0 && bx <= 3 && by >= 0 && by <= 2) return 1;
	return 0;
}

function alwaysSolid(id: number): boolean {
	return id > 0;
}

function emptyWorld(_bx: number, _by: number, _bz: number): number {
	return 0;
}

describe("sampleVoxelObstacles", () => {
	test("empty world produces no obstacles", () => {
		const vehicle = makeVehicle(0, 1, 0, 0, 1);
		const result = sampleVoxelObstacles(vehicle, emptyWorld, alwaysSolid);
		expect(result.count).toBe(0);
		expect(result.shouldJump).toBe(false);
	});

	test("wall ahead produces obstacles", () => {
		const vehicle = makeVehicle(1, 1, 2, 0, 1); // Moving toward z+, wall at z=5
		const result = sampleVoxelObstacles(vehicle, wallAt5, alwaysSolid);
		expect(result.count).toBeGreaterThan(0);
	});

	test("shouldJump when blocked at close range", () => {
		// Wall directly ahead at z=1 and z=2
		function closeWall(bx: number, by: number, bz: number): number {
			if ((bz === 1 || bz === 2) && bx === 0 && by >= 0 && by <= 1) return 1;
			return 0;
		}
		const vehicle = makeVehicle(0.5, 1, 0, 0, 1);
		const result = sampleVoxelObstacles(vehicle, closeWall, alwaysSolid);
		expect(result.shouldJump).toBe(true);
	});

	test("obstacles are positioned at block centers", () => {
		function singleBlock(bx: number, by: number, bz: number): number {
			if (bx === 0 && by === 1 && bz === 2) return 1;
			return 0;
		}
		const vehicle = makeVehicle(0.5, 1, 0, 0, 1);
		const result = sampleVoxelObstacles(vehicle, singleBlock, alwaysSolid);

		// Find the obstacle at block (0,1,2)
		const obs = result.obstacles
			.slice(0, result.count)
			.find((o) => Math.abs(o.position.x - 0.5) < 0.1 && Math.abs(o.position.z - 2.5) < 0.1);
		expect(obs).toBeDefined();
		expect(obs?.boundingRadius).toBe(0.5);
	});

	test("stationary vehicle uses forward direction", () => {
		const vehicle = makeVehicle(0, 1, 0);
		// Zero velocity — should use getDirection() fallback
		vehicle.velocity.set(0, 0, 0);
		const result = sampleVoxelObstacles(vehicle, emptyWorld, alwaysSolid);
		// Should not crash, no obstacles in empty world
		expect(result.count).toBe(0);
	});
});

describe("createVoxelAvoidanceBehavior", () => {
	test("creates behavior with correct weight", () => {
		const behavior = createVoxelAvoidanceBehavior(5.0);
		expect(behavior.weight).toBe(5.0);
		expect(behavior.obstacles.length).toBeGreaterThan(0);
	});

	test("updateAvoidanceBehavior limits to active obstacles", () => {
		const behavior = createVoxelAvoidanceBehavior();
		const vehicle = makeVehicle(1, 1, 2, 0, 1);
		const result = sampleVoxelObstacles(vehicle, wallAt5, alwaysSolid);

		updateAvoidanceBehavior(behavior, result);
		expect(behavior.obstacles.length).toBe(result.count);
	});
});
