/**
 * Mörker (Darkness) pack AI — pure math, no Three.js.
 * Pack formation, flanking, light damage, size scaling, dawn dissolution.
 * Consumed by creature-ai-hostile.ts.
 */

import { type LightSource, lightDamageToMorker, maxLightIntensity } from "./light-sources.ts";

// ─── Constants ───

/** Torch light radius in blocks (legacy fallback when no light sources available). */
export const TORCH_RADIUS = 6;

/** Damage per second within torch radius (legacy). */
export const TORCH_DPS = 3;

/** Pack size range. */
export const PACK_MIN = 3;
export const PACK_MAX = 5;

/** Flanking formation radius around player. */
export const FLANK_RADIUS = 5;

/** Angular spread of flankers (radians, ~144°). */
export const FLANK_SPREAD = Math.PI * 0.8;

/** Alpha speed multiplier. */
export const ALPHA_SPEED_MULT = 1.2;

/** Range at which Mörker prefer hunting Lyktgubbar. */
export const HUNT_RANGE = 12;

/** Size multiplier at full darkness. */
export const SIZE_NIGHT = 1.3;

/** Size multiplier at full daylight. */
export const SIZE_DAY = 0.4;

/** Extra DPS during dawn dissolution window. */
export const DAWN_DISSOLVE_DPS = 8;

// ─── Pack State ───

export interface MorkerState {
	packId: number;
	isAlpha: boolean;
	flankIndex: number;
}

const packStates = new Map<number, MorkerState>();
let nextPackId = 0;

export function registerPack(entityIds: number[]): void {
	const packId = nextPackId++;
	for (let i = 0; i < entityIds.length; i++) {
		packStates.set(entityIds[i], {
			packId,
			isAlpha: i === 0,
			flankIndex: Math.max(0, i - 1),
		});
	}
}

export function getMorkerState(entityId: number): MorkerState | undefined {
	return packStates.get(entityId);
}

export function cleanupMorkerState(entityId: number): void {
	const state = packStates.get(entityId);
	if (!state) return;
	packStates.delete(entityId);

	if (state.isAlpha) {
		let promoted = false;
		for (const [, s] of packStates) {
			if (s.packId === state.packId && !promoted) {
				s.isAlpha = true;
				promoted = true;
			}
		}
		let idx = 0;
		for (const [, s] of packStates) {
			if (s.packId === state.packId && !s.isAlpha) {
				s.flankIndex = idx++;
			}
		}
	}
}

export function getPackMemberCount(packId: number): number {
	let count = 0;
	for (const [, s] of packStates) {
		if (s.packId === packId) count++;
	}
	return count;
}

/** Reset state (for tests). */
export function _resetPackState(): void {
	packStates.clear();
	nextPackId = 0;
}

// ─── Ambient Light ───

/**
 * Ambient light level from time of day [0,1].
 * Uses same sun-height formula as CelestialBehavior.
 * 0.0 = sunrise, 0.25 = noon, 0.5 = sunset, 0.75 = midnight.
 */
export function ambientLight(timeOfDay: number): number {
	const sunHeight = Math.sin(timeOfDay * Math.PI * 2);
	return Math.max(0, Math.min(1, sunHeight));
}

/** Size scales inversely with ambient light. Bigger in darkness, smaller in light. */
export function sizeScale(timeOfDay: number): number {
	const light = ambientLight(timeOfDay);
	return SIZE_NIGHT + (SIZE_DAY - SIZE_NIGHT) * light;
}

// ─── Light Damage ───

/** Damage from player's torch. Inversely proportional to distance. */
export function lightDamage(distToPlayer: number, dt: number): number {
	if (distToPlayer >= TORCH_RADIUS) return 0;
	const intensity = 1 - distToPlayer / TORCH_RADIUS;
	return TORCH_DPS * intensity * dt;
}

/** Dawn dissolution: rapid damage during the night→day transition. */
export function isDawnDissolving(timeOfDay: number): boolean {
	return timeOfDay > 0.95 || (timeOfDay > 0 && timeOfDay < 0.05);
}

