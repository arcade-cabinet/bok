import { describe, expect, it } from "vitest";
import { BLOCKS, BlockId } from "../../world/blocks.ts";
import {
	countFaluRedNearby,
	detectEnclosure,
	FALU_REDUCTION_PER_BLOCK,
	faluSpawnRadiusMultiplier,
	MAX_STRUCTURE_VOLUME,
	MIN_SPAWN_RADIUS_MULT,
} from "./structure-detect.ts";

const isSolid = (id: number) => BLOCKS[id]?.solid ?? false;

/** Create a getVoxel function for a hollow box structure. */
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

describe("detectEnclosure", () => {
	it("detects a fully enclosed 3x3x3 box", () => {
		const getVoxel = hollowBox(0, 0, 0, 4, 4, 4);
		const result = detectEnclosure(2, 2, 2, getVoxel, isSolid);
		expect(result.enclosed).toBe(true);
		// Interior is 3x3x3 = 27 air blocks
		expect(result.volume).toBe(27);
	});

	it("detects open space (no enclosure)", () => {
		const getVoxel = () => BlockId.Air;
		const result = detectEnclosure(5, 5, 5, getVoxel, isSolid);
		expect(result.enclosed).toBe(false);
		expect(result.volume).toBeGreaterThan(MAX_STRUCTURE_VOLUME);
	});

	it("detects a box with one wall missing (open)", () => {
		// Box from (0,0,0) to (4,4,4) but north wall (z=4) is missing
		const getVoxel = (x: number, y: number, z: number) => {
			if (z === 4) return BlockId.Air; // hole in the wall
			const onWall = x === 0 || x === 4 || y === 0 || y === 4 || z === 0;
			if (x >= 0 && x <= 4 && y >= 0 && y <= 4 && z >= 0 && z <= 4 && onWall) {
				return BlockId.Stone;
			}
			return BlockId.Air;
		};
		const result = detectEnclosure(2, 2, 2, getVoxel, isSolid);
		expect(result.enclosed).toBe(false);
	});

	it("counts Falu red blocks in walls", () => {
		// 3x3x3 hollow box with Falu red walls
		const getVoxel = hollowBox(0, 0, 0, 4, 4, 4, BlockId.FaluRed);
		const result = detectEnclosure(2, 2, 2, getVoxel, isSolid);
		expect(result.enclosed).toBe(true);
		expect(result.faluRedCount).toBeGreaterThan(0);
	});

	it("returns zero Falu red for plain stone structure", () => {
		const getVoxel = hollowBox(0, 0, 0, 4, 4, 4, BlockId.Stone);
		const result = detectEnclosure(2, 2, 2, getVoxel, isSolid);
		expect(result.enclosed).toBe(true);
		expect(result.faluRedCount).toBe(0);
	});

	it("rejects starting in solid block", () => {
		const getVoxel = () => BlockId.Stone;
		const result = detectEnclosure(0, 0, 0, getVoxel, isSolid);
		expect(result.enclosed).toBe(false);
		expect(result.volume).toBe(0);
	});

	it("respects configurable maxVolume", () => {
		const getVoxel = hollowBox(0, 0, 0, 10, 10, 10);
		// Interior is 9x9x9 = 729, but limit to 100
		const result = detectEnclosure(5, 5, 5, getVoxel, isSolid, 100);
		expect(result.enclosed).toBe(false);
		expect(result.volume).toBeGreaterThan(100);
	});

	it("handles a tiny 1x1x1 enclosed space", () => {
		const getVoxel = hollowBox(0, 0, 0, 2, 2, 2);
		const result = detectEnclosure(1, 1, 1, getVoxel, isSolid);
		expect(result.enclosed).toBe(true);
		expect(result.volume).toBe(1);
	});

	it("handles non-integer player position (floors to block coords)", () => {
		const getVoxel = hollowBox(0, 0, 0, 4, 4, 4);
		const result = detectEnclosure(2.7, 2.3, 2.9, getVoxel, isSolid);
		expect(result.enclosed).toBe(true);
		expect(result.volume).toBe(27);
	});

	it("detects L-shaped enclosed room", () => {
		// Two connected boxes sharing a wall
		const getVoxel = (x: number, y: number, z: number) => {
			// Room A: (0,0,0)-(4,4,4)
			const inA = x >= 0 && x <= 4 && y >= 0 && y <= 4 && z >= 0 && z <= 4;
			// Room B: (4,0,0)-(8,4,4) — shares wall at x=4
			const inB = x >= 4 && x <= 8 && y >= 0 && y <= 4 && z >= 0 && z <= 4;

			if (!inA && !inB) return BlockId.Air;

			const wallA = x === 0 || y === 0 || y === 4 || z === 0 || z === 4;
			const wallB = x === 8 || y === 0 || y === 4 || z === 0 || z === 4;

			// Shared wall at x=4 has a door opening at y=1,z=2
			if (x === 4) {
				if (y >= 1 && y <= 2 && z === 2) return BlockId.Air; // doorway
				return BlockId.Stone;
			}

			if (inA && wallA) return BlockId.Stone;
			if (inB && wallB) return BlockId.Stone;
			return BlockId.Air;
		};

		// Check from inside room A
		const result = detectEnclosure(2, 2, 2, getVoxel, isSolid);
		expect(result.enclosed).toBe(true);
		// Both rooms connected through doorway
		expect(result.volume).toBeGreaterThan(27);
	});

	it("detects partial enclosure as open (floor but no ceiling)", () => {
		const getVoxel = (x: number, y: number, z: number) => {
			// Only floor and walls, no ceiling (y=4 is air)
			if (y === 0) return BlockId.Stone; // floor
			if (y >= 1 && y <= 3) {
				if (x === 0 || x === 4 || z === 0 || z === 4) {
					if (x >= 0 && x <= 4 && z >= 0 && z <= 4) return BlockId.Stone;
				}
			}
			return BlockId.Air;
		};
		const result = detectEnclosure(2, 2, 2, getVoxel, isSolid);
		expect(result.enclosed).toBe(false);
	});
});

