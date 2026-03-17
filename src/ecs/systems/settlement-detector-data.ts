/**
 * Settlement archetype detection constants and types.
 * Consumed by settlement-detector.ts.
 */

// ─── Settlement Archetype IDs ───

export const SettlementArchetypeId = {
	/** Smithy: Kenaz heat + Jera transform + Forge block. */
	Smedja: "smedja",
	/** Mill: Jera transform + Berkanan growth, both with active signal. */
	Kvarn: "kvarn",
	/** Watchtower: Sowilo light + Ansuz detection at elevated position. */
	Vakttorn: "vakttorn",
	/** Fortification: Algiz ward + Thurisaz damage + Ansuz detection. */
	Forsvarsverk: "forsvarsverk",
} as const;
export type SettlementArchetypeKey = (typeof SettlementArchetypeId)[keyof typeof SettlementArchetypeId];

export interface DetectedSettlementArchetype {
	type: SettlementArchetypeKey;
	cx: number;
	cz: number;
	x: number;
	y: number;
	z: number;
}

// ─── Detection Thresholds ───

/** Min heat signal at Kenaz for Smedja. */
export const SMEDJA_MIN_HEAT = 3;
/** Max distance between Kenaz and Jera for Smedja. */
export const SMEDJA_JERA_DISTANCE = 5;
/** Max distance from rune center to scan for Forge block. */
export const SMEDJA_FORGE_DISTANCE = 4;

/** Max distance between Jera and Berkanan for Kvarn. */
export const KVARN_LINK_DISTANCE = 6;
/** Min signal at each rune for Kvarn. */
export const KVARN_MIN_SIGNAL = 1;

/** Min Y coordinate for Sowilo to qualify as Vakttorn. */
export const VAKTTORN_MIN_Y = 20;
/** Max distance between Sowilo and Ansuz for Vakttorn. */
export const VAKTTORN_LINK_DISTANCE = 8;
/** Min light signal at Sowilo for Vakttorn. */
export const VAKTTORN_MIN_LIGHT = 3;

/** Max distance between defensive runes for Försvarsverk. */
export const FORSVARSVERK_LINK_DISTANCE = 8;
/** Min signal at each defensive rune for Försvarsverk. */
export const FORSVARSVERK_MIN_SIGNAL = 1;
