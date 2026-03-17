// ─── Algiz (Protection) Ward Logic ───
// Pure math: computes ward exclusion zone radius from signal strength.
// No ECS, no Three.js — just distance checks and radius computation.

import { ALGIZ_BASE_RADIUS, ALGIZ_MAX_RADIUS, ALGIZ_RADIUS_PER_STRENGTH } from "./interaction-rune-data.ts";

/** An active ward zone with position and computed radius. */
export interface WardZone {
	x: number;
	y: number;
	z: number;
	radius: number;
}

/**
 * Compute the Algiz ward exclusion radius from signal strength.
 * Base radius + strength × scale, capped at max.
 */
export function computeWardRadius(signalStrength: number): number {
	const raw = ALGIZ_BASE_RADIUS + signalStrength * ALGIZ_RADIUS_PER_STRENGTH;
	return Math.min(raw, ALGIZ_MAX_RADIUS);
}

/**
 * Check if an entity position is inside a ward exclusion zone.
 * Uses squared distance to avoid sqrt.
 */
export function isInWardZone(
	wardX: number,
	wardY: number,
	wardZ: number,
	entityX: number,
	entityY: number,
	entityZ: number,
	radius: number,
): boolean {
	const dx = entityX - wardX;
	const dy = entityY - wardY;
	const dz = entityZ - wardZ;
	return dx * dx + dy * dy + dz * dz <= radius * radius;
}

/**
 * Check if any ward zone in the list blocks entry at the given position.
 * Returns true if the position is inside any active ward.
 */
export function isBlockedByWard(
	entityX: number,
	entityY: number,
	entityZ: number,
	wards: ReadonlyArray<WardZone>,
): boolean {
	for (const w of wards) {
		if (isInWardZone(w.x, w.y, w.z, entityX, entityY, entityZ, w.radius)) {
			return true;
		}
	}
	return false;
}
