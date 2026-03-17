// ─── Tiwaz (Victory) Combat Buff Logic ───
// Pure math: computes damage multiplier from signal strength and radius checks.
// No ECS, no Three.js — just distance checks and multiplier computation.

import {
	TIWAZ_BASE_MULTIPLIER,
	TIWAZ_BASE_RADIUS,
	TIWAZ_MAX_MULTIPLIER,
	TIWAZ_MAX_RADIUS,
	TIWAZ_MULTIPLIER_PER_STRENGTH,
	TIWAZ_RADIUS_PER_STRENGTH,
} from "./network-rune-data.ts";

/** An active Tiwaz buff zone with position, radius, and damage multiplier. */
export interface BuffZone {
	x: number;
	y: number;
	z: number;
	radius: number;
	multiplier: number;
}

/**
 * Compute the Tiwaz buff radius from signal strength.
 * Base radius + strength × scale, capped at max.
 */
export function computeBuffRadius(signalStrength: number): number {
	const raw = TIWAZ_BASE_RADIUS + signalStrength * TIWAZ_RADIUS_PER_STRENGTH;
	return Math.min(raw, TIWAZ_MAX_RADIUS);
}

/**
 * Compute the Tiwaz damage multiplier from signal strength.
 * Base multiplier + strength × scale, capped at max.
 */
export function computeBuffMultiplier(signalStrength: number): number {
	const raw = TIWAZ_BASE_MULTIPLIER + signalStrength * TIWAZ_MULTIPLIER_PER_STRENGTH;
	return Math.min(raw, TIWAZ_MAX_MULTIPLIER);
}

/**
 * Check if an entity is inside a Tiwaz buff zone.
 * Uses squared distance to avoid sqrt.
 */
export function isInBuffZone(
	zoneX: number,
	zoneY: number,
	zoneZ: number,
	entityX: number,
	entityY: number,
	entityZ: number,
	radius: number,
): boolean {
	const dx = entityX - zoneX;
	const dy = entityY - zoneY;
	const dz = entityZ - zoneZ;
	return dx * dx + dy * dy + dz * dz <= radius * radius;
}

/**
 * Get the best (highest) buff multiplier from all active zones at a position.
 * Returns 1.0 (no buff) if not in any zone.
 */
export function getBestBuffMultiplier(
	entityX: number,
	entityY: number,
	entityZ: number,
	zones: ReadonlyArray<BuffZone>,
): number {
	let best = 1.0;
	for (const z of zones) {
		if (isInBuffZone(z.x, z.y, z.z, entityX, entityY, entityZ, z.radius)) {
			if (z.multiplier > best) best = z.multiplier;
		}
	}
	return best;
}
