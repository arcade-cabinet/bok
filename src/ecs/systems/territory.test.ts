import { beforeEach, describe, expect, it } from "vitest";
import { createTestWorld, spawnPlayer, spawnWorldTime } from "../../test-utils.ts";
import { BlockId } from "../../world/blocks.ts";
import { TerritoryState } from "../traits/index.ts";
import { getActiveTerritoryZones, resetTerritoryState, type TerritoryEffects, territorySystem } from "./territory.ts";
import {
	computeTerritoryDensity,
	computeTerritoryRadius,
	DECAY_ONSET_DAYS,
	hostileSpawnMultiplier,
	isInTerritory,
	isTerritoryBlock,
	MAX_DENSITY_BLOCKS,
	passiveSpawnBonus,
	RUNE_SEAL_BLOCK_ID,
	SETTLED_THRESHOLD,
	type TerritoryZone,
} from "./territory-data.ts";
import {
	computeDecayCount,
	countTerritoryBlocks,
	isDecayable,
	isDecayEligible,
	isSealNearby,
	selectDecayTargets,
} from "./territory-decay.ts";

// ─── territory-data.ts ───

describe("isTerritoryBlock", () => {
	it("identifies building materials", () => {
		expect(isTerritoryBlock(BlockId.Planks)).toBe(true);
		expect(isTerritoryBlock(BlockId.StoneBricks)).toBe(true);
		expect(isTerritoryBlock(BlockId.FaluRed)).toBe(true);
		expect(isTerritoryBlock(BlockId.Torch)).toBe(true);
		expect(isTerritoryBlock(BlockId.Forge)).toBe(true);
	});

	it("rejects natural terrain blocks", () => {
		expect(isTerritoryBlock(BlockId.Grass)).toBe(false);
		expect(isTerritoryBlock(BlockId.Dirt)).toBe(false);
		expect(isTerritoryBlock(BlockId.Stone)).toBe(false);
		expect(isTerritoryBlock(BlockId.Water)).toBe(false);
		expect(isTerritoryBlock(BlockId.Air)).toBe(false);
	});
});

describe("computeTerritoryDensity", () => {
	it("returns 0 for no blocks", () => {
		expect(computeTerritoryDensity(0)).toBe(0);
	});

	it("returns proportional density", () => {
		expect(computeTerritoryDensity(40)).toBeCloseTo(40 / MAX_DENSITY_BLOCKS);
	});

	it("clamps to 1.0 at max", () => {
		expect(computeTerritoryDensity(MAX_DENSITY_BLOCKS)).toBe(1.0);
		expect(computeTerritoryDensity(200)).toBe(1.0);
	});
});

describe("computeTerritoryRadius", () => {
	it("returns 0 below threshold", () => {
		expect(computeTerritoryRadius(0)).toBe(0);
		expect(computeTerritoryRadius(SETTLED_THRESHOLD - 0.01)).toBe(0);
	});

	it("returns radius at threshold", () => {
		const r = computeTerritoryRadius(SETTLED_THRESHOLD);
		expect(r).toBeGreaterThan(0);
		expect(r).toBeGreaterThanOrEqual(8);
	});

	it("scales with density", () => {
		const rLow = computeTerritoryRadius(0.3);
		const rHigh = computeTerritoryRadius(0.8);
		expect(rHigh).toBeGreaterThan(rLow);
	});

	it("max radius at density 1.0", () => {
		expect(computeTerritoryRadius(1.0)).toBe(32);
	});
});

describe("hostileSpawnMultiplier", () => {
	it("returns 1.0 below threshold", () => {
		expect(hostileSpawnMultiplier(0)).toBe(1.0);
		expect(hostileSpawnMultiplier(SETTLED_THRESHOLD - 0.01)).toBe(1.0);
	});

	it("decreases with density", () => {
		const mLow = hostileSpawnMultiplier(0.3);
		const mHigh = hostileSpawnMultiplier(0.8);
		expect(mLow).toBeGreaterThan(mHigh);
	});

	it("floors at 0.2", () => {
		expect(hostileSpawnMultiplier(1.0)).toBe(0.2);
	});
});

describe("passiveSpawnBonus", () => {
	it("returns 0 below threshold", () => {
		expect(passiveSpawnBonus(0)).toBe(0);
	});

	it("increases with density", () => {
		expect(passiveSpawnBonus(0.5)).toBeGreaterThan(passiveSpawnBonus(0.3));
	});

	it("max bonus at density 1.0", () => {
		expect(passiveSpawnBonus(1.0)).toBe(2.0);
	});
});

