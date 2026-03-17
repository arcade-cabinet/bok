/**
 * Jätten Encounter Triggers — warning system before the giant arrives.
 *
 * As inscription level rises toward 1000 (JATTEN_WAKE), the world warns the player:
 *   800+ → ground tremors (camera shake)
 *   900+ → creatures flee away from largest structure
 *  1000+ → Jätten spawns (delegates to jatten-boss.ts)
 *
 * Pure math — no ECS, no Three.js.
 */

// ─── Thresholds ───

/** Inscription level where ground tremors begin. */
export const TREMOR_THRESHOLD = 800;

/** Inscription level where creatures flee the largest structure. */
export const CREATURE_FLEE_THRESHOLD = 900;

/** Inscription level where Jätten spawns. */
export const JATTEN_SPAWN_THRESHOLD = 1000;

/** Max level for intensity scaling (clamp at this). */
const INTENSITY_CAP = 1000;

// ─── Warning Phase ───

export type WarningPhase = "none" | "tremor" | "flee" | "spawn";

/**
 * Determine the current warning phase based on inscription level.
 * Phases are checked highest-first so only the most severe applies.
 */
export function computeWarningPhase(inscriptionLevel: number): WarningPhase {
	if (inscriptionLevel >= JATTEN_SPAWN_THRESHOLD) return "spawn";
	if (inscriptionLevel >= CREATURE_FLEE_THRESHOLD) return "flee";
	if (inscriptionLevel >= TREMOR_THRESHOLD) return "tremor";
	return "none";
}

// ─── Tremor ───

/** Check if tremors should be active at this inscription level. */
export function shouldTremor(inscriptionLevel: number): boolean {
	return inscriptionLevel >= TREMOR_THRESHOLD;
}

/**
 * Compute camera shake intensity [0, 1] based on inscription level.
 * Ramps linearly from 0 at TREMOR_THRESHOLD to 1 at INTENSITY_CAP.
 */
export function computeShakeIntensity(inscriptionLevel: number): number {
	if (inscriptionLevel < TREMOR_THRESHOLD) return 0;
	const range = INTENSITY_CAP - TREMOR_THRESHOLD;
	const progress = (inscriptionLevel - TREMOR_THRESHOLD) / range;
	return Math.min(progress, 1);
}

// ─── Creature Flee ───

/** Check if creatures should flee from the largest structure. */
export function shouldCreaturesFlee(inscriptionLevel: number): boolean {
	return inscriptionLevel >= CREATURE_FLEE_THRESHOLD;
}

// ─── Jätten Spawn ───

/**
 * Check if Jätten should spawn.
 * Only triggers once — returns false if already spawned.
 */
export function shouldSpawnJatten(inscriptionLevel: number, alreadySpawned: boolean): boolean {
	if (alreadySpawned) return false;
	return inscriptionLevel >= JATTEN_SPAWN_THRESHOLD;
}
