import { describe, expect, it } from "vitest";
import { createTestWorld, spawnPlayer, spawnWorldTime } from "../../test-utils.ts";
import { BlockId } from "../../world/blocks.ts";
import { FarmPlots } from "../traits/index.ts";
import type { GrowthZone } from "./berkanan-grow.ts";
import { CropType, farmingSystem, GROWTH_DAYS, GrowthStage, harvestCrop, plantCrop } from "./farming.ts";
import { FoodId } from "./food.ts";

/** Spawn player + world time + farm plots for farming tests. */
function setupFarming(startDay = 1) {
	const world = createTestWorld();
	const player = spawnPlayer(world);
	player.add(FarmPlots);
	spawnWorldTime(world, { dayCount: startDay });

	// Initialize the system at the starting day
	farmingSystem(world, startDay, []);

	return { world, player };
}

describe("plantCrop", () => {
	it("adds a crop at the specified position", () => {
		const { player } = setupFarming();
		const plots = player.get(FarmPlots);
		const ok = plantCrop(plots, 10, 5, 10, CropType.Wheat);

		expect(ok).toBe(true);
		expect(plots.plots["10,5,10"]).toEqual({
			cropType: CropType.Wheat,
			stage: GrowthStage.Seed,
			growthProgress: 0,
		});
	});

	it("rejects planting on an occupied plot", () => {
		const { player } = setupFarming();
		const plots = player.get(FarmPlots);
		plantCrop(plots, 10, 5, 10, CropType.Wheat);
		const ok = plantCrop(plots, 10, 5, 10, CropType.Berry);

		expect(ok).toBe(false);
	});

	it("supports all crop types", () => {
		const { player } = setupFarming();
		const plots = player.get(FarmPlots);

		plantCrop(plots, 0, 0, 0, CropType.Wheat);
		plantCrop(plots, 1, 0, 0, CropType.Berry);
		plantCrop(plots, 2, 0, 0, CropType.Mushroom);
		plantCrop(plots, 3, 0, 0, CropType.Sapling);

		expect(Object.keys(plots.plots)).toHaveLength(4);
	});
});

describe("farmingSystem", () => {
	it("does nothing when day count hasn't changed", () => {
		const { world, player } = setupFarming(5);
		const plots = player.get(FarmPlots);
		plantCrop(plots, 0, 0, 0, CropType.Wheat);

		// Same day — no growth
		farmingSystem(world, 5, []);

		expect(plots.plots["0,0,0"].stage).toBe(GrowthStage.Seed);
		expect(plots.plots["0,0,0"].growthProgress).toBe(0);
	});

	it("advances growth when a new day passes", () => {
		const { world, player } = setupFarming(1);
		const plots = player.get(FarmPlots);
		plantCrop(plots, 0, 0, 0, CropType.Wheat);

		// Advance to day 2 (1 day passes)
		farmingSystem(world, 2, []);

		const plot = plots.plots["0,0,0"];
		// Wheat: 1 day Seed→Sprout. 1 day passed → Sprout
		expect(plot.stage).toBe(GrowthStage.Sprout);
		expect(plot.growthProgress).toBe(0);
	});

	it("grows through multiple stages over multiple days", () => {
		const { world, player } = setupFarming(1);
		const plots = player.get(FarmPlots);
		plantCrop(plots, 0, 0, 0, CropType.Wheat);

		// Wheat: Seed→Sprout(1d) + Sprout→Mature(1d) + Mature→Harvestable(1d) = 3 days
		farmingSystem(world, 4, []);

		expect(plots.plots["0,0,0"].stage).toBe(GrowthStage.Harvestable);
	});

	it("stops at harvestable stage", () => {
		const { world, player } = setupFarming(1);
		const plots = player.get(FarmPlots);
		plantCrop(plots, 0, 0, 0, CropType.Wheat);

		farmingSystem(world, 10, []);

		expect(plots.plots["0,0,0"].stage).toBe(GrowthStage.Harvestable);
	});

	it("Berkanan rune accelerates growth", () => {
		const { world, player } = setupFarming(1);
		const plots = player.get(FarmPlots);
		// Berry: 1d + 2d + 1d = 4 days normally
		plantCrop(plots, 5, 0, 5, CropType.Berry);

		// Berkanan zone at (5,0,5) with 2x multiplier
		const zones: GrowthZone[] = [{ x: 5, y: 0, z: 5, radius: 8, multiplier: 2 }];

		// 2 days × 2x multiplier = 4 effective days → harvestable
		farmingSystem(world, 3, zones);

		expect(plots.plots["5,0,5"].stage).toBe(GrowthStage.Harvestable);
	});

	it("saplings take longer to grow", () => {
		const { world, player } = setupFarming(1);
		const plots = player.get(FarmPlots);
		plantCrop(plots, 0, 0, 0, CropType.Sapling);

		// Sapling: 2d + 3d + 3d = 8 days total
		// After 4 days: 2d for Seed→Sprout, then 2 of 3 days into Sprout→Mature
		farmingSystem(world, 5, []);

		expect(plots.plots["0,0,0"].stage).toBe(GrowthStage.Sprout);
	});

	it("grows multiple plots independently", () => {
		const { world, player } = setupFarming(1);
		const plots = player.get(FarmPlots);
		plantCrop(plots, 0, 0, 0, CropType.Wheat);
		plantCrop(plots, 5, 0, 0, CropType.Sapling);

		// 3 days pass
		farmingSystem(world, 4, []);

		// Wheat (3d total) → harvestable
		expect(plots.plots["0,0,0"].stage).toBe(GrowthStage.Harvestable);
		// Sapling (8d total, 2d for first stage) → in sprout stage
		expect(plots.plots["5,0,0"].stage).toBe(GrowthStage.Sprout);
	});
});