describe("isInTerritory", () => {
	const zones: TerritoryZone[] = [
		{ cx: 0, cz: 0, density: 0.5, radius: 16, sealActive: false, centerX: 8, centerZ: 8 },
	];

	it("returns zone when inside radius", () => {
		const result = isInTerritory(zones, 10, 10);
		expect(result).not.toBeNull();
		expect(result?.density).toBe(0.5);
	});

	it("returns null when outside radius", () => {
		expect(isInTerritory(zones, 100, 100)).toBeNull();
	});

	it("returns null for empty zones", () => {
		expect(isInTerritory([], 8, 8)).toBeNull();
	});
});

// ─── territory-decay.ts ───

describe("isDecayEligible", () => {
	it("not eligible before onset days", () => {
		expect(isDecayEligible(0, false)).toBe(false);
		expect(isDecayEligible(29, false)).toBe(false);
	});

	it("eligible at onset days", () => {
		expect(isDecayEligible(DECAY_ONSET_DAYS, false)).toBe(true);
	});

	it("never eligible with seal", () => {
		expect(isDecayEligible(100, true)).toBe(false);
	});
});

describe("computeDecayCount", () => {
	it("returns 0 before onset", () => {
		expect(computeDecayCount(0)).toBe(0);
		expect(computeDecayCount(29)).toBe(0);
	});

	it("returns 1 at onset", () => {
		expect(computeDecayCount(DECAY_ONSET_DAYS)).toBe(1);
	});

	it("increases with elapsed periods", () => {
		expect(computeDecayCount(DECAY_ONSET_DAYS + 5)).toBe(2);
		expect(computeDecayCount(DECAY_ONSET_DAYS + 10)).toBe(3);
	});

	it("caps at max", () => {
		expect(computeDecayCount(DECAY_ONSET_DAYS + 100)).toBe(3);
	});
});

describe("isDecayable", () => {
	it("wood blocks are decayable", () => {
		expect(isDecayable(BlockId.Planks)).toBe(true);
		expect(isDecayable(BlockId.Wood)).toBe(true);
		expect(isDecayable(BlockId.BirchWood)).toBe(true);
	});

	it("stone blocks are not decayable", () => {
		expect(isDecayable(BlockId.Stone)).toBe(false);
		expect(isDecayable(BlockId.StoneBricks)).toBe(false);
	});

	it("grass and dirt are decayable", () => {
		expect(isDecayable(BlockId.Grass)).toBe(true);
		expect(isDecayable(BlockId.Dirt)).toBe(true);
	});
});

describe("selectDecayTargets", () => {
	it("returns empty for no decayable blocks", () => {
		const getVoxel = () => BlockId.Stone;
		const result = selectDecayTargets(8, 40, 8, 8, 3, 50, getVoxel);
		expect(result).toHaveLength(0);
	});

	it("selects decayable blocks", () => {
		const getVoxel = (x: number, y: number, z: number) => {
			if (x === 8 && y === 40 && z === 8) return BlockId.Planks;
			return BlockId.Air;
		};
		const result = selectDecayTargets(8, 40, 8, 4, 1, 50, getVoxel);
		expect(result.length).toBeGreaterThan(0);
		expect(result[0]).toEqual({ x: 8, y: 40, z: 8 });
	});

	it("caps at requested count", () => {
		const getVoxel = (_x: number, y: number, _z: number) => {
			if (y === 40) return BlockId.Planks;
			return BlockId.Air;
		};
		const result = selectDecayTargets(8, 40, 8, 4, 2, 50, getVoxel);
		expect(result.length).toBeLessThanOrEqual(2);
	});
});

describe("isSealNearby", () => {
	it("returns false when no seal present", () => {
		const getVoxel = () => BlockId.Stone;
		expect(isSealNearby(8, 40, 8, getVoxel)).toBe(false);
	});

	it("returns true when seal is nearby", () => {
		const getVoxel = (x: number, y: number, z: number) => {
			if (x === 8 && y === 40 && z === 8) return RUNE_SEAL_BLOCK_ID;
			return BlockId.Air;
		};
		expect(isSealNearby(8, 40, 8, getVoxel)).toBe(true);
	});
});

describe("countTerritoryBlocks", () => {
	it("counts building material blocks", () => {
		const getVoxel = (x: number, _y: number, _z: number) => {
			if (x >= 6 && x <= 10) return BlockId.Planks;
			return BlockId.Grass;
		};
		const count = countTerritoryBlocks(8, 40, 8, 4, 2, getVoxel);
		expect(count).toBeGreaterThan(0);
	});

	it("returns 0 for only natural blocks", () => {
		const getVoxel = () => BlockId.Grass;
		expect(countTerritoryBlocks(8, 40, 8, 4, 2, getVoxel)).toBe(0);
	});
});

