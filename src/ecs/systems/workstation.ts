// ─── Workstation Data ───
// Pure data: workstation block → tier mapping, proximity detection, recipe filtering.
// No ECS, no Three.js — just lookup tables and pure functions.

import type { RecipeTier } from "../../world/blocks.ts";
import { BlockId, type CraftRecipe } from "../../world/blocks.ts";

/** Radius (in blocks) to scan for nearby workstations. */
export const WORKSTATION_RADIUS = 4;

/** Map of workstation BlockId → recipe tier it unlocks. */
const WORKSTATION_TIER: Record<number, RecipeTier> = {
	[BlockId.CraftingBench]: 1,
	[BlockId.Forge]: 2,
	[BlockId.Scriptorium]: 3,
};

/** Whether a block ID is a workstation. */
export function isWorkstation(blockId: number): boolean {
	return blockId in WORKSTATION_TIER;
}

/** Get the recipe tier a workstation unlocks, or undefined for non-workstations. */
export function getWorkstationBlockTier(blockId: number): RecipeTier | undefined {
	return WORKSTATION_TIER[blockId];
}

/**
 * Scan a cubic volume around the player to find the highest workstation tier nearby.
 * Returns 0 (hand-craft) if no workstation is found.
 *
 * @param px - Player X position (floored to block coords internally)
 * @param py - Player Y position
 * @param pz - Player Z position
 * @param getVoxel - Voxel accessor function (avoids Three.js dependency)
 */
export function scanNearbyWorkstationTier(
	px: number,
	py: number,
	pz: number,
	getVoxel: (x: number, y: number, z: number) => number,
): RecipeTier {
	const bx = Math.floor(px);
	const by = Math.floor(py);
	const bz = Math.floor(pz);

	let maxTier: RecipeTier = 0;

	for (let dx = -WORKSTATION_RADIUS; dx <= WORKSTATION_RADIUS; dx++) {
		for (let dz = -WORKSTATION_RADIUS; dz <= WORKSTATION_RADIUS; dz++) {
			// Scan 3 vertical blocks around player (feet, torso, head level)
			for (let dy = -1; dy <= 2; dy++) {
				const blockId = getVoxel(bx + dx, by + dy, bz + dz);
				const tier = WORKSTATION_TIER[blockId];
				if (tier !== undefined && tier > maxTier) {
					maxTier = tier;
					if (maxTier === 3) return 3; // Early exit: can't go higher
				}
			}
		}
	}

	return maxTier;
}

/** Filter recipes to only those available at the given workstation tier. */
export function getAvailableRecipes(recipes: CraftRecipe[], maxTier: RecipeTier): CraftRecipe[] {
	return recipes.filter((r) => r.tier <= maxTier);
}
