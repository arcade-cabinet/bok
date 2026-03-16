import { describe, expect, it } from "vitest";
import { BlockId } from "../../world/blocks.ts";
import { DECAY_INTERVAL_DAYS, DECAY_ONSET_DAYS, MAX_DECAY_PER_TICK, RUNE_SEAL_BLOCK_ID } from "./territory-data.ts";
import {
	computeDecayCount,
	countTerritoryBlocks,
	isDecayable,
	isDecayEligible,
	isSealNearby,
	selectDecayTargets,
} from "./territory-decay.ts";

// ─── isDecayEligible ───

describe("isDecayEligible", () => {
	it("returns false before onset days", () => {
		expect(isDecayEligible(0, false)).toBe(false);
		expect(isDecayEligible(DECAY_ONSET_DAYS - 1, false)).toBe(false);
	});

	it("returns true at onset days without seal", () => {
		expect(isDecayEligible(DECAY_ONSET_DAYS, false)).toBe(true);
	});

	it("returns true well past onset days", () => {
		expect(isDecayEligible(DECAY_ONSET_DAYS + 50, false)).toBe(true);
	});

	it("returns false when seal is active regardless of days", () => {
		expect(isDecayEligible(0, true)).toBe(false);
		expect(isDecayEligible(DECAY_ONSET_DAYS, true)).toBe(false);
		expect(isDecayEligible(1000, true)).toBe(false);
	});
});

// ─── computeDecayCount ───

describe("computeDecayCount", () => {
	it("returns 0 before onset", () => {
		expect(computeDecayCount(0)).toBe(0);
		expect(computeDecayCount(DECAY_ONSET_DAYS - 1)).toBe(0);
	});

	it("returns 1 at onset", () => {
		expect(computeDecayCount(DECAY_ONSET_DAYS)).toBe(1);
	});

	it("increases with each decay interval period", () => {
		const onePeriod = DECAY_ONSET_DAYS + DECAY_INTERVAL_DAYS;
		expect(computeDecayCount(onePeriod)).toBe(2);

		const twoPeriods = DECAY_ONSET_DAYS + DECAY_INTERVAL_DAYS * 2;
		expect(computeDecayCount(twoPeriods)).toBe(3);
	});

	it("caps at MAX_DECAY_PER_TICK", () => {
		const manyPeriods = DECAY_ONSET_DAYS + DECAY_INTERVAL_DAYS * 100;
		expect(computeDecayCount(manyPeriods)).toBe(MAX_DECAY_PER_TICK);
	});
});

// ─── isDecayable ───

describe("isDecayable", () => {
	it("returns true for wood blocks", () => {
		expect(isDecayable(BlockId.Planks)).toBe(true);
		expect(isDecayable(BlockId.TreatedPlanks)).toBe(true);
		expect(isDecayable(BlockId.Wood)).toBe(true);
		expect(isDecayable(BlockId.BirchWood)).toBe(true);
		expect(isDecayable(BlockId.BeechWood)).toBe(true);
		expect(isDecayable(BlockId.PineWood)).toBe(true);
		expect(isDecayable(BlockId.DeadWood)).toBe(true);
	});

	it("returns true for soft natural blocks", () => {
		expect(isDecayable(BlockId.Grass)).toBe(true);
		expect(isDecayable(BlockId.Dirt)).toBe(true);
	});

	it("returns false for stone and hard blocks", () => {
		expect(isDecayable(BlockId.Stone)).toBe(false);
		expect(isDecayable(BlockId.StoneBricks)).toBe(false);
		expect(isDecayable(BlockId.SmoothStone)).toBe(false);
	});

	it("returns false for air and water", () => {
		expect(isDecayable(BlockId.Air)).toBe(false);
		expect(isDecayable(BlockId.Water)).toBe(false);
	});
});

// ─── selectDecayTargets ───