// ─── territory.ts (ECS system) ───

describe("territorySystem", () => {
	beforeEach(() => {
		resetTerritoryState();
	});

	it("updates TerritoryState density after scan interval", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 8, y: 40, z: 8 } });
		spawnWorldTime(world, { dayCount: 1 });

		// Simulate territory blocks nearby
		const getVoxel = (x: number, _y: number, _z: number) => {
			if (x >= 4 && x <= 12) return BlockId.Planks;
			return BlockId.Air;
		};
		const effects: TerritoryEffects = {
			placeBlock: () => {},
			spawnParticles: () => {},
		};

		// Tick enough to trigger scan (2s interval)
		territorySystem(world, 2.1, getVoxel, effects);

		world.query(TerritoryState).readEach(([t]) => {
			expect(t.density).toBeGreaterThan(0);
			expect(t.radius).toBeGreaterThan(0);
			expect(t.hostileSpawnMult).toBeLessThan(1.0);
		});
	});

	it("does not update before scan interval", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 8, y: 40, z: 8 } });
		spawnWorldTime(world, { dayCount: 1 });

		const getVoxel = () => BlockId.Planks;
		const effects: TerritoryEffects = {
			placeBlock: () => {},
			spawnParticles: () => {},
		};

		territorySystem(world, 0.5, getVoxel, effects);

		world.query(TerritoryState).readEach(([t]) => {
			expect(t.density).toBe(0);
		});
	});

	it("detects seal and sets sealActive", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 8, y: 40, z: 8 } });
		spawnWorldTime(world, { dayCount: 1 });

		const getVoxel = (x: number, _y: number, _z: number) => {
			if (x === 10) return RUNE_SEAL_BLOCK_ID;
			if (x >= 4 && x <= 12) return BlockId.StoneBricks;
			return BlockId.Air;
		};
		const effects: TerritoryEffects = {
			placeBlock: () => {},
			spawnParticles: () => {},
		};

		territorySystem(world, 2.1, getVoxel, effects);

		world.query(TerritoryState).readEach(([t]) => {
			expect(t.sealActive).toBe(true);
		});
	});

	it("exposes territory zones via module cache", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 8, y: 40, z: 8 } });
		spawnWorldTime(world, { dayCount: 1 });

		const getVoxel = (x: number, _y: number, _z: number) => {
			if (x >= 4 && x <= 12) return BlockId.Planks;
			return BlockId.Air;
		};
		const effects: TerritoryEffects = {
			placeBlock: () => {},
			spawnParticles: () => {},
		};

		territorySystem(world, 2.1, getVoxel, effects);

		const zones = getActiveTerritoryZones();
		expect(zones.length).toBeGreaterThan(0);
		expect(zones[0].density).toBeGreaterThan(0);
	});

	it("does not decay when seal is active", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 8, y: 40, z: 8 } });
		spawnWorldTime(world, { dayCount: 100 });

		const placed: Array<{ x: number; y: number; z: number; blockId: number }> = [];
		const getVoxel = (x: number, _y: number, _z: number) => {
			if (x === 10) return RUNE_SEAL_BLOCK_ID;
			if (x >= 4 && x <= 12) return BlockId.Planks;
			return BlockId.Air;
		};
		const effects: TerritoryEffects = {
			placeBlock: (x, y, z, blockId) => placed.push({ x, y, z, blockId }),
			spawnParticles: () => {},
		};

		// Trigger density scan + decay check
		territorySystem(world, 2.1, getVoxel, effects);
		territorySystem(world, 2.0, getVoxel, effects);

		// No moss should be placed because seal is active
		expect(placed.length).toBe(0);
	});

	it("resets state cleanly", () => {
		resetTerritoryState();
		expect(getActiveTerritoryZones()).toHaveLength(0);
	});

	it("falu red blocks reduce morker spawn via existing system", () => {
		// This verifies the existing Falu Red mechanism still works
		// (it's in structure-detect.ts, not territory.ts, but the AC mentions it)
		const { faluSpawnRadiusMultiplier } = require("./structure-detect.ts");
		expect(faluSpawnRadiusMultiplier(10)).toBeLessThan(1.0);
		expect(faluSpawnRadiusMultiplier(0)).toBe(1.0);
	});
});
