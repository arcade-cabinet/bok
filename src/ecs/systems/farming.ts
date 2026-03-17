// ─── Farming System ───
// Manages crop growth over day cycles. Crops planted at block positions grow
// through stages (Seed → Sprout → Mature → Harvestable). Berkanan rune
// proximity accelerates growth. Harvesting resets the crop to seed.

import type { World } from "koota";
import { BlockId } from "../../world/blocks.ts";
import type { FarmPlotEntry } from "../traits/index.ts";
import { FarmPlots, PlayerTag } from "../traits/index.ts";
import { type GrowthZone, getBestGrowthMultiplier } from "./berkanan-grow.ts";
import { FoodId } from "./food.ts";

// ─── Crop & Growth Data ───

export const CropType = {
	Wheat: 0,
	Berry: 1,
	Mushroom: 2,
	Sapling: 3,
} as const;

export const GrowthStage = {
	Seed: 0,
	Sprout: 1,
	Mature: 2,
	Harvestable: 3,
} as const;

/** Days required per stage transition: [Seed→Sprout, Sprout→Mature, Mature→Harvestable]. */
export const GROWTH_DAYS: Record<number, number[]> = {
	[CropType.Wheat]: [1, 1, 1],
	[CropType.Berry]: [1, 2, 1],
	[CropType.Mushroom]: [1, 1, 2],
	[CropType.Sapling]: [2, 3, 3],
};

/** Harvest yield per crop type: { itemId, qty }. */
const HARVEST_YIELD: Record<number, { itemId: number; qty: number }> = {
	[CropType.Wheat]: { itemId: FoodId.Wheat, qty: 2 },
	[CropType.Berry]: { itemId: FoodId.Berry, qty: 3 },
	[CropType.Mushroom]: { itemId: BlockId.Mushroom, qty: 3 },
	[CropType.Sapling]: { itemId: BlockId.Wood, qty: 4 },
};

// ─── Actions ───

/** Plant a crop at a position. Returns false if the plot is already occupied. */
export function plantCrop(
	farmPlots: { plots: Record<string, FarmPlotEntry> },
	x: number,
	y: number,
	z: number,
	cropType: number,
): boolean {
	const key = `${x},${y},${z}`;
	if (key in farmPlots.plots) return false;
	farmPlots.plots[key] = { cropType, stage: GrowthStage.Seed, growthProgress: 0 };
	return true;
}

/** Harvest a crop. Returns the yield or null if not harvestable. */
export function harvestCrop(
	farmPlots: { plots: Record<string, FarmPlotEntry> },
	x: number,
	y: number,
	z: number,
): { itemId: number; qty: number } | null {
	const key = `${x},${y},${z}`;
	const plot = farmPlots.plots[key];
	if (!plot || plot.stage !== GrowthStage.Harvestable) return null;

	const yield_ = HARVEST_YIELD[plot.cropType];
	if (!yield_) return null;

	// Reset to seed for next cycle
	plot.stage = GrowthStage.Seed;
	plot.growthProgress = 0;
	return { itemId: yield_.itemId, qty: yield_.qty };
}

// ─── System ───

/**
 * Farming ECS system. Advances crop growth when day count changes.
 * Berkanan growth zones multiply effective days.
 * Tracks lastProcessedDay on the FarmPlots trait (no module-level state).
 */
export function farmingSystem(world: World, currentDayCount: number, growthZones: ReadonlyArray<GrowthZone>) {
	world.query(PlayerTag, FarmPlots).updateEach(([plots]) => {
		if (plots.lastProcessedDay < 0) {
			plots.lastProcessedDay = currentDayCount;
			return;
		}

		const daysPassed = currentDayCount - plots.lastProcessedDay;
		plots.lastProcessedDay = currentDayCount;
		if (daysPassed <= 0) return;

		for (const [key, plot] of Object.entries(plots.plots)) {
			if (plot.stage >= GrowthStage.Harvestable) continue;

			const stages = GROWTH_DAYS[plot.cropType];
			if (!stages) continue;

			// Parse position for Berkanan zone check
			const [px, py, pz] = key.split(",").map(Number);
			const mult = getBestGrowthMultiplier(px, py, pz, growthZones);
			let effectiveDays = daysPassed * mult;

			// Advance through stages
			while (effectiveDays > 0 && plot.stage < GrowthStage.Harvestable) {
				const daysForStage = stages[plot.stage];
				const remaining = daysForStage - plot.growthProgress * daysForStage;

				if (effectiveDays >= remaining) {
					effectiveDays -= remaining;
					plot.stage++;
					plot.growthProgress = 0;
				} else {
					plot.growthProgress += effectiveDays / daysForStage;
					effectiveDays = 0;
				}
			}
		}
	});
}
