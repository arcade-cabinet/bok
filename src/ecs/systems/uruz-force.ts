// ─── Uruz (Strength) Push Force Logic ───
// Pure math: computes push force on entities from signal strength and face direction.
// No ECS, no Three.js — just distance checks and velocity computation.

import { URUZ_FORCE_PER_STRENGTH, URUZ_MAX_FORCE, URUZ_MIN_SIGNAL, URUZ_PUSH_RADIUS } from "./network-rune-data.ts";
import type { FaceIndex } from "./rune-data.ts";
import { FACE_OFFSETS } from "./signal-data.ts";

/** An entity that can be pushed by Uruz force. */
export interface PushableEntity {
	x: number;
	y: number;
	z: number;
}

/**
 * Compute the push force magnitude from signal strength.
 * Returns 0 if below minimum activation threshold.
 */
export function computePushForce(signalStrength: number): number {
	if (signalStrength < URUZ_MIN_SIGNAL) return 0;
	return Math.min(signalStrength * URUZ_FORCE_PER_STRENGTH, URUZ_MAX_FORCE);
}

/**
 * Compute push velocity for an entity based on the inscribed face direction.
 * The push direction is the face normal of the inscribed face.
 * Returns [vx, vy, vz] velocity components.
 */
export function computePushVelocity(face: FaceIndex, signalStrength: number): [number, number, number] {
	const force = computePushForce(signalStrength);
	if (force === 0) return [0, 0, 0];
	const [dx, dy, dz] = FACE_OFFSETS[face];
	return [dx * force, dy * force, dz * force];
}

/**
 * Check if an entity is within the Uruz push radius.
 * Uses squared distance to avoid sqrt.
 */
export function isInPushRadius(
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
	return dx * dx + dy * dy + dz * dz <= URUZ_PUSH_RADIUS * URUZ_PUSH_RADIUS;
}

/**
 * Find all entities within Uruz push radius.
 * Returns indices into the entities array.
 */
export function findEntitiesInPushRadius(
	sourceX: number,
	sourceY: number,
	sourceZ: number,
	entities: ReadonlyArray<PushableEntity>,
): number[] {
	const indices: number[] = [];
	const rSq = URUZ_PUSH_RADIUS * URUZ_PUSH_RADIUS;
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
