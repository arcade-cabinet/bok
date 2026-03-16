// ─── Settlement Data ───
// Pure data: Swedish place name generation, settlement levels, growth thresholds.
// No ECS, no Three.js — just lookup tables and deterministic name generation.

import type { ArchetypeKey } from "./archetype-data.ts";
import { ArchetypeId, FOUNDING_ARCHETYPES, FOUNDING_THRESHOLD } from "./archetype-data.ts";

// ─── Settlement Levels ───

export const SettlementLevel = {
	/** Not a settlement. */
	None: 0,
	/** Founded: Hearth + Workshop + Ward. */
	Hamlet: 1,
	/** Growing: 4-5 unique archetypes. */
	Village: 2,
	/** Thriving: 6-7 unique archetypes. */
	Town: 3,
} as const;
export type SettlementLevelId = (typeof SettlementLevel)[keyof typeof SettlementLevel];

/** Display name for each level. */
export const LEVEL_NAMES: Record<SettlementLevelId, string> = {
	[SettlementLevel.None]: "",
	[SettlementLevel.Hamlet]: "Hamlet",
	[SettlementLevel.Village]: "Village",
	[SettlementLevel.Town]: "Town",
};

/** Compute settlement level from the set of colocated archetypes. */
export function computeSettlementLevel(archetypes: ReadonlySet<ArchetypeKey>): SettlementLevelId {
	if (!meetsFoundingRequirement(archetypes)) return SettlementLevel.None;
	const count = archetypes.size;
	if (count >= 6) return SettlementLevel.Town;
	if (count >= 4) return SettlementLevel.Village;
	return SettlementLevel.Hamlet;
}

/** Check if the founding trio is present. */
export function meetsFoundingRequirement(archetypes: ReadonlySet<ArchetypeKey>): boolean {
	if (archetypes.size < FOUNDING_THRESHOLD) return false;
	for (const req of FOUNDING_ARCHETYPES) {
		if (!archetypes.has(req)) return false;
	}
	return true;
}

// ─── Growth Archetypes ───

/** Archetypes that enhance a settlement beyond founding. */
export const GROWTH_ARCHETYPES: ReadonlyArray<ArchetypeKey> = [
	ArchetypeId.Farm,
	ArchetypeId.Gate,
	ArchetypeId.Beacon,
	ArchetypeId.Trap,
];

// ─── Swedish Place Name Generation ───

/** Common prefixes from Swedish geography. */
const NAME_PREFIXES = [
	"Björk",
	"Sten",
	"Kvarn",
	"Lund",
	"Ås",
	"Ek",
	"Furu",
	"Gräns",
	"Hög",
	"Kungs",
	"Norr",
	"Sund",
	"Väst",
	"Öster",
	"Järn",
	"Guld",
];

/** Common suffixes from Swedish settlement names. */
const NAME_SUFFIXES = [
	"by",
	"holm",
	"vik",
	"borg",
	"stad",
	"hamn",
	"ås",
	"mark",
	"torp",
	"hed",
	"dal",
	"berg",
	"hult",
	"näs",
	"bro",
	"ö",
];

/**
 * Generate a deterministic Swedish place name from a seed.
 * Same seed always produces the same name.
 */
export function generateSettlementName(seed: number): string {
	const prefixIdx = Math.abs(seed) % NAME_PREFIXES.length;
	const suffixIdx = Math.abs(Math.floor(seed / NAME_PREFIXES.length)) % NAME_SUFFIXES.length;
	return NAME_PREFIXES[prefixIdx] + NAME_SUFFIXES[suffixIdx];
}

/**
 * Create a seed from chunk coordinates for deterministic naming.
 * Uses golden ratio hash for good distribution.
 */
export function chunkNameSeed(cx: number, cz: number): number {
	const a = ((cx + 32768) * 2654435761) >>> 0;
	const b = ((cz + 32768) * 2246822519) >>> 0;
	return (a ^ b) >>> 0;
}

// ─── Saga Prose ───

/** Prose template for settlement founding milestone. */
export function settlementFoundedProse(name: string): string {
	return `The runes sang in harmony — heat, craft, and ward united. The wanderer founded ${name}, a place to call home.`;
}

/** Prose template for settlement growth milestone. */
export function settlementGrewProse(name: string, levelName: string): string {
	return `${name} flourishes. New rune-works extend its reach — it has become a ${levelName.toLowerCase()}.`;
}
