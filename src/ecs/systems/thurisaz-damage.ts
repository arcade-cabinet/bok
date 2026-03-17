// ─── Thurisaz (Thorn) Damage Logic ───
// Pure math: converts incoming signal strength to area damage.
// No ECS, no Three.js — just distance checks and damage computation.

import {
	THURISAZ_DAMAGE_PER_STRENGTH,
	THURISAZ_DAMAGE_RADIUS,
	THURISAZ_MAX_DAMAGE,
	THURISAZ_MIN_SIGNAL,
} from "./interaction-rune-data.ts";

/** Position of an entity that can be damaged. */
export interface DamageableEntity {
	x: number;
	y: number;
	z: number;
}

/**
 * Compute damage from a Thurisaz rune based on the signal strength at its block.
 * Returns 0 if signal is below the activation threshold.
 */
export function computeThurisazDamage(signalStrength: number): number {
	if (signalStrength < THURISAZ_MIN_SIGNAL) return 0;
	return Math.min(signalStrength * THURISAZ_DAMAGE_PER_STRENGTH, THURISAZ_MAX_DAMAGE);
}

/**
 * Check if an entity is within the Thurisaz damage radius.
 * Uses squared distance to avoid sqrt.
 */
export function isInDamageRadius(
	sourceX: number,
	sourceY: number,
	sourceZ: number,
	entityX: number,
	entityY: number,
	entityZ: number,
): boolean {
	const dx = entityX - sourceX;
	const dy = entityY - sourceY;
	const dz = entityZ - sourceZ;
	return dx * dx + dy * dy + dz * dz <= THURISAZ_DAMAGE_RADIUS * THURISAZ_DAMAGE_RADIUS;
}

/**
 * Find all entities within Thurisaz damage radius.
 * Returns indices into the entities array.
 */
export function findEntitiesInDamageRadius(
	sourceX: number,
	sourceY: number,
	sourceZ: number,
	entities: ReadonlyArray<DamageableEntity>,
): number[] {
	const indices: number[] = [];
	const rSq = THURISAZ_DAMAGE_RADIUS * THURISAZ_DAMAGE_RADIUS;
	for (let i = 0; i < entities.length; i++) {
		const ent = entities[i];
		const dx = ent.x - sourceX;
		const dy = ent.y - sourceY;
		const dz = ent.z - sourceZ;
		if (dx * dx + dy * dy + dz * dz <= rSq) {
			indices.push(i);
		}
	}
	return indices;
}
