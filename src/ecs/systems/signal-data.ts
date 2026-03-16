// ─── Signal Data ───
// Pure data: signal type definitions, material conductivity, budget constants.
// No ECS, no Three.js — just lookup tables and pure functions.

import { BlockId } from "../../world/blocks.ts";
import { Face, type FaceIndex } from "./rune-data.ts";

// ─── Signal Types ───

export const SignalType = {
	Heat: 0,
	Light: 1,
	Force: 2,
	Detection: 3,
} as const;

export type SignalTypeId = (typeof SignalType)[keyof typeof SignalType];

/** All signal types for iteration. */
export const ALL_SIGNAL_TYPES: ReadonlyArray<SignalTypeId> = [
	SignalType.Heat,
	SignalType.Light,
	SignalType.Force,
	SignalType.Detection,
];

// ─── Constants ───

/** Maximum signal strength value. */
export const MAX_SIGNAL_STRENGTH = 15;

/** Maximum blocks evaluated per propagation tick. */
export const MAX_BLOCKS_PER_TICK = 128;

/** Maximum active emitters processed per tick. */
export const MAX_EMITTERS = 32;

/** Maximum BFS depth (blocks from emitter). */
export const MAX_PROPAGATION_DEPTH = 16;

/** Propagation tick interval in seconds (4 ticks/second). */
export const SIGNAL_TICK_INTERVAL = 0.25;

// ─── Material Conductivity ───

/** Block IDs that conduct signals (factor 1.0). */
const CONDUCTORS = new Set<number>([
	BlockId.Stone,
	BlockId.StoneBricks,
	BlockId.SmoothStone,
	BlockId.CorruptedStone,
	BlockId.IronOre,
	BlockId.CopperOre,
	BlockId.RuneStone,
	BlockId.ReinforcedBricks,
]);

/** Block IDs that amplify signals (factor 1.5). */
const AMPLIFIERS = new Set<number>([BlockId.Crystal]);

/**
 * Get the conductivity factor for a block type.
 * - 0 = insulator / non-conductor (wood, air, dirt, etc.)
 * - 1.0 = conductor (stone, iron ore, copper ore)
 * - 1.5 = amplifier (crystal)
 */
export function getBlockConductivity(blockId: number): number {
	if (AMPLIFIERS.has(blockId)) return 1.5;
	if (CONDUCTORS.has(blockId)) return 1.0;
	return 0;
}

// ─── Face Utilities ───

/**
 * Get the opposite face index. PosX↔NegX, PosY↔NegY, PosZ↔NegZ.
 * Even faces (0,2,4) pair with odd faces (1,3,5).
 */
export function oppositeFace(face: FaceIndex): FaceIndex {
	return (face % 2 === 0 ? face + 1 : face - 1) as FaceIndex;
}

/** Face normal offsets [dx, dy, dz] indexed by FaceIndex. */
export const FACE_OFFSETS: ReadonlyArray<readonly [number, number, number]> = [
	[1, 0, 0], // PosX (0)
	[-1, 0, 0], // NegX (1)
	[0, 1, 0], // PosY (2)
	[0, -1, 0], // NegY (3)
	[0, 0, 1], // PosZ (4)
	[0, 0, -1], // NegZ (5)
];

/** Axis pairs for opposing-direction combining. */
export const AXIS_PAIRS: ReadonlyArray<readonly [FaceIndex, FaceIndex]> = [
	[Face.PosX, Face.NegX],
	[Face.PosY, Face.NegY],
	[Face.PosZ, Face.NegZ],
];
