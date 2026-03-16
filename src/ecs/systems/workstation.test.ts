import { describe, expect, it } from "vitest";
import { BlockId, RECIPES } from "../../world/blocks.ts";
import {
	getAvailableRecipes,
	getWorkstationBlockTier,
	isWorkstation,
	scanNearbyWorkstationTier,
	WORKSTATION_RADIUS,
} from "./workstation.ts";

describe("workstation data", () => {
	it("identifies workstation blocks", () => {
		expect(isWorkstation(BlockId.CraftingBench)).toBe(true);
		expect(isWorkstation(BlockId.Forge)).toBe(true);
		expect(isWorkstation(BlockId.Scriptorium)).toBe(true);
	});

	it("rejects non-workstation blocks", () => {
		expect(isWorkstation(BlockId.Stone)).toBe(false);
		expect(isWorkstation(BlockId.Planks)).toBe(false);
		expect(isWorkstation(BlockId.Air)).toBe(false);
		expect(isWorkstation(0)).toBe(false);
	});

	it("returns correct tier for each workstation", () => {
		expect(getWorkstationBlockTier(BlockId.CraftingBench)).toBe(1);
		expect(getWorkstationBlockTier(BlockId.Forge)).toBe(2);
		expect(getWorkstationBlockTier(BlockId.Scriptorium)).toBe(3);
	});

	it("returns undefined for non-workstations", () => {
		expect(getWorkstationBlockTier(BlockId.Stone)).toBeUndefined();
		expect(getWorkstationBlockTier(0)).toBeUndefined();
	});

	it("has a positive scan radius", () => {
		expect(WORKSTATION_RADIUS).toBeGreaterThan(0);
	});
});

describe("scanNearbyWorkstationTier", () => {
	it("returns 0 when no workstations nearby", () => {
		const getVoxel = () => BlockId.Air;
		expect(scanNearbyWorkstationTier(5, 5, 5, getVoxel)).toBe(0);
	});

	it("detects crafting bench (tier 1) within radius", () => {
		const getVoxel = (x: number, y: number, z: number) => {
			if (x === 7 && y === 5 && z === 5) return BlockId.CraftingBench;
			return BlockId.Air;
		};
		expect(scanNearbyWorkstationTier(5, 5, 5, getVoxel)).toBe(1);
	});

	it("detects forge (tier 2) within radius", () => {
		const getVoxel = (x: number, _y: number, z: number) => {
			if (x === 5 && z === 8) return BlockId.Forge;
			return BlockId.Air;
		};
		expect(scanNearbyWorkstationTier(5, 5, 5, getVoxel)).toBe(2);
	});

	it("detects scriptorium (tier 3) within radius", () => {
		const getVoxel = (x: number, _y: number, _z: number) => {
			if (x === 3) return BlockId.Scriptorium;
			return BlockId.Air;
		};
		expect(scanNearbyWorkstationTier(5, 5, 5, getVoxel)).toBe(3);
	});

	it("returns the highest tier when multiple workstations present", () => {
		const getVoxel = (x: number, y: number, z: number) => {
			if (x === 6 && y === 5 && z === 5) return BlockId.CraftingBench;
			if (x === 4 && y === 5 && z === 5) return BlockId.Forge;
			return BlockId.Air;
		};
		expect(scanNearbyWorkstationTier(5, 5, 5, getVoxel)).toBe(2);
	});

	it("ignores workstations beyond scan radius", () => {
		const getVoxel = (x: number, y: number, z: number) => {
			// Place bench far away (beyond radius)
			if (x === 5 + WORKSTATION_RADIUS + 5 && y === 5 && z === 5) return BlockId.CraftingBench;
			return BlockId.Air;
		};
		expect(scanNearbyWorkstationTier(5, 5, 5, getVoxel)).toBe(0);
	});

	it("floors player position to block coords", () => {
		// Player at 5.7, 10.3, 5.9 → block 5, 10, 5
		const getVoxel = (x: number, y: number, z: number) => {
			if (x === 6 && y === 10 && z === 6) return BlockId.CraftingBench;
			return BlockId.Air;
		};
		expect(scanNearbyWorkstationTier(5.7, 10.3, 5.9, getVoxel)).toBe(1);
	});

	it("early exits when max tier (3) found", () => {
		let callCount = 0;
		const getVoxel = (_x: number, _y: number, _z: number) => {
			callCount++;
			return BlockId.Scriptorium; // Every block is tier 3
		};
		const result = scanNearbyWorkstationTier(5, 5, 5, getVoxel);
		expect(result).toBe(3);
		// Should exit early, not scan all blocks
		expect(callCount).toBeLessThan(100);
	});
});

describe("getAvailableRecipes", () => {
	it("returns only tier 0 recipes with no workstation", () => {
		const available = getAvailableRecipes(RECIPES, 0);
		for (const r of available) {
			expect(r.tier).toBe(0);
		}
		expect(available.length).toBeGreaterThan(0);
	});

	it("returns tier 0 and 1 recipes near a crafting bench", () => {
		const available = getAvailableRecipes(RECIPES, 1);
		for (const r of available) {
			expect(r.tier).toBeLessThanOrEqual(1);
		}
		// Should include more recipes than tier 0 alone
		const tier0 = getAvailableRecipes(RECIPES, 0);
		expect(available.length).toBeGreaterThan(tier0.length);
	});

	it("returns tier 0-2 recipes near a forge", () => {
		const available = getAvailableRecipes(RECIPES, 2);
		for (const r of available) {
			expect(r.tier).toBeLessThanOrEqual(2);
		}
		const tier1 = getAvailableRecipes(RECIPES, 1);
		expect(available.length).toBeGreaterThan(tier1.length);
	});

	it("returns all recipes near a scriptorium", () => {
		const available = getAvailableRecipes(RECIPES, 3);
		expect(available.length).toBe(RECIPES.length);
	});

	it("crafting bench recipe is available by hand (tier 0)", () => {
		const available = getAvailableRecipes(RECIPES, 0);
		const benchRecipe = available.find((r) => r.id === "crafting_bench");
		expect(benchRecipe).toBeDefined();
	});

	it("forge recipe requires crafting bench (tier 1)", () => {
		const tier0 = getAvailableRecipes(RECIPES, 0);
		expect(tier0.find((r) => r.id === "forge")).toBeUndefined();

		const tier1 = getAvailableRecipes(RECIPES, 1);
		expect(tier1.find((r) => r.id === "forge")).toBeDefined();
	});

	it("iron tools require forge (tier 2)", () => {
		const tier1 = getAvailableRecipes(RECIPES, 1);
		expect(tier1.find((r) => r.id === "iron_pick")).toBeUndefined();

		const tier2 = getAvailableRecipes(RECIPES, 2);
		expect(tier2.find((r) => r.id === "iron_pick")).toBeDefined();
		expect(tier2.find((r) => r.id === "iron_axe")).toBeDefined();
		expect(tier2.find((r) => r.id === "iron_sword")).toBeDefined();
	});
});

describe("recipe data integrity", () => {
	it("all recipes have a valid tier", () => {
		for (const r of RECIPES) {
			expect([0, 1, 2, 3]).toContain(r.tier);
		}
	});

	it("all recipes have unique ids", () => {
		const ids = RECIPES.map((r) => r.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("hand-craft recipes include basic essentials", () => {
		const tier0 = getAvailableRecipes(RECIPES, 0);
		const ids = tier0.map((r) => r.id);
		expect(ids).toContain("planks");
		expect(ids).toContain("torch");
		expect(ids).toContain("wood_axe");
	});
});
