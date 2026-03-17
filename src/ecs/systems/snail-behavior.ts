/**
 * Skogssnigel (Forest Snail) behavior — wander, graze, retract.
 * Pure math — no Three.js dependency. Consumed by creature-ai.ts.
 *
 * Skogssniglar wander slowly on forest floors, graze on grass blocks,
 * and retract into their shell when threatened (becoming a static block).
 */

import type { BiomeId } from "../../world/biomes.ts";
import { Biome } from "../../world/biomes.ts";

// ─── Constants ───

/** Biomes where skogssniglar can spawn. */
const SNAIL_BIOMES: readonly BiomeId[] = [Biome.Angen, Biome.Bokskogen, Biome.Myren];

/** Distance at which snail detects a threat and retracts. */
export const RETRACT_RANGE = 4;

/** Duration (seconds) snail stays retracted before peeking out. */
export const RETRACT_DURATION = 5;

/** Wander speed in blocks/second. */
export const WANDER_SPEED = 0.4;

/** Time between wander direction changes (seconds). */
export const WANDER_INTERVAL = 3;

/** Graze duration (seconds) — time spent eating at a grass block. */
export const GRAZE_DURATION = 4;

/** Chance per second to start grazing when on a grass block. */
export const GRAZE_CHANCE = 0.3;

// ─── Snail State Machine ───

export const SnailState = {
	Wander: 0,
	Graze: 1,
	Retract: 2,
} as const;
export type SnailStateId = (typeof SnailState)[keyof typeof SnailState];

export interface SnailBehaviorState {
	state: SnailStateId;
	stateTimer: number;
	wanderDirX: number;
	wanderDirZ: number;
	wanderTimer: number;
}

export function createSnailState(): SnailBehaviorState {
	return {
		state: SnailState.Wander,
		stateTimer: 0,
		wanderDirX: 1,
		wanderDirZ: 0,
		wanderTimer: 0,
	};
}

// ─── Biome Check ───

/** Check if a biome supports skogssnigel spawning. */
export function isSnailBiome(biome: BiomeId): boolean {
	return SNAIL_BIOMES.includes(biome);
}

// ─── Wander Direction ───

/**
 * Compute a new wander direction using a deterministic hash.
 * Returns normalized dx, dz.
 */
export function newWanderDirection(hash: number): { dx: number; dz: number } {
	const angle = hash * Math.PI * 2;
	return { dx: Math.cos(angle), dz: Math.sin(angle) };
}

// ─── State Transitions ───

/**
 * Check if the snail should retract (player too close).
 */
export function shouldRetract(distToPlayer: number): boolean {
	return distToPlayer < RETRACT_RANGE;
}

/**
 * Check if snail should start grazing.
 * Requires being on a grass-like block and passing a random chance check.
 */
export function shouldGraze(isOnGrass: boolean, chance: number): boolean {
	return isOnGrass && chance < GRAZE_CHANCE;
}

// ─── Behavior Update ───

/**
 * Update snail behavior state machine.
 * Returns the new state after processing this frame.
 */
export function updateSnailBehavior(
	snail: SnailBehaviorState,
	dt: number,
	distToPlayer: number,
	isOnGrass: boolean,
	rngValue: number,
): SnailBehaviorState {
	// Priority: retract check (any state can transition to retract)
	if (snail.state !== SnailState.Retract && shouldRetract(distToPlayer)) {
		return {
			...snail,
			state: SnailState.Retract,
			stateTimer: 0,
		};
	}

	switch (snail.state) {
		case SnailState.Retract:
			return updateRetract(snail, dt, distToPlayer);
		case SnailState.Graze:
			return updateGraze(snail, dt);
		case SnailState.Wander:
			return updateWander(snail, dt, isOnGrass, rngValue);
		default:
			return snail;
	}
}

function updateRetract(snail: SnailBehaviorState, dt: number, distToPlayer: number): SnailBehaviorState {
	const timer = snail.stateTimer + dt;
	// Only emerge when timer expires AND player is far enough away
	if (timer >= RETRACT_DURATION && distToPlayer >= RETRACT_RANGE) {
		return {
			...snail,
			state: SnailState.Wander,
			stateTimer: 0,
			wanderTimer: 0,
		};
	}
	return { ...snail, stateTimer: timer };
}

function updateGraze(snail: SnailBehaviorState, dt: number): SnailBehaviorState {
	const timer = snail.stateTimer + dt;
	if (timer >= GRAZE_DURATION) {
		return {
			...snail,
			state: SnailState.Wander,
			stateTimer: 0,
			wanderTimer: 0,
		};
	}
	return { ...snail, stateTimer: timer };
}

function updateWander(snail: SnailBehaviorState, dt: number, isOnGrass: boolean, rngValue: number): SnailBehaviorState {
	const wanderTimer = snail.wanderTimer + dt;

	// Check for grazing
	if (shouldGraze(isOnGrass, rngValue)) {
		return {
			...snail,
			state: SnailState.Graze,
			stateTimer: 0,
			wanderTimer: 0,
		};
	}

	// Change wander direction periodically
	if (wanderTimer >= WANDER_INTERVAL) {
		const dir = newWanderDirection(rngValue);
		return {
			...snail,
			wanderDirX: dir.dx,
			wanderDirZ: dir.dz,
			wanderTimer: 0,
		};
	}

	return { ...snail, wanderTimer };
}

/**
 * Compute wander movement delta for this frame.
 * Returns zero movement when not wandering.
 */
export function wanderDelta(snail: SnailBehaviorState, dt: number): { dx: number; dz: number } {
	if (snail.state !== SnailState.Wander) {
		return { dx: 0, dz: 0 };
	}
	return {
		dx: snail.wanderDirX * WANDER_SPEED * dt,
		dz: snail.wanderDirZ * WANDER_SPEED * dt,
	};
}