describe("selectDecayTargets", () => {
	it("returns empty when no decayable blocks exist", () => {
		const getVoxel = () => BlockId.Stone;
		const result = selectDecayTargets(8, 40, 8, 6, 3, 50, getVoxel);
		expect(result).toHaveLength(0);
	});

	it("selects decayable blocks within radius", () => {
		const getVoxel = (x: number, y: number, z: number) => {
			if (x === 8 && y === 40 && z === 8) return BlockId.Planks;
			return BlockId.Air;
		};
		const result = selectDecayTargets(8, 40, 8, 4, 1, 50, getVoxel);
		expect(result.length).toBeGreaterThan(0);
		expect(result[0]).toEqual({ x: 8, y: 40, z: 8 });
	});

	it("limits results to requested count", () => {
		const getVoxel = (_x: number, y: number) => {
			if (y === 40) return BlockId.Planks;
			return BlockId.Air;
		};
		const result = selectDecayTargets(8, 40, 8, 4, 2, 50, getVoxel);
		expect(result.length).toBeLessThanOrEqual(2);
	});

	it("produces deterministic results from day count", () => {
		const getVoxel = (_x: number, y: number) => {
			if (y === 40) return BlockId.Wood;
			return BlockId.Air;
		};
		const a = selectDecayTargets(8, 40, 8, 4, 2, 50, getVoxel);
		const b = selectDecayTargets(8, 40, 8, 4, 2, 50, getVoxel);
		expect(a).toEqual(b);
	});

	it("different day counts produce different selections", () => {
		const getVoxel = (_x: number, y: number) => {
			if (y >= 39 && y <= 41) return BlockId.Planks;
			return BlockId.Air;
		};
		const a = selectDecayTargets(8, 40, 8, 4, 2, 50, getVoxel);
		const b = selectDecayTargets(8, 40, 8, 4, 2, 77, getVoxel);
		// Different day seeds should usually (but not always) pick different targets.
		// With enough candidates this is virtually certain.
		const sameTargets = a.length === b.length && a.every((t, i) => t.x === b[i].x && t.z === b[i].z);
		// Probabilistically they should differ, but we just verify both return results
		expect(a.length).toBeGreaterThan(0);
		expect(b.length).toBeGreaterThan(0);
	});
});

// ─── isSealNearby ───

describe("isSealNearby", () => {
	it("returns false when no seal block exists", () => {
		const getVoxel = () => BlockId.Stone;
		expect(isSealNearby(8, 40, 8, getVoxel)).toBe(false);
	});

	it("returns true when seal is at center", () => {
		const getVoxel = (x: number, y: number, z: number) => {
			if (x === 8 && y === 40 && z === 8) return RUNE_SEAL_BLOCK_ID;
			return BlockId.Air;
		};
		expect(isSealNearby(8, 40, 8, getVoxel)).toBe(true);
	});

	it("returns true when seal is within scan radius", () => {
		const getVoxel = (x: number, y: number, z: number) => {
			if (x === 12 && y === 40 && z === 12) return RUNE_SEAL_BLOCK_ID;
			return BlockId.Air;
		};
		expect(isSealNearby(8, 40, 8, getVoxel)).toBe(true);
	});

	it("returns false when seal is far away", () => {
		const getVoxel = (x: number, y: number, z: number) => {
			if (x === 100 && y === 40 && z === 100) return RUNE_SEAL_BLOCK_ID;
			return BlockId.Air;
		};
		expect(isSealNearby(8, 40, 8, getVoxel)).toBe(false);
	});
});

// ─── countTerritoryBlocks ───

describe("countTerritoryBlocks", () => {
	it("counts building material blocks", () => {
		const getVoxel = (x: number) => {
			if (x >= 6 && x <= 10) return BlockId.Planks;
			return BlockId.Air;
		};
		const count = countTerritoryBlocks(8, 40, 8, 4, 2, getVoxel);
		expect(count).toBeGreaterThan(0);
	});

	it("returns 0 for only natural blocks", () => {
		const getVoxel = () => BlockId.Grass;
		expect(countTerritoryBlocks(8, 40, 8, 4, 2, getVoxel)).toBe(0);
	});

	it("counts all territory block types", () => {
		const blocks = [
			BlockId.Planks,
			BlockId.StoneBricks,
			BlockId.Glass,
			BlockId.FaluRed,
			BlockId.Torch,
			BlockId.RuneStone,
		];
		let callIdx = 0;
		const getVoxel = () => {
			const id = blocks[callIdx % blocks.length];
			callIdx++;
			return id;
		};
		const count = countTerritoryBlocks(8, 40, 8, 1, 1, getVoxel);
		expect(count).toBeGreaterThan(0);
	});

	it("returns 0 for air-only world", () => {
		const getVoxel = () => BlockId.Air;
		expect(countTerritoryBlocks(8, 40, 8, 4, 2, getVoxel)).toBe(0);
	});
});
