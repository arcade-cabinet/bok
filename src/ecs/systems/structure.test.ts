import { beforeEach, describe, expect, it } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { BLOCKS, BlockId } from "../../world/blocks.ts";
import { InscriptionLevel, ShelterState } from "../traits/index.ts";
import { resetStructureState, SHELTER_HUNGER_MULT, SHELTER_STAMINA_MULT, structureSystem } from "./structure.ts";
import { MIN_INSCRIPTION_VOLUME } from "./structure-detect.ts";

const isSolid = (id: number) => BLOCKS[id]?.solid ?? false;

/** Create a getVoxel function for a hollow box. */
function hollowBox(
	minX: number,
	minY: number,
	minZ: number,
	maxX: number,
	maxY: number,
	maxZ: number,
	wallBlock = BlockId.Stone,
) {
	return (x: number, y: number, z: number) => {
		const onWall = x === minX || x === maxX || y === minY || y === maxY || z === minZ || z === maxZ;
		if (x >= minX && x <= maxX && y >= minY && y <= maxY && z >= minZ && z <= maxZ && onWall) {
			return wallBlock;
		}
		return BlockId.Air;
	};
}

describe("structureSystem", () => {
	beforeEach(() => {
		resetStructureState();
	});

	it("detects shelter when player is inside enclosed space", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		const getVoxel = hollowBox(3, 3, 3, 7, 7, 7);

		// Trigger scan (dt >= SCAN_INTERVAL of 1.0)
		structureSystem(world, 1.0, getVoxel, isSolid);

		const shelter = player.get(ShelterState);
		expect(shelter?.inShelter).toBe(true);
		expect(shelter?.structureVolume).toBeGreaterThan(0);
	});

	it("does not detect shelter in open space", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		const getVoxel = () => BlockId.Air;

		structureSystem(world, 1.0, getVoxel, isSolid);

		const shelter = player.get(ShelterState);
		expect(shelter?.inShelter).toBe(false);
		expect(shelter?.structureVolume).toBe(0);
	});

	it("throttles scan — skips if dt < interval", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		const getVoxel = hollowBox(3, 3, 3, 7, 7, 7);

		// dt = 0.5 is less than SCAN_INTERVAL (1.0)
		structureSystem(world, 0.5, getVoxel, isSolid);

		const shelter = player.get(ShelterState);
		expect(shelter?.inShelter).toBe(false); // Not scanned yet
	});

	it("accumulates dt across frames for throttled scan", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		const getVoxel = hollowBox(3, 3, 3, 7, 7, 7);

		structureSystem(world, 0.5, getVoxel, isSolid);
		structureSystem(world, 0.5, getVoxel, isSolid);

		const shelter = player.get(ShelterState);
		expect(shelter?.inShelter).toBe(true);
	});

	it("detects Falu red blocks and reduces morker spawn mult", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		// Box with Falu red walls
		const getVoxel = hollowBox(3, 3, 3, 7, 7, 7, BlockId.FaluRed);

		structureSystem(world, 1.0, getVoxel, isSolid);

		const shelter = player.get(ShelterState);
		expect(shelter?.faluRedCount).toBeGreaterThan(0);
		expect(shelter?.morkerSpawnMult).toBeLessThan(1);
	});

	it("morkerSpawnMult is 1 with no Falu red blocks", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		const getVoxel = hollowBox(3, 3, 3, 7, 7, 7, BlockId.Stone);

		structureSystem(world, 1.0, getVoxel, isSolid);

		const shelter = player.get(ShelterState);
		expect(shelter?.morkerSpawnMult).toBe(1);
	});

	it("increments structuresBuilt on new structure detection", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		// Box with interior volume >= MIN_INSCRIPTION_VOLUME
		const getVoxel = hollowBox(3, 3, 3, 7, 7, 7);

		structureSystem(world, 1.0, getVoxel, isSolid);

		const ins = player.get(InscriptionLevel);
		expect(ins?.structuresBuilt).toBe(1);
	});

	it("does not increment structuresBuilt for tiny spaces", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world, { position: { x: 1, y: 1, z: 1 } });
		// Tiny 1x1x1 interior — below MIN_INSCRIPTION_VOLUME
		const getVoxel = hollowBox(0, 0, 0, 2, 2, 2);

		structureSystem(world, 1.0, getVoxel, isSolid);

		const ins = player.get(InscriptionLevel);
		expect(ins?.structuresBuilt).toBe(0);
	});

	it("does not double-count same structure position", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		const getVoxel = hollowBox(3, 3, 3, 7, 7, 7);

		// First entry
		structureSystem(world, 1.0, getVoxel, isSolid);
		// Leave and re-enter (simulate leaving by going to open space briefly)
		structureSystem(world, 1.0, () => BlockId.Air, isSolid);
		// Re-enter same structure
		structureSystem(world, 1.0, getVoxel, isSolid);

		const ins = player.get(InscriptionLevel);
		expect(ins?.structuresBuilt).toBe(1); // Only counted once
	});

	it("exports shelter bonus constants", () => {
		expect(SHELTER_HUNGER_MULT).toBeLessThan(1);
		expect(SHELTER_STAMINA_MULT).toBeGreaterThan(1);
	});

	it("MIN_INSCRIPTION_VOLUME is positive", () => {
		expect(MIN_INSCRIPTION_VOLUME).toBeGreaterThan(0);
	});
});
