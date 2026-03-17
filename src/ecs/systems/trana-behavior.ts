/**
 * Trana (Crane) behavior — wade, fish, flee with flock.
 * Pure math — no Three.js dependency. Consumed by creature-ai.ts.
 *
 * Tranor (cranes) wade in shallow water near lakes, fish by dipping
 * their necks, and flee in V-formation using Boids when approached.
 */

import type { BiomeId } from "../../world/biomes.ts";
import { Biome } from "../../world/biomes.ts";

// ─── Constants ───

/** Biomes where tranor can spawn (near water). */
const TRANA_BIOMES: readonly BiomeId[] = [Biome.Angen, Biome.Skargarden];

/** Distance at which tranor flee from the player. */
export const FLEE_RANGE = 10;

/** Flee speed in blocks/second. */
export const FLEE_SPEED = 4.0;

/** Wade speed in blocks/second. */
export const WADE_SPEED = 0.6;

/** Time between wade direction changes (seconds). */
export const WADE_INTERVAL = 4;

/** Fish duration (seconds) — neck dip animation time. */
export const FISH_DURATION = 3;

/** Chance per second to start fishing when wading. */
export const FISH_CHANCE = 0.2;

/** Water level — tranor only spawn at or near water. */
export const WATER_LEVEL = 10;

/** Maximum height above water for spawn position. */
export const MAX_ABOVE_WATER = 2;

// ─── Trana State Machine ───

export const TranaState = {
	Wade: 0,
	Fish: 1,
	Flee: 2,
} as const;
export type TranaStateId = (typeof TranaState)[keyof typeof TranaState];

export interface TranaBehaviorState {
	state: TranaStateId;
	stateTimer: number;
	wadeDirX: number;
	wadeDirZ: number;
	wadeTimer: number;
	/** Neck dip progress [0,1] for fishing animation. */
	neckDip: number;
}

export function createTranaState(): TranaBehaviorState {
	return {
		state: TranaState.Wade,
		stateTimer: 0,
		wadeDirX: 1,
		wadeDirZ: 0,
		wadeTimer: 0,
		neckDip: 0,
	};
}

// ─── Biome Check ───

/** Check if a biome supports trana spawning. */
export function isTranaBiome(biome: BiomeId): boolean {
	return TRANA_BIOMES.includes(biome);
}

/** Check if a surface height is valid for trana spawning (near water). */
export function isTranaSpawnHeight(surfaceY: number): boolean {
	return surfaceY >= WATER_LEVEL && surfaceY <= WATER_LEVEL + MAX_ABOVE_WATER;
}

// ─── Wade Direction ───

/**
 * Compute a new wade direction using a deterministic hash.
 */
export function newWadeDirection(hash: number): { dx: number; dz: number } {
	const angle = hash * Math.PI * 2;
	return { dx: Math.cos(angle), dz: Math.sin(angle) };
}

// ─── Flee Direction ───

/**
 * Compute flee direction away from player.
 * Returns normalized direction vector.
 */
export function fleeDirection(
	posX: number,
	posZ: number,
	playerX: number,
	playerZ: number,
): { dx: number; dz: number } {
	const dx = posX - playerX;
	const dz = posZ - playerZ;
	const dist = Math.sqrt(dx * dx + dz * dz);
	if (dist < 0.01) return { dx: 1, dz: 0 };
	return { dx: dx / dist, dz: dz / dist };
}

// ─── State Transitions ───

/** Check if trana should flee (player too close). */
export function shouldFlee(distToPlayer: number): boolean {
	return distToPlayer < FLEE_RANGE;
}

/** Check if trana should start fishing. */
export function shouldFish(chance: number): boolean {
	return chance < FISH_CHANCE;
}

// ─── Neck Dip ───

/**
 * Compute neck dip progress during fishing.
 * Returns [0,1] where 0 = upright, 1 = fully dipped.
 * Uses a smooth down-and-up arc over FISH_DURATION.
 */
export function neckDipProgress(stateTimer: number): number {
	const t = stateTimer / FISH_DURATION;
	if (t >= 1) return 0;
	// Smooth arc: sin(pi * t) peaks at 0.5
	return Math.sin(Math.PI * t);
}

// ─── Behavior Update ───

/**
 * Update trana behavior state machine.
 */
export function updateTranaBehavior(
	trana: TranaBehaviorState,
	dt: number,
	distToPlayer: number,
	rngValue: number,
): TranaBehaviorState {
	// Priority: flee check (any state can transition to flee)
	if (trana.state !== TranaState.Flee && shouldFlee(distToPlayer)) {
		return {
			...trana,
			state: TranaState.Flee,
			stateTimer: 0,
			neckDip: 0,
		};
	}

	switch (trana.state) {
		case TranaState.Flee:
			return updateFlee(trana, dt, distToPlayer);
		case TranaState.Fish:
			return updateFish(trana, dt);
		case TranaState.Wade:
			return updateWade(trana, dt, rngValue);
		default:
			return trana;
	}
}

function updateFlee(trana: TranaBehaviorState, dt: number, distToPlayer: number): TranaBehaviorState {
	const timer = trana.stateTimer + dt;
	// Return to wading when player is far enough
	if (distToPlayer >= FLEE_RANGE * 1.5) {
		return {
			...trana,
			state: TranaState.Wade,
			stateTimer: 0,
			wadeTimer: 0,
			neckDip: 0,
		};
	}
	return { ...trana, stateTimer: timer };
}

function updateFish(trana: TranaBehaviorState, dt: number): TranaBehaviorState {
	const timer = trana.stateTimer + dt;
	const dip = neckDipProgress(timer);
	if (timer >= FISH_DURATION) {
		return {
			...trana,
			state: TranaState.Wade,
			stateTimer: 0,
			wadeTimer: 0,
			neckDip: 0,
		};
	}
	return { ...trana, stateTimer: timer, neckDip: dip };
}

function updateWade(trana: TranaBehaviorState, dt: number, rngValue: number): TranaBehaviorState {
	const wadeTimer = trana.wadeTimer + dt;

	// Check for fishing
	if (shouldFish(rngValue)) {
		return {
			...trana,
			state: TranaState.Fish,
			stateTimer: 0,
			wadeTimer: 0,
			neckDip: 0,
		};
	}

	// Change wade direction periodically
	if (wadeTimer >= WADE_INTERVAL) {
		const dir = newWadeDirection(rngValue);
		return {
			...trana,
			wadeDirX: dir.dx,
			wadeDirZ: dir.dz,
			wadeTimer: 0,
		};
	}

	return { ...trana, wadeTimer };
}

/**
 * Compute wade movement delta for this frame.
 */
export function wadeDelta(trana: TranaBehaviorState, dt: number): { dx: number; dz: number } {
	if (trana.state !== TranaState.Wade) {
		return { dx: 0, dz: 0 };
	}
	return {
		dx: trana.wadeDirX * WADE_SPEED * dt,
		dz: trana.wadeDirZ * WADE_SPEED * dt,
	};
}
