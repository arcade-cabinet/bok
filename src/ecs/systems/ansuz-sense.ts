// ─── Ansuz (Wisdom) Sense Logic ───
// Pure math: creature detection within configurable radius.
// No ECS, no Three.js — just distance checks and signal emission decisions.

import { ANSUZ_DETECT_RADIUS, ANSUZ_EMIT_STRENGTH } from "./interaction-rune-data.ts";

/** Position of an entity (creature or player) for detection. */
export interface DetectableEntity {
	x: number;
	y: number;
	z: number;
}

/** Ansuz rune source position. */
export interface AnsuzSource {
	x: number;
	y: number;
	z: number;
}

/**
 * Check if any entity is within the Ansuz detection radius.
 * Uses squared distance to avoid sqrt.
 * Returns true if at least one entity is detected.
 */
export function detectsEntity(source: AnsuzSource, entities: ReadonlyArray<DetectableEntity>): boolean {
	const rSq = ANSUZ_DETECT_RADIUS * ANSUZ_DETECT_RADIUS;
	for (const ent of entities) {
		const dx = ent.x - source.x;
		const dy = ent.y - source.y;
		const dz = ent.z - source.z;
		if (dx * dx + dy * dy + dz * dz <= rSq) return true;
	}
	return false;
}

/**
 * Count entities within the Ansuz detection radius.
 * Used for signal strength scaling (more entities = stronger signal, capped).
 */
export function countDetectedEntities(source: AnsuzSource, entities: ReadonlyArray<DetectableEntity>): number {
	const rSq = ANSUZ_DETECT_RADIUS * ANSUZ_DETECT_RADIUS;
	let count = 0;
	for (const ent of entities) {
		const dx = ent.x - source.x;
		const dy = ent.y - source.y;
		const dz = ent.z - source.z;
		if (dx * dx + dy * dy + dz * dz <= rSq) count++;
	}
	return count;
}

/**
 * Compute signal strength to emit based on detected entity count.
 * Base strength is ANSUZ_EMIT_STRENGTH, unaffected by count (binary: detected or not).
 * Returns 0 if no entities detected.
 */
export function computeAnsuzSignalStrength(detectedCount: number): number {
	if (detectedCount <= 0) return 0;
	return ANSUZ_EMIT_STRENGTH;
}

/**
 * Check if a specific entity is within detection range of an Ansuz source.
 */
export function isEntityDetected(
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
	return dx * dx + dy * dy + dz * dz <= ANSUZ_DETECT_RADIUS * ANSUZ_DETECT_RADIUS;
}
