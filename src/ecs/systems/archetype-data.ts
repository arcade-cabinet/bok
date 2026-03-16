// ─── Archetype Data ───
// Pure data: archetype IDs, detection thresholds, colocation constants.
// No ECS, no Three.js — just lookup tables and constants.

import { RuneId } from "./rune-data.ts";

/** Functional archetype IDs recognized from rune builds. */
export const ArchetypeId = {
	Hearth: "hearth",
	Workshop: "workshop",
	Beacon: "beacon",
	Ward: "ward",
	Trap: "trap",
	Farm: "farm",
	Gate: "gate",
} as const;
export type ArchetypeKey = (typeof ArchetypeId)[keyof typeof ArchetypeId];

/** A detected archetype at a position within a chunk. */
export interface DetectedArchetype {
	type: ArchetypeKey;
	/** Chunk coordinates where the archetype was found. */
	cx: number;
	cz: number;
	/** World position of the primary rune block. */
	x: number;
	y: number;
	z: number;
}

// ─── Detection Thresholds ───

/** Minimum heat signal strength at a Kenaz block within an enclosure. */
export const HEARTH_MIN_HEAT = 3;

/** Max distance (blocks) between Kenaz heat source and Jera transform rune. */
export const WORKSHOP_JERA_DISTANCE = 5;

/** Minimum total Sowilo light output in a chunk to qualify as Beacon. */
export const BEACON_MIN_LIGHT_TOTAL = 20;

/** Minimum ward radius for an Algiz rune to qualify as Ward archetype. */
export const WARD_MIN_RADIUS = 5;

/** Minimum signal strength at a Thurisaz for trap detection. */
export const TRAP_MIN_SIGNAL = 3;

/** Max distance between Ansuz sensor and Thurisaz damage for trap link. */
export const TRAP_LINK_DISTANCE = 8;

/** Max distance from Berkanan rune to crop/sapling blocks for Farm. */
export const FARM_CROP_DISTANCE = 4;

/** Max distance between paired Isa runes for Gate detection. */
export const GATE_PAIR_DISTANCE = 32;

/** Minimum number of Isa runes needed for a gate pair. */
export const GATE_MIN_ISA_COUNT = 2;

// ─── Chunk Colocation ───

/** Chunk size (must match terrain-generator). */
export const CHUNK_SIZE = 16;

/** Settlement founding requires these archetypes colocated in a chunk. */
export const FOUNDING_ARCHETYPES: ReadonlySet<ArchetypeKey> = new Set([
	ArchetypeId.Hearth,
	ArchetypeId.Workshop,
	ArchetypeId.Ward,
]);

/** Minimum archetypes in one chunk to found a settlement. */
export const FOUNDING_THRESHOLD = 3;

// ─── Rune Category Helpers ───

/** Rune IDs that contribute to each archetype's detection. */
export const ARCHETYPE_RUNE_MAP: Readonly<Record<ArchetypeKey, ReadonlyArray<number>>> = {
	[ArchetypeId.Hearth]: [RuneId.Kenaz],
	[ArchetypeId.Workshop]: [RuneId.Kenaz, RuneId.Jera],
	[ArchetypeId.Beacon]: [RuneId.Sowilo],
	[ArchetypeId.Ward]: [RuneId.Algiz],
	[ArchetypeId.Trap]: [RuneId.Ansuz, RuneId.Thurisaz],
	[ArchetypeId.Farm]: [RuneId.Berkanan],
	[ArchetypeId.Gate]: [RuneId.Isa],
};

/** All archetype keys for iteration. */
export const ALL_ARCHETYPES: ReadonlyArray<ArchetypeKey> = [
	ArchetypeId.Hearth,
	ArchetypeId.Workshop,
	ArchetypeId.Beacon,
	ArchetypeId.Ward,
	ArchetypeId.Trap,
	ArchetypeId.Farm,
	ArchetypeId.Gate,
];