describe("countFaluRedNearby", () => {
	it("returns 0 when no Falu red blocks present", () => {
		const getVoxel = () => BlockId.Air;
		expect(countFaluRedNearby(0, 0, 0, getVoxel)).toBe(0);
	});

	it("counts Falu red blocks within radius", () => {
		const getVoxel = (x: number, _y: number, _z: number) => {
			if (x === 3 || x === -3) return BlockId.FaluRed;
			return BlockId.Air;
		};
		const count = countFaluRedNearby(0, 0, 0, getVoxel, 5, 2);
		expect(count).toBeGreaterThan(0);
	});

	it("ignores blocks beyond radius", () => {
		const getVoxel = (x: number, _y: number, _z: number) => {
			if (x === 100) return BlockId.FaluRed;
			return BlockId.Air;
		};
		expect(countFaluRedNearby(0, 0, 0, getVoxel, 5, 2)).toBe(0);
	});
});

describe("faluSpawnRadiusMultiplier", () => {
	it("returns 1 with no Falu red blocks", () => {
		expect(faluSpawnRadiusMultiplier(0)).toBe(1);
	});

	it("reduces multiplier per block", () => {
		const mult = faluSpawnRadiusMultiplier(5);
		expect(mult).toBeCloseTo(1 - 5 * FALU_REDUCTION_PER_BLOCK);
	});

	it("floors at minimum multiplier", () => {
		expect(faluSpawnRadiusMultiplier(100)).toBe(MIN_SPAWN_RADIUS_MULT);
	});

	it("decreases linearly", () => {
		const a = faluSpawnRadiusMultiplier(2);
		const b = faluSpawnRadiusMultiplier(4);
		expect(b).toBeLessThan(a);
	});
});
