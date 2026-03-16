// ─── Territory Decay ───
// Pure math: decay eligibility, moss target selection, seal detection.
// No ECS, no Three.js — deterministic functions for the territory system.

import { BlockId } from "../../world/blocks.ts";
import {
	DECAY_INTERVAL_DAYS,
	DECAY_ONSET_DAYS,
	isTerritoryBlock,
	MAX_DECAY_PER_TICK,
	RUNE_SEAL_BLOCK_ID,
	SEAL_RADIUS,
} from "./territory-data.ts";

// ─── Decay Eligibility ───

/**
 * Check if a structure zone is eligible for decay.
 * @param daysSinceVisit — game-days since the player was last in the zone
 * @param sealActive — whether a RuneSeal prevents decay
 */
export function isDecayEligible(daysSinceVisit: number, sealActive: boolean): boolean {
	if (sealActive) return false;
	return daysSinceVisit >= DECAY_ONSET_DAYS;
}

/**
 * Compute how many moss blocks should be placed this decay tick.
 * More days past onset → more blocks, up to MAX_DECAY_PER_TICK.
 */
export function computeDecayCount(daysSinceVisit: number): number {
	if (daysSinceVisit < DECAY_ONSET_DAYS) return 0;
	const periodsElapsed = Math.floor((daysSinceVisit - DECAY_ONSET_DAYS) / DECAY_INTERVAL_DAYS);
	return Math.min(MAX_DECAY_PER_TICK, 1 + periodsElapsed);
}

// ─── Moss Target Selection ───

/** Blocks that can be converted to moss by decay. Only soft/medium materials. */
const DECAYABLE_BLOCKS = new Set<number>([
	BlockId.Planks,
	BlockId.TreatedPlanks,
	BlockId.Wood,
	BlockId.BirchWood,
	BlockId.BeechWood,
	BlockId.PineWood,
	BlockId.DeadWood,
	BlockId.Grass,
	BlockId.Dirt,
]);

/** Check if a block can be converted to moss. */
export function isDecayable(blockId: number): boolean {
	return DECAYABLE_BLOCKS.has(blockId);
}

/**
 * Select up to `count` blocks to convert to moss within a radius.
 * Uses deterministic pseudo-random selection based on day count.
 * Returns array of {x, y, z} positions.
 */
export function selectDecayTargets(
	centerX: number,
	centerY: number,
	centerZ: number,
	radius: number,
	count: number,
	dayCount: number,
	getVoxel: (x: number, y: number, z: number) => number,
): Array<{ x: number; y: number; z: number }> {
	const candidates: Array<{ x: number; y: number; z: number }> = [];
	const cx = Math.floor(centerX);
	const cy = Math.floor(centerY);
	const cz = Math.floor(centerZ);
	const scanR = Math.min(radius, 12); // Cap scan to avoid huge scans

	for (let dx = -scanR; dx <= scanR; dx++) {
		for (let dz = -scanR; dz <= scanR; dz++) {
			for (let dy = -4; dy <= 4; dy++) {
				const bx = cx + dx;
				const by = cy + dy;
				const bz = cz + dz;
				const blockId = getVoxel(bx, by, bz);
				if (isDecayable(blockId)) {
					candidates.push({ x: bx, y: by, z: bz });
				}
			}
		}
	}

	if (candidates.length === 0) return [];

	// Deterministic selection using day-based hash
	const results: Array<{ x: number; y: number; z: number }> = [];
	const limit = Math.min(count, candidates.length);
	for (let i = 0; i < limit; i++) {
		const hash = ((dayCount + i) * 2654435761) >>> 0;
		const idx = hash % candidates.length;
		results.push(candidates[idx]);
	}
	return results;
}

// ─── Seal Detection ───

/**
 * Check if a RuneSeal block exists within the seal radius of a position.
 */
export function isSealNearby(
	centerX: number,
	centerY: number,
	centerZ: number,
	getVoxel: (x: number, y: number, z: number) => number,
): boolean {
	const cx = Math.floor(centerX);
	const cy = Math.floor(centerY);
	const cz = Math.floor(centerZ);
	const r = Math.min(SEAL_RADIUS, 16); // Scan cap for performance

	for (let dx = -r; dx <= r; dx += 2) {
		for (let dz = -r; dz <= r; dz += 2) {
			for (let dy = -4; dy <= 4; dy += 2) {
				if (getVoxel(cx + dx, cy + dy, cz + dz) === RUNE_SEAL_BLOCK_ID) {
					return true;
				}
			}
		}
	}
	return false;
}

// ─── Territory Block Counting ───

/**
 * Count territory (player-placed building material) blocks in a radius.
 * Used by the territory system for density calculation.
 */
export function countTerritoryBlocks(
	centerX: number,
	centerY: number,
	centerZ: number,
	radius: number,
	height: number,
	getVoxel: (x: number, y: number, z: number) => number,
): number {
	const cx = Math.floor(centerX);
	const cy = Math.floor(centerY);
	const cz = Math.floor(centerZ);
	let count = 0;

	for (let dx = -radius; dx <= radius; dx++) {
		for (let dz = -radius; dz <= radius; dz++) {
			for (let dy = -height; dy <= height; dy++) {
				if (isTerritoryBlock(getVoxel(cx + dx, cy + dy, cz + dz))) {
					count++;
				}
			}
		}
	}
	return count;
}
