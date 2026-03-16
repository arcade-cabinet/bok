// ─── Self-Modifying Circuit Data ───
// Pure data: constants for Jera PLACE, Thurisaz DESTROY, and fuse mechanics.
// No ECS, no Three.js — just lookup tables and constants.

import { BlockId } from "../../world/blocks.ts";
import { RuneId } from "./rune-data.ts";

// ─── Jera Exit-Face PLACE ───

/** Signal strength consumed per unit of block hardness when placing. */
export const PLACE_COST_PER_HARDNESS = 2;

/** Minimum signal strength required to trigger any block placement. */
export const PLACE_MIN_SIGNAL = 4;

/** Default block type placed by Jera exit-face when no specific recipe applies. */
export const PLACE_DEFAULT_BLOCK = BlockId.Stone;

/**
 * Map of signal types to the block they place.
 * Heat → StoneBricks (smelted), Light → Glass (fused), Force → Stone, Detection → RuneStone.
 */
export const SIGNAL_TO_BLOCK: ReadonlyMap<number, number> = new Map([
	[0, BlockId.StoneBricks], // Heat
	[1, BlockId.Glass], // Light
	[2, BlockId.Stone], // Force
	[3, BlockId.RuneStone], // Detection
]);

/** Particle color for Jera placement (earthy green). */
export const JERA_PLACE_COLOR = 0x228b22;

// ─── Thurisaz Exit-Face DESTROY ───

/** Minimum signal strength required to destroy a block. */
export const DESTROY_MIN_SIGNAL = 5;

/** Signal strength consumed per unit of block hardness when destroying. */
export const DESTROY_COST_PER_HARDNESS = 1.5;

/** Particle color for Thurisaz destruction (fiery orange). */
export const THURISAZ_DESTROY_COLOR = 0xff4500;

// ─── Fuse (Wood + Heat) ───

/** Minimum Heat signal strength to burn a fuse block. */
export const FUSE_BURN_THRESHOLD = 3;

/** Block IDs that act as fuses (wood variants burn when heat passes through). */
export const FUSE_BLOCKS = new Set<number>([
	BlockId.Wood,
	BlockId.Planks,
	BlockId.BirchWood,
	BlockId.BeechWood,
	BlockId.PineWood,
	BlockId.DeadWood,
	BlockId.TreatedPlanks,
]);

/** Particle color for fuse burning (charcoal smoke). */
export const FUSE_BURN_COLOR = 0x4a3a2a;

// ─── Category Check ───

/** Check if a rune is a self-modifying rune (Jera or Thurisaz on exit face). */
export function isSelfModifyRune(runeId: number): boolean {
	return runeId === RuneId.Jera || runeId === RuneId.Thurisaz;
}
