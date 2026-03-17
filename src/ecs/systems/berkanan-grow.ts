// ─── Berkanan (Birch) Growth Logic ───
// Pure math: computes growth zone radius and speed multiplier from signal.
// No ECS, no Three.js — just distance checks and multiplier computation.

import {
	BERKANAN_BASE_MULTIPLIER,
	BERKANAN_BASE_RADIUS,
	BERKANAN_MAX_MULTIPLIER,
	BERKANAN_MAX_RADIUS,
	BERKANAN_MULTIPLIER_PER_STRENGTH,
	BERKANAN_RADIUS_PER_STRENGTH,
} from "./interaction-rune-data.ts";

/** An active growth zone with position, radius, and growth multiplier. */
export interface GrowthZone {
	x: number;
	y: number;
	z: number;
	radius: number;
	multiplier: number;
}

/**
 * Compute the Berkanan growth zone radius from signal strength.
 * Base radius + strength × scale, capped at max.
 */
export function computeGrowthRadius(signalStrength: number): number {
	const raw = BERKANAN_BASE_RADIUS + signalStrength * BERKANAN_RADIUS_PER_STRENGTH;
	return Math.min(raw, BERKANAN_MAX_RADIUS);
}

/**
 * Compute the growth speed multiplier from signal strength.
 * Base multiplier + strength × scale, capped at max.
 * Returns ≥ 1.0 (never slows growth).
 */
export function computeGrowthMultiplier(signalStrength: number): number {
	const raw = BERKANAN_BASE_MULTIPLIER + signalStrength * BERKANAN_MULTIPLIER_PER_STRENGTH;
	return Math.min(raw, BERKANAN_MAX_MULTIPLIER);
}

/**
 * Check if a block position is inside a growth zone.
 * Uses squared distance to avoid sqrt.
 */
export function isInGrowthZone(
	zoneX: number,
	zoneY: number,
	zoneZ: number,
	blockX: number,
	blockY: number,
	blockZ: number,
	radius: number,
): boolean {
	const dx = blockX - zoneX;
	const dy = blockY - zoneY;
	const dz = blockZ - zoneZ;
	return dx * dx + dy * dy + dz * dz <= radius * radius;
}

/**
 * Get the best (highest) growth multiplier at a given position from all zones.
 * Returns 1.0 if no zone covers the position (normal growth speed).
 */
export function getBestGrowthMultiplier(
	blockX: number,
	blockY: number,
	blockZ: number,
	zones: ReadonlyArray<GrowthZone>,
): number {
	let best = 1.0;
	for (const z of zones) {
		if (isInGrowthZone(z.x, z.y, z.z, blockX, blockY, blockZ, z.radius)) {
			if (z.multiplier > best) best = z.multiplier;
		}
	}
	return best;
}
