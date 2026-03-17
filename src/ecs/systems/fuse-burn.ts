// ─── Fuse Burn Logic ───
// Pure math: determines if a wood block in a signal path should burn
// when carrying Heat signal. Fuse consumption breaks the circuit.
// No ECS, no Three.js.

import { FUSE_BLOCKS, FUSE_BURN_THRESHOLD } from "./self-modify-data.ts";
import { SignalType } from "./signal-data.ts";

/**
 * Check if a block type can act as a fuse (wood variants).
 */
export function isFuseBlock(blockId: number): boolean {
	return FUSE_BLOCKS.has(blockId);
}

/**
 * Determine if a fuse block should burn given the signal at its position.
 * Fuses burn when Heat signal meets or exceeds the burn threshold.
 *
 * @param blockId - Block type at the position.
 * @param heatStrength - Heat signal strength at the block (0 if none).
 * @returns true if the block should be consumed by fire.
 */
export function shouldFuseBurn(blockId: number, heatStrength: number): boolean {
	if (!isFuseBlock(blockId)) return false;
	return heatStrength >= FUSE_BURN_THRESHOLD;
}

/**
 * Extract heat signal strength from a signal type map.
 * Returns 0 if no heat signal present.
 */
export function getHeatStrength(signals: ReadonlyMap<number, number> | undefined): number {
	if (!signals) return 0;
	return signals.get(SignalType.Heat) ?? 0;
}
