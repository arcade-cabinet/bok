/**
 * Vittra (Underground Folk) debuff mechanic — pure math, no Three.js.
 * Small humanoids near mounds that inflict "otur" (bad luck) debuffs.
 * Appeased by food offerings placed near mounds.
 * Consumed by creature-ai-vittra.ts.
 */

import type { BiomeId } from "../../world/biomes.ts";
import { Biome } from "../../world/biomes.ts";

// ─── Constants ───

/** Range at which mining triggers aggravation. */
export const MOUND_AGGRO_RANGE = 6;

/** Range at which Vittra inflicts otur debuff. */
export const DEBUFF_RANGE = 8;

/** Hunger decay multiplier when debuffed (1.5x faster). */
export const OTUR_HUNGER_MULT = 1.5;

/** Tool durability loss multiplier when debuffed. */
export const OTUR_DURABILITY_MULT = 1.5;

/** Debuff application rate (damage per second for gradual effect). */
export const DEBUFF_DPS = 0;

/** Range at which food offering appeases Vittra. */
export const OFFERING_RANGE = 4;

/** Time of day when Vittra retreat underground (dawn). */
export const RETREAT_TIME = 0.1;

/** Speed when hovering near player. */
export const HOVER_SPEED = 1.5;

/** Hover orbit radius. */
export const ORBIT_RADIUS = 3;

/** Orbit angular speed (radians/sec). */
export const ORBIT_SPEED = 1.2;

/** Transparency state: 0 = transparent (passive), 1 = solid (aggravated). */
export type VittraVisibility = 0 | 1;

// ─── State ───

export interface VittraData {
	moundX: number;
	moundY: number;
	moundZ: number;
	aggravated: boolean;
	appeased: boolean;
	orbitAngle: number;
}

const vittraStates = new Map<number, VittraData>();

export function registerVittra(entityId: number, x: number, y: number, z: number): void {
	vittraStates.set(entityId, {
		moundX: x,
		moundY: y,
		moundZ: z,
		aggravated: false,
		appeased: false,
		orbitAngle: entityId * 1.37,
	});
}

export function getVittraData(entityId: number): VittraData | undefined {
	return vittraStates.get(entityId);
}

export function cleanupVittraState(entityId: number): void {
	vittraStates.delete(entityId);
}

/** Reset all state (for tests). */
export function _resetVittraState(): void {
	vittraStates.clear();
}

// ─── Biome Check ───

/** Vittra spawn in Bokskogen and Myren (near mounds and ruins). */
export function isVittraBiome(biome: BiomeId): boolean {
	return biome === Biome.Bokskogen || biome === Biome.Myren;
}

// ─── Aggravation ───

/**
 * Check if player mining activity near mound should aggravate Vittra.
 * @param moundX - Mound position X
 * @param moundZ - Mound position Z
 * @param miningX - Mining target X
 * @param miningZ - Mining target Z
 * @returns true if mining is within aggro range of mound
 */
export function shouldAggravate(moundX: number, moundZ: number, miningX: number, miningZ: number): boolean {
	const dx = moundX - miningX;
	const dz = moundZ - miningZ;
	return dx * dx + dz * dz <= MOUND_AGGRO_RANGE * MOUND_AGGRO_RANGE;
}

// ─── Debuff Check ───

/**
 * Check if Vittra is close enough to inflict otur debuff.
 */
export function inDebuffRange(vittraX: number, vittraZ: number, playerX: number, playerZ: number): boolean {
	const dx = vittraX - playerX;
	const dz = vittraZ - playerZ;
	return dx * dx + dz * dz <= DEBUFF_RANGE * DEBUFF_RANGE;
}

// ─── Appeasement ───

/**
 * Check if a food offering is near the mound.
 */
export function isOfferingNearMound(moundX: number, moundZ: number, offeringX: number, offeringZ: number): boolean {
	const dx = moundX - offeringX;
	const dz = moundZ - offeringZ;
	return dx * dx + dz * dz <= OFFERING_RANGE * OFFERING_RANGE;
}

// ─── Movement ───

/**
 * Compute orbit position around player (hovering menacingly).
 */
export function orbitPosition(playerX: number, playerZ: number, angle: number): { x: number; z: number } {
	return {
		x: playerX + Math.cos(angle) * ORBIT_RADIUS,
		z: playerZ + Math.sin(angle) * ORBIT_RADIUS,
	};
}

/**
 * Compute visibility: semi-transparent when passive, solid when aggravated.
 */
export function getVisibility(aggravated: boolean): VittraVisibility {
	return aggravated ? 1 : 0;
}

/**
 * Check if Vittra should retreat (dawn).
 */
export function shouldRetreat(timeOfDay: number): boolean {
	return timeOfDay > RETREAT_TIME && timeOfDay < 0.5;
}
