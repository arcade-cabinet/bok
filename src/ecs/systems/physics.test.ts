import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { BlockId } from "../../world/blocks.ts";
import { registerVoxelAccessors } from "../../world/voxel-helpers.ts";
import { Health, PhysicsBody, PlayerState, Position, Velocity } from "../traits/index.ts";
import { physicsSystem } from "./physics.ts";

/** Configurable voxel map for test isolation. */
let voxelMap: Map<string, number>;

function key(x: number, y: number, z: number) {
	return `${x},${y},${z}`;
}

beforeEach(() => {
	voxelMap = new Map();
	registerVoxelAccessors(
		(x, y, z) => voxelMap.get(key(x, y, z)) ?? 0,
		() => {},
	);
});

afterEach(() => {
	voxelMap.clear();
});

describe("physicsSystem", () => {
	it("applies gravity to velocity each frame", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			position: { x: 5, y: 20, z: 5 },
			velocity: { y: 0 },
		});

		physicsSystem(world, 0.1);

		// vel.y should decrease by gravity * dt = 28 * 0.1 = 2.8
		expect(entity.get(Velocity).y).toBeCloseTo(-2.8);
	});

	it("detects ground collision and sets onGround", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			position: { x: 5.5, y: 5, z: 5.5 },
			velocity: { y: -5 },
			physics: { onGround: false },
		});
		// Place solid block below feet (y - height = 5 - 1.6 = 3.4, floor = 3)
		voxelMap.set(key(5, 3, 5), BlockId.Stone);

		physicsSystem(world, 0.1);

		expect(entity.get(PhysicsBody).onGround).toBe(true);
		expect(entity.get(Velocity).y).toBe(0);
	});

	it("allows free-fall when no ground below", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			position: { x: 5.5, y: 20, z: 5.5 },
			velocity: { y: 0 },
		});

		physicsSystem(world, 0.1);

		expect(entity.get(PhysicsBody).onGround).toBe(false);
		expect(entity.get(Velocity).y).toBeLessThan(0);
	});

	it("detects swimming in water", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			position: { x: 5.5, y: 5, z: 5.5 },
			velocity: { y: 0 },
		});
		// Water at feet level
		voxelMap.set(key(5, 3, 5), BlockId.Water);

		physicsSystem(world, 0.016);

		expect(entity.get(PhysicsBody).isSwimming).toBe(true);
	});

	it("reduces gravity while swimming", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			position: { x: 5.5, y: 5, z: 5.5 },
			velocity: { y: -1 },
		});
		voxelMap.set(key(5, 3, 5), BlockId.Water);

		physicsSystem(world, 0.016);

		// Swimming gravity = 28 * 0.3 = 8.4
		expect(entity.get(PhysicsBody).gravity).toBeCloseTo(8.4);
	});

	it("clamps downward velocity to -3 when swimming", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			position: { x: 5.5, y: 5, z: 5.5 },
			velocity: { y: -10 },
		});
		voxelMap.set(key(5, 3, 5), BlockId.Water);

		physicsSystem(world, 0.016);

		// Velocity was -10, should be clamped to -3 then reduced by gravity
		expect(entity.get(Velocity).y).toBeGreaterThanOrEqual(-3.5);
	});

	it("teleports player and deals damage when falling below y=-10", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			position: { x: 5, y: -5, z: 5 },
			velocity: { y: -20 },
		});

		physicsSystem(world, 0.5);

		const pos = entity.get(Position);
		expect(pos.y).toBe(30);
		expect(pos.x).toBe(8.5);
		expect(pos.z).toBe(8.5);
		expect(entity.get(Health).current).toBe(75);
		expect(entity.get(PlayerState).damageFlash).toBe(1.0);
	});

	it("stops horizontal movement on wall collision", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			position: { x: 5.5, y: 10, z: 5.5 },
			velocity: { x: 5, y: 0, z: 0 },
		});
		// Wall in X direction
		voxelMap.set(key(6, 9, 5), BlockId.Stone);
		voxelMap.set(key(6, 10, 5), BlockId.Stone);

		physicsSystem(world, 0.1);

		expect(entity.get(Velocity).x).toBe(0);
	});

	it("moves freely when no obstacles", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			position: { x: 5.5, y: 20, z: 5.5 },
			velocity: { x: 3, y: 0, z: 2 },
		});

		physicsSystem(world, 0.1);

		const pos = entity.get(Position);
		expect(pos.x).toBeCloseTo(5.8);
		expect(pos.z).toBeCloseTo(5.7);
	});
});
