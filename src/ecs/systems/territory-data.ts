// ─── Territory Data ───
// Pure data: territory block identification, density formulas, decay constants.
// No ECS, no Three.js — just lookup tables and math.

import { BlockId } from "../../world/blocks.ts";

// ─── Territory Blocks ───

/**
 * Blocks that indicate player settlement activity.
 * Natural terrain blocks (Grass, Dirt, Stone) are excluded.
 */
const TERRITORY_BLOCKS = new Set<number>([
	BlockId.Planks,
	BlockId.TreatedPlanks,
	BlockId.StoneBricks,
	BlockId.ReinforcedBricks,
	BlockId.Glass,
	BlockId.FaluRed,
	BlockId.Torch,
	BlockId.RuneStone,
	BlockId.CraftingBench,
	BlockId.Forge,
	BlockId.Scriptorium,
]);

/** Check if a block type contributes to territory density. */
export function isTerritoryBlock(blockId: number): boolean {
	return TERRITORY_BLOCKS.has(blockId);
}

// ─── Density Constants ───

/** Scan radius for territory density (blocks from player). */
export const TERRITORY_SCAN_RADIUS = 16;

/** Height range for territory scan (above and below player). */
export const TERRITORY_SCAN_HEIGHT = 6;

/** Blocks needed for maximum density (1.0). */
export const MAX_DENSITY_BLOCKS = 80;

/** Minimum density to count as "settled" territory. */
export const SETTLED_THRESHOLD = 0.15;

/** Compute territory density from block count. Clamped [0, 1]. */
export function computeTerritoryDensity(blockCount: number): number {
	if (blockCount <= 0) return 0;
	return Math.min(1.0, blockCount / MAX_DENSITY_BLOCKS);
}

/** Compute effective territory radius from density. */
export function computeTerritoryRadius(density: number): number {
	if (density < SETTLED_THRESHOLD) return 0;
	// Min radius 8, max radius 32 blocks, linearly scaled by density
	return 8 + density * 24;
}

// ─── Creature Influence ───

/** Hostile spawn suppression multiplier from territory density. Lower = fewer spawns. */
export function hostileSpawnMultiplier(density: number): number {
	if (density < SETTLED_THRESHOLD) return 1.0;
	// Density 0.15 → 0.85, density 1.0 → 0.2
	return Math.max(0.2, 1.0 - density * 0.8);
}

/** Passive creature attraction bonus. Higher density → higher spawn chance nearby. */
export function passiveSpawnBonus(density: number): number {
	if (density < SETTLED_THRESHOLD) return 0;
	// Density 0.15 → 0.3, density 1.0 → 2.0
	return density * 2.0;
}

// ─── Decay Constants ───

/** Game-days before unvisited structures begin decaying. */
export const DECAY_ONSET_DAYS = 30;

/** Game-days between each moss placement once decay starts. */
export const DECAY_INTERVAL_DAYS = 5;

/** Maximum moss blocks placed per decay tick. */
export const MAX_DECAY_PER_TICK = 3;

/** How often to check for decay (seconds). */
export const DECAY_CHECK_INTERVAL = 4.0;

/** Scan interval for territory density (seconds). Same as settlement. */
export const TERRITORY_SCAN_INTERVAL = 2.0;

// ─── Seal ───

/** RuneSeal block ID — placed to prevent decay permanently. */
export const RUNE_SEAL_BLOCK_ID = 40;

/** Radius within which a RuneSeal prevents decay (blocks). */
export const SEAL_RADIUS = 24;

// ─── Territory Zone ───

/** Represents a detected territory zone for external systems. */
export interface TerritoryZone {
	/** Chunk coordinates. */
	cx: number;
	cz: number;
	/** Block density [0, 1]. */
	density: number;
	/** Effective radius in blocks. */
	radius: number;
	/** Whether a RuneSeal prevents decay. */
	sealActive: boolean;
	/** World-space center X. */
	centerX: number;
	/** World-space center Z. */
	centerZ: number;
}

/** Check if a world position is inside a territory zone. */
export function isInTerritory(zones: ReadonlyArray<TerritoryZone>, x: number, z: number): TerritoryZone | null {
	for (const zone of zones) {
		const dx = x - zone.centerX;
		const dz = z - zone.centerZ;
		if (dx * dx + dz * dz < zone.radius * zone.radius) {
			return zone;
		}
	}
	return null;
}
