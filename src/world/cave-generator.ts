/**
 * Underground cave generation and ore vein placement.
 *
 * Cave system: 3D simplex noise at scale 30, carving where noise exceeds threshold.
 * Continuous 3D noise naturally creates connected tunnel networks.
 *
 * Ore veins: 3D noise at scale 8 for cluster formation, depth-band restricted:
 *   Iron   (y 5–15)  — deep, common
 *   Copper (y 10–20) — mid-depth
 *   Crystal (y 20+)  — shallow caves, rare, emissive
 *
 * Water pools: cave positions below CAVE_WATER_LEVEL where noise is strongest
 * (wide passages / intersections).
 */

import { BlockId } from "./blocks.ts";
import { noise3D } from "./noise.ts";

// ─── Cave Constants ───

/** Scale of 3D cave noise. Larger = bigger cave features. */
export const CAVE_SCALE = 30;

/** Carve where 3D noise exceeds this threshold. */
export const CAVE_THRESHOLD = 0.35;

/** Min blocks below surface before caves form. */
export const CAVE_SURFACE_BUFFER = 3;

/** Below this y, wide cave passages fill with water. */
export const CAVE_WATER_LEVEL = 8;

/** Extra noise above CAVE_THRESHOLD for water pool placement. */
const WATER_BONUS = 0.15;

// ─── Ore Constants ───

const ORE_SCALE = 8;
const ORE_THRESHOLD = 0.5;
const OFF_CAVE = 6000;
const OFF_ORE = 7000;

// ─── Ore Depth Bands ───

export interface OreConfig {
	blockId: number;
	minY: number;
	maxY: number;
	offset: number;
}

export const ORE_BANDS: OreConfig[] = [
	{ blockId: BlockId.IronOre, minY: 5, maxY: 15, offset: 0 },
	{ blockId: BlockId.CopperOre, minY: 10, maxY: 20, offset: 500 },
	{ blockId: BlockId.Crystal, minY: 20, maxY: 32, offset: 1000 },
];

// ─── Cave Detection ───

/** Raw 3D cave noise at a position. Shared by cave and water checks. */
export function caveNoise(gx: number, y: number, gz: number): number {
	return noise3D(gx / CAVE_SCALE + OFF_CAVE, y / CAVE_SCALE + OFF_CAVE, gz / CAVE_SCALE + OFF_CAVE);
}

/**
 * Is this position a cave? 3D noise > threshold, with surface protection.
 * Never carves at y=0 (bedrock) or within CAVE_SURFACE_BUFFER of surface.
 */
export function isCave(gx: number, y: number, gz: number, surfaceY: number): boolean {
	if (y < 1 || y >= surfaceY - CAVE_SURFACE_BUFFER) return false;
	return caveNoise(gx, y, gz) > CAVE_THRESHOLD;
}

/**
 * Should a cave position be filled with water?
 * Water forms in wide passages (high noise) below CAVE_WATER_LEVEL.
 */
export function isCaveWater(gx: number, y: number, gz: number): boolean {
	if (y > CAVE_WATER_LEVEL) return false;
	return caveNoise(gx, y, gz) > CAVE_THRESHOLD + WATER_BONUS;
}

// ─── Ore Generation ───

/**
 * Get ore block at position, or null. Each ore type uses independent noise
 * for cluster formation, restricted to its depth band. First match wins
 * in overlap zones (iron > copper priority at y 10–15).
 */
export function getOreBlock(gx: number, y: number, gz: number): number | null {
	for (const ore of ORE_BANDS) {
		if (y < ore.minY || y > ore.maxY) continue;
		const n = noise3D(
			gx / ORE_SCALE + OFF_ORE + ore.offset,
			y / ORE_SCALE + OFF_ORE + ore.offset,
			gz / ORE_SCALE + OFF_ORE + ore.offset,
		);
		if (n > ORE_THRESHOLD) return ore.blockId;
	}
	return null;
}

// ─── Integration ───

/**
 * Apply cave carving and ore veins to a stone block.
 * Returns the modified block: air (0), water, ore, or original stone.
 * Called from terrain-generator for every Stone position.
 */
export function applyCaveToStone(gx: number, y: number, gz: number, surfaceY: number): number {
	// Cave carving (with surface/bedrock protection)
	if (y >= 1 && y < surfaceY - CAVE_SURFACE_BUFFER) {
		const cn = caveNoise(gx, y, gz);
		if (cn > CAVE_THRESHOLD) {
			return y <= CAVE_WATER_LEVEL && cn > CAVE_THRESHOLD + WATER_BONUS ? BlockId.Water : 0;
		}
	}
	// Ore veins — can appear anywhere in stone, including surface buffer
	return getOreBlock(gx, y, gz) ?? BlockId.Stone;
}