describe("harvestCrop", () => {
	it("returns harvest item and resets to seed", () => {
		const { player } = setupFarming();
		const plots = player.get(FarmPlots);
		plantCrop(plots, 0, 0, 0, CropType.Wheat);
		plots.plots["0,0,0"].stage = GrowthStage.Harvestable;

		const result = harvestCrop(plots, 0, 0, 0);

		expect(result).not.toBeNull();
		expect(result?.itemId).toBe(FoodId.Wheat);
		expect(result?.qty).toBe(2);
		// Plot resets to seed
		expect(plots.plots["0,0,0"].stage).toBe(GrowthStage.Seed);
		expect(plots.plots["0,0,0"].growthProgress).toBe(0);
	});

	it("rejects harvest when not harvestable", () => {
		const { player } = setupFarming();
		const plots = player.get(FarmPlots);
		plantCrop(plots, 0, 0, 0, CropType.Wheat);

		const result = harvestCrop(plots, 0, 0, 0);

		expect(result).toBeNull();
	});

	it("rejects harvest on empty plot", () => {
		const { player } = setupFarming();
		const plots = player.get(FarmPlots);

		const result = harvestCrop(plots, 0, 0, 0);

		expect(result).toBeNull();
	});

	it("saplings yield wood blocks", () => {
		const { player } = setupFarming();
		const plots = player.get(FarmPlots);
		plantCrop(plots, 0, 0, 0, CropType.Sapling);
		plots.plots["0,0,0"].stage = GrowthStage.Harvestable;

		const result = harvestCrop(plots, 0, 0, 0);

		expect(result?.itemId).toBe(BlockId.Wood);
		expect(result?.qty).toBe(4);
	});

	it("mushrooms yield mushroom blocks", () => {
		const { player } = setupFarming();
		const plots = player.get(FarmPlots);
		plantCrop(plots, 0, 0, 0, CropType.Mushroom);
		plots.plots["0,0,0"].stage = GrowthStage.Harvestable;

		const result = harvestCrop(plots, 0, 0, 0);

		expect(result?.itemId).toBe(BlockId.Mushroom);
		expect(result?.qty).toBe(3);
	});

	it("berries yield berry food", () => {
		const { player } = setupFarming();
		const plots = player.get(FarmPlots);
		plantCrop(plots, 0, 0, 0, CropType.Berry);
		plots.plots["0,0,0"].stage = GrowthStage.Harvestable;

		const result = harvestCrop(plots, 0, 0, 0);

		expect(result?.itemId).toBe(FoodId.Berry);
		expect(result?.qty).toBe(3);
	});
});

describe("GROWTH_DAYS", () => {
	it("all crop types have 3 stage durations", () => {
		for (const key of Object.values(CropType)) {
			expect(GROWTH_DAYS[key]).toHaveLength(3);
			for (const d of GROWTH_DAYS[key]) {
				expect(d).toBeGreaterThan(0);
			}
		}
	});
});
