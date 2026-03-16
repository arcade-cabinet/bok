// ─── Thurisaz Exit-Face DESTROY Logic ───
// Pure math: determines if a Thurisaz rune on a block face can destroy
// the block that signal exits into. Requires sufficient signal strength.
// No ECS, no Three.js.

import { BLOCKS } from "../../world/blocks.ts";
import { DESTROY_COST_PER_HARDNESS, DESTROY_MIN_SIGNAL } from "./self-modify-data.ts";

/**
 * Compute the signal strength required to destroy a block of the given type.
 * Cost = hardness × DESTROY_COST_PER_HARDNESS, minimum DESTROY_MIN_SIGNAL.
 */
export function computeDestructionCost(blockId: number): number {
	const meta = BLOCKS[blockId];
	if (!meta) return DESTROY_MIN_SIGNAL;
	return Math.max(Math.ceil(meta.hardness * DESTROY_COST_PER_HARDNESS), DESTROY_MIN_SIGNAL);
}

/**
 * Check if signal is strong enough to destroy the block at the exit position.
 * The exit block must be solid (not air/fluid) and signal must meet
 * both the minimum threshold and the hardness-based cost.
 */
export function canDestroyBlock(exitBlockId: number, signalStrength: number): boolean {
	if (exitBlockId === 0) return false; // nothing to destroy in air
	const meta = BLOCKS[exitBlockId];
	if (!meta || !meta.solid) return false; // can't destroy fluids or non-solid
	if (signalStrength < DESTROY_MIN_SIGNAL) return false;
	return signalStrength >= computeDestructionCost(exitBlockId);
}
