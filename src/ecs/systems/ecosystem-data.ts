/**
 * Ecosystem interaction constants and data types.
 * Consumed by ecosystem.ts pure math module.
 */

// ─── Constants ───

/** Range at which Mörker can extinguish a Lyktgubbe. */
export const HUNT_EXTINGUISH_RANGE = 8;

/** Range at which Tranor detect and flee from Mörker. */
export const MORKER_FLEE_RANGE = 18;

/** How long pacification lingers after Norrsken ends (seconds). */
export const NORRSKEN_PACIFY_DURATION = 5;

/** Time a snail must graze before grass→mycel transform (seconds). */
export const GRAZE_TRANSFORM_INTERVAL = 8;

// ─── Data Types ───

export interface CreatureInfo {
	entityId: number;
	species: string;
	x: number;
	y: number;
	z: number;
	/** Block ID below the creature's feet. */
	blockBelow: number;
}

export interface HuntTarget {
	morkerEntityId: number;
	lyktgubbeEntityId: number;
	distance: number;
}

export interface GrazeTransform {
	entityId: number;
	x: number;
	y: number;
	z: number;
}

export interface TranaFlee {
	tranaEntityId: number;
	nearestMorkerEntityId: number;
	threatX: number;
	threatZ: number;
	distance: number;
}

export interface EcosystemResult {
	huntTargets: HuntTarget[];
	grazingSnails: CreatureInfo[];
	grazeTransforms: GrazeTransform[];
	fleeingTrana: TranaFlee[];
	allPacified: boolean;
}

export interface EcosystemContext {
	norrskenActive: boolean;
	grassBlockId: number;
	dt: number;
}
