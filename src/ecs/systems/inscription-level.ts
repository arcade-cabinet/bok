/**
 * Inscription Level — pure data module for the world's response to player modification.
 *
 * The inscription level represents how much the player has "written" on the world.
 * Higher levels attract more dangerous creatures as the saga deepens.
 *
 * Pure math — no ECS, no Three.js.
 */

/** Tier thresholds — each tier unlocks new creature spawns. */
export const INSCRIPTION_TIERS = {
	/** Runväktare wake and patrol near landmarks. */
	RUNVAKTARE_WAKE: 100,
	/** Lindormar are attracted to mining vibrations. */
	LINDORM_ATTRACT: 300,
	/** Jätten stirs from its mountain. */
	JATTEN_WAKE: 1000,
} as const;

/** Spawn rate multiplier tiers keyed by inscription level floor. */
const SPAWN_RATE_TIERS: ReadonlyArray<{ minLevel: number; multiplier: number }> = [
	{ minLevel: 500, multiplier: 2.0 },
	{ minLevel: 200, multiplier: 1.5 },
	{ minLevel: 50, multiplier: 1.2 },
	{ minLevel: 0, multiplier: 1.0 },
];

/** Weights for the inscription level formula. */
const PLACE_WEIGHT = 1;
const MINE_WEIGHT = 0.5;
const STRUCTURE_WEIGHT = 10;

/** Compute inscription level from raw counters. */
export function computeInscriptionLevel(
	totalBlocksPlaced: number,
	totalBlocksMined: number,
	structuresBuilt: number,
): number {
	return totalBlocksPlaced * PLACE_WEIGHT + totalBlocksMined * MINE_WEIGHT + structuresBuilt * STRUCTURE_WEIGHT;
}

/** Get the spawn rate multiplier for the current inscription level. */
export function getSpawnRateMultiplier(level: number): number {
	for (const tier of SPAWN_RATE_TIERS) {
		if (level >= tier.minLevel) return tier.multiplier;
	}
	return 1.0;
}

/** Check whether a specific creature threshold has been reached. */
export function isThresholdReached(level: number, threshold: number): boolean {
	return level >= threshold;
}
