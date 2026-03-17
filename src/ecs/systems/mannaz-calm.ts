// ─── Mannaz (Humanity) Calm Logic ───
// Pure math: computes calm zone radius and creature behavior override.
// No ECS, no Three.js — just distance checks and AI type filtering.

import type { AiTypeId } from "../traits/index.ts";
import { MANNAZ_BASE_RADIUS, MANNAZ_MAX_RADIUS, MANNAZ_RADIUS_PER_STRENGTH } from "./interaction-rune-data.ts";

/** An active calm zone with position and computed radius. */
export interface CalmZone {
	x: number;
	y: number;
	z: number;
	radius: number;
}

/**
 * Compute the Mannaz calm zone radius from signal strength.
 * Base radius + strength × scale, capped at max.
 */
export function computeCalmRadius(signalStrength: number): number {
	const raw = MANNAZ_BASE_RADIUS + signalStrength * MANNAZ_RADIUS_PER_STRENGTH;
	return Math.min(raw, MANNAZ_MAX_RADIUS);
}

/**
 * Check if an entity position is inside a calm zone.
 * Uses squared distance to avoid sqrt.
 */
export function isInCalmZone(
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
 * Check if a creature's AI type can be calmed by Mannaz.
 * Only neutral creatures respond to the calming rune.
 */
export function isAiTypeCalmable(aiType: AiTypeId): boolean {
	return aiType === "neutral";
}

/**
 * Check if any calm zone affects the given position for a neutral creature.
 * Returns true if the position is inside any active calm zone.
 */
export function isCalmedByZone(
	entityX: number,
	entityY: number,
	entityZ: number,
	zones: ReadonlyArray<CalmZone>,
): boolean {
	for (const z of zones) {
		if (isInCalmZone(z.x, z.y, z.z, entityX, entityY, entityZ, z.radius)) {
			return true;
		}
	}
	return false;
}
