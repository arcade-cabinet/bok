// ─── Jera Exit-Face PLACE Logic ───
// Pure math: determines if a Jera rune on a block face can place a block
// when signal exits into air. Consumes signal strength based on hardness.
// No ECS, no Three.js.

import { BLOCKS } from "../../world/blocks.ts";
import { PLACE_COST_PER_HARDNESS, PLACE_DEFAULT_BLOCK, PLACE_MIN_SIGNAL, SIGNAL_TO_BLOCK } from "./self-modify-data.ts";
import type { SignalTypeId } from "./signal-data.ts";

/**
 * Select which block type to place based on the dominant signal type.
 * Falls back to PLACE_DEFAULT_BLOCK if no mapping exists.
 */
export function selectPlacementBlock(signalType: SignalTypeId): number {
	return SIGNAL_TO_BLOCK.get(signalType) ?? PLACE_DEFAULT_BLOCK;
}

/**
 * Compute the signal strength required to place a block of the given type.
 * Cost = hardness × PLACE_COST_PER_HARDNESS.
 */
export function computePlacementCost(blockId: number): number {
	const meta = BLOCKS[blockId];
	if (!meta) return PLACE_MIN_SIGNAL;
	return Math.ceil(meta.hardness * PLACE_COST_PER_HARDNESS);
}

/**
 * Check if signal is strong enough to place a block at the exit position.
 * The exit block must be air (blockId 0) and signal must meet both
 * the minimum threshold and the hardness-based cost.
 */
export function canPlaceBlock(exitBlockId: number, signalStrength: number, placementBlockId: number): boolean {
	if (exitBlockId !== 0) return false; // must exit into air
	if (signalStrength < PLACE_MIN_SIGNAL) return false;
	return signalStrength >= computePlacementCost(placementBlockId);
}
