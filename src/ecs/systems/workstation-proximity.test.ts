import type { World } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestWorld, type PlayerOverrides, spawnPlayer } from "../../test-utils.ts";
import { BlockId } from "../../world/blocks.ts";
import { WorkstationProximity } from "../traits/index.ts";
import { resetWorkstationScanTimer, workstationProximitySystem } from "./workstation-proximity.ts";

/** Configurable voxel map for tests. */
let voxelMap: Map<string, number>;

function key(x: number, y: number, z: number) {
	return `${x},${y},${z}`;
}

function getVoxel(x: number, y: number, z: number): number {
	return voxelMap.get(key(x, y, z)) ?? 0;
}

/** Spawn player with WorkstationProximity trait (not included by default). */
function spawnPlayerWithWS(world: World, overrides: PlayerOverrides = {}) {
	const entity = spawnPlayer(world, overrides);
	entity.add(WorkstationProximity());
	return entity;
}

beforeEach(() => {
	voxelMap = new Map();
	resetWorkstationScanTimer();
});

describe("workstationProximitySystem", () => {
	it("detects no workstation when area is empty", () => {
		const world = createTestWorld();
		const entity = spawnPlayerWithWS(world, {
			position: { x: 10, y: 10, z: 10 },
		});

		// dt >= 0.5 to trigger scan
		workstationProximitySystem(world, 0.5, getVoxel);

		expect(entity.get(WorkstationProximity).maxTier).toBe(0);
	});

	it("detects a crafting bench (tier 1) nearby", () => {
		const world = createTestWorld();
		const entity = spawnPlayerWithWS(world, {
			position: { x: 10, y: 10, z: 10 },
		});
		voxelMap.set(key(12, 10, 10), BlockId.CraftingBench);

		workstationProximitySystem(world, 0.5, getVoxel);

		expect(entity.get(WorkstationProximity).maxTier).toBe(1);
	});

	it("detects a forge (tier 2) nearby", () => {
		const world = createTestWorld();
		const entity = spawnPlayerWithWS(world, {
			position: { x: 10, y: 10, z: 10 },
		});
		voxelMap.set(key(11, 10, 10), BlockId.Forge);

		workstationProximitySystem(world, 0.5, getVoxel);

		expect(entity.get(WorkstationProximity).maxTier).toBe(2);
	});

	it("detects a scriptorium (tier 3) nearby", () => {
		const world = createTestWorld();
		const entity = spawnPlayerWithWS(world, {
			position: { x: 10, y: 10, z: 10 },
		});
		voxelMap.set(key(10, 10, 11), BlockId.Scriptorium);

		workstationProximitySystem(world, 0.5, getVoxel);

		expect(entity.get(WorkstationProximity).maxTier).toBe(3);
	});

	it("picks the highest tier when multiple workstations are nearby", () => {
		const world = createTestWorld();
		const entity = spawnPlayerWithWS(world, {
			position: { x: 10, y: 10, z: 10 },
		});
		voxelMap.set(key(11, 10, 10), BlockId.CraftingBench);
		voxelMap.set(key(12, 10, 10), BlockId.Forge);

		workstationProximitySystem(world, 0.5, getVoxel);

		expect(entity.get(WorkstationProximity).maxTier).toBe(2);
	});

	it("does not scan before throttle interval elapses", () => {
		const world = createTestWorld();
		const entity = spawnPlayerWithWS(world, {
			position: { x: 10, y: 10, z: 10 },
		});
		voxelMap.set(key(11, 10, 10), BlockId.CraftingBench);

		// dt=0.3 is under the 0.5 scan interval
		workstationProximitySystem(world, 0.3, getVoxel);

		expect(entity.get(WorkstationProximity).maxTier).toBe(0);
	});

	it("scans after accumulated dt exceeds interval", () => {
		const world = createTestWorld();
		const entity = spawnPlayerWithWS(world, {
			position: { x: 10, y: 10, z: 10 },
		});
		voxelMap.set(key(11, 10, 10), BlockId.CraftingBench);

		// Two ticks that together exceed 0.5
		workstationProximitySystem(world, 0.3, getVoxel);
		workstationProximitySystem(world, 0.3, getVoxel);

		expect(entity.get(WorkstationProximity).maxTier).toBe(1);
	});

	it("ignores workstations beyond scan radius", () => {
		const world = createTestWorld();
		const entity = spawnPlayerWithWS(world, {
			position: { x: 10, y: 10, z: 10 },
		});
		// Place bench at distance 6 (radius is 4)
		voxelMap.set(key(16, 10, 10), BlockId.CraftingBench);

		workstationProximitySystem(world, 0.5, getVoxel);

		expect(entity.get(WorkstationProximity).maxTier).toBe(0);
	});

	it("detects workstation at vertical offset", () => {
		const world = createTestWorld();
		const entity = spawnPlayerWithWS(world, {
			position: { x: 10, y: 10, z: 10 },
		});
		// dy range is -1 to +2 relative to player feet
		voxelMap.set(key(10, 11, 10), BlockId.Forge);

		workstationProximitySystem(world, 0.5, getVoxel);

		expect(entity.get(WorkstationProximity).maxTier).toBe(2);
	});
});
