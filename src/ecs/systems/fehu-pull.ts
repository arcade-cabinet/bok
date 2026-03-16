// ─── Fehu (Wealth) Pull Logic ───
// Pure math: item attraction force toward Fehu-inscribed faces.
// No ECS, no Three.js — just distance checks and velocity vectors.

import { FEHU_PULL_RADIUS, FEHU_PULL_SPEED } from "./interaction-rune-data.ts";

/** Position of an item drop in the world. */
export interface ItemDrop {
	x: number;
	y: number;
	z: number;
	itemId: number;
	qty: number;
}

/** Position of a Fehu rune face in the world. */
export interface FehuSource {
	/** Block center position. */
	x: number;
	y: number;
	z: number;
}

/**
 * Check if an item drop is within pull radius of a Fehu source.
 * Uses squared distance to avoid sqrt.
 */
export function isInPullRange(drop: ItemDrop, source: FehuSource): boolean {
	const dx = drop.x - source.x;
	const dy = drop.y - source.y;
	const dz = drop.z - source.z;
	return dx * dx + dy * dy + dz * dz <= FEHU_PULL_RADIUS * FEHU_PULL_RADIUS;
}

/**
 * Compute the pull velocity vector for an item toward a Fehu source.
 * Returns [vx, vy, vz] to apply to the item, or [0,0,0] if out of range.
 */
export function computePullVelocity(
	dropX: number,
	dropY: number,
	dropZ: number,
	sourceX: number,
	sourceY: number,
	sourceZ: number,
): [number, number, number] {
	const dx = sourceX - dropX;
	const dy = sourceY - dropY;
	const dz = sourceZ - dropZ;
	const distSq = dx * dx + dy * dy + dz * dz;

	if (distSq > FEHU_PULL_RADIUS * FEHU_PULL_RADIUS) return [0, 0, 0];
	if (distSq < 0.01) return [0, 0, 0]; // Already at source

	const dist = Math.sqrt(distSq);
	const nx = dx / dist;
	const ny = dy / dist;
	const nz = dz / dist;

	return [nx * FEHU_PULL_SPEED, ny * FEHU_PULL_SPEED, nz * FEHU_PULL_SPEED];
}

/** Distance at which an item is considered "collected" by the Fehu rune. */
export const FEHU_COLLECT_DISTANCE = 0.8;

/**
 * Check if an item drop has reached the Fehu source (close enough to collect).
 */
export function isAtSource(
	dropX: number,
	dropY: number,
	dropZ: number,
	sourceX: number,
	sourceY: number,
	sourceZ: number,
): boolean {
	const dx = sourceX - dropX;
	const dy = sourceY - dropY;
	const dz = sourceZ - dropZ;
	return dx * dx + dy * dy + dz * dz <= FEHU_COLLECT_DISTANCE * FEHU_COLLECT_DISTANCE;
}