/** Dawn dissolution damage per frame. */
export function dawnDissolveDamage(timeOfDay: number, dt: number): number {
	return isDawnDissolving(timeOfDay) ? DAWN_DISSOLVE_DPS * dt : 0;
}

// ─── Pack Formation ───

/**
 * Compute flanking position for a pack member.
 * Flankers form a semicircle on the opposite side of the player from alpha.
 */
export function flankPosition(
	alphaX: number,
	alphaZ: number,
	playerX: number,
	playerZ: number,
	flankIndex: number,
	totalFlankers: number,
): { x: number; z: number } {
	const dx = alphaX - playerX;
	const dz = alphaZ - playerZ;
	const baseAngle = Math.atan2(dz, dx);

	const angleOffset = ((flankIndex + 1) / (totalFlankers + 1) - 0.5) * FLANK_SPREAD;
	const angle = baseAngle + Math.PI + angleOffset;

	return {
		x: playerX + Math.cos(angle) * FLANK_RADIUS,
		z: playerZ + Math.sin(angle) * FLANK_RADIUS,
	};
}

// ─── Light Source Integration ───

/**
 * Compute Mörker damage from all nearby light sources.
 * Replaces legacy torch-only damage when light sources are available.
 */
export function lightSourceDamage(
	morkerX: number,
	morkerY: number,
	morkerZ: number,
	sources: LightSource[],
	dt: number,
): number {
	const intensity = maxLightIntensity(sources, morkerX, morkerY, morkerZ);
	return lightDamageToMorker(intensity, dt);
}

/**
 * Check if a spawn position is within any light source radius.
 * Used by creature spawner to prevent Mörker from spawning in lit areas.
 */
export function isSpawnBlockedByLight(x: number, y: number, z: number, sources: LightSource[]): boolean {
	for (const s of sources) {
		const dx = x - s.x;
		const dy = y - s.y;
		const dz = z - s.z;
		if (dx * dx + dy * dy + dz * dz < s.radius * s.radius) return true;
	}
	return false;
}

/**
 * Find the nearest light source and compute flee direction.
 * Returns null if not in any light. Used for flee behavior.
 */
export function nearestLightFleeDir(
	morkerX: number,
	morkerY: number,
	morkerZ: number,
	sources: LightSource[],
): { dx: number; dz: number } | null {
	let nearest: LightSource | null = null;
	let bestDistSq = Number.POSITIVE_INFINITY;

	for (const s of sources) {
		const dx = morkerX - s.x;
		const dy = morkerY - s.y;
		const dz = morkerZ - s.z;
		const distSq = dx * dx + dy * dy + dz * dz;
		if (distSq < s.radius * s.radius && distSq < bestDistSq) {
			bestDistSq = distSq;
			nearest = s;
		}
	}

	if (!nearest) return null;

	const dx = morkerX - nearest.x;
	const dz = morkerZ - nearest.z;
	const dist = Math.sqrt(dx * dx + dz * dz);
	if (dist < 0.01) return { dx: 1, dz: 0 };
	return { dx: dx / dist, dz: dz / dist };
}

// ─── Lyktgubbe Hunting ───

export interface TargetPos {
	entityId: number;
	x: number;
	z: number;
}

/** Find nearest Lyktgubbe within hunt range. */
export function nearestLyktgubbe(
	morkerX: number,
	morkerZ: number,
	playerX: number,
	playerZ: number,
	lyktgubbar: TargetPos[],
): TargetPos | null {
	let nearest: TargetPos | null = null;
	let bestDist = HUNT_RANGE;

	for (const lg of lyktgubbar) {
		const dx = lg.x - morkerX;
		const dz = lg.z - morkerZ;
		const dist = Math.sqrt(dx * dx + dz * dz);
		const dpx = playerX - morkerX;
		const dpz = playerZ - morkerZ;
		const distPlayer = Math.sqrt(dpx * dpx + dpz * dpz);
		if (dist < bestDist && dist < distPlayer) {
			bestDist = dist;
			nearest = lg;
		}
	}
	return nearest;
}
