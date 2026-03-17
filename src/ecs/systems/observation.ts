/**
 * Observation mechanic — pure math, no ECS/Three.js.
 * Dot-product camera cone check + progressive observation timer.
 * Consumed by codex.ts (ECS system).
 */

import { FULL_OBSERVE_DURATION } from "./codex-data.ts";

// ─── Constants ───

/** Dot product threshold for "creature is in view" (~72° half-cone). */
export const OBSERVE_VIEW_THRESHOLD = 0.3;

/** Maximum distance (blocks) at which observation works. */
export const OBSERVE_MAX_RANGE = 20;

// ─── Camera Cone Check ───

/**
 * Check if a creature is within the player's observation cone.
 * Uses dot product of player's look direction and direction to creature.
 *
 * @returns true if creature is within view cone and range
 */
export function isCreatureInView(
	playerX: number,
	playerZ: number,
	playerYaw: number,
	creatureX: number,
	creatureZ: number,
): boolean {
	const dx = creatureX - playerX;
	const dz = creatureZ - playerZ;
	const distSq = dx * dx + dz * dz;

	if (distSq > OBSERVE_MAX_RANGE * OBSERVE_MAX_RANGE) return false;
	if (distSq < 0.01) return true;

	const dist = Math.sqrt(distSq);
	const ndx = dx / dist;
	const ndz = dz / dist;

	const lookX = Math.sin(playerYaw);
	const lookZ = Math.cos(playerYaw);

	const dot = lookX * ndx + lookZ * ndz;
	return dot > OBSERVE_VIEW_THRESHOLD;
}

// ─── Observation Timer ───

/**
 * Tick observation progress for a species.
 * Returns new progress clamped to [0, 1].
 */
export function tickObservation(currentProgress: number, dt: number, isViewing: boolean): number {
	if (!isViewing) return currentProgress;
	const increment = dt / FULL_OBSERVE_DURATION;
	return Math.min(1, currentProgress + increment);
}
