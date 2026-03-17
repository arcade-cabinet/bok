/**
 * Lyktgubbe (Will-o'-the-Wisp) drift, scatter, and reform logic.
 * Pure math — no Three.js dependency. Consumed by creature-ai.ts.
 *
 * Lyktgubbar drift in slow sine patterns, scatter away from the player
 * on approach, then reform to their anchor position when left alone.
 * Color shifts from warm amber over land to cool blue over deep water.
 */

import type { BiomeId } from "../../world/biomes.ts";
import { Biome } from "../../world/biomes.ts";

// ─── Constants ───

/** Warm amber base color for land. */
export const COLOR_AMBER = 0xffd700;

/** Cool blue color over deep water. */
export const COLOR_BLUE = 0x88ccff;

/** Distance at which lyktgubbar scatter from the player. */
export const SCATTER_RANGE = 6;

/** Burst speed when scattering. */
export const SCATTER_SPEED = 8;

/** Speed of returning to anchor after scatter. */
export const REFORM_SPEED = 1.5;

/** Distance threshold — considered "reformed" when within this of anchor. */
export const REFORM_THRESHOLD = 0.5;

/** Water level — below this surface height, color shifts to blue. */
export const WATER_LEVEL = 10;

/** Height at which full blue shift occurs (deep water). */
export const DEEP_WATER_LEVEL = 6;

/** Drift sine frequency (slow, dreamy). */
export const DRIFT_FREQ_X = 0.4;
export const DRIFT_FREQ_Z = 0.3;

/** Drift amplitude in blocks. */
export const DRIFT_AMP = 2.0;

/** Vertical bob frequency and amplitude. */
export const BOB_FREQ = 0.8;
export const BOB_AMP = 0.3;

// ─── Time Window ───

/** Twilight (skymning) time-of-day window. */
export const TWILIGHT_START = 0.7;
export const TWILIGHT_END = 0.85;

/** Dawn (morgon) time-of-day window. */
export const DAWN_START = 0.15;
export const DAWN_END = 0.3;

/**
 * Check if the current time-of-day is within the lyktgubbe spawn window.
 * They appear during skymning (twilight) and morgon (dawn).
 */
export function isLyktgubbeTime(timeOfDay: number): boolean {
	return (
		(timeOfDay >= TWILIGHT_START && timeOfDay <= TWILIGHT_END) || (timeOfDay >= DAWN_START && timeOfDay <= DAWN_END)
	);
}

/**
 * Check if a biome supports lyktgubbe spawning.
 * Spawn in Ängen, Bokskogen, and Myren.
 */
export function isLyktgubbeBiome(biome: BiomeId): boolean {
	return biome === Biome.Angen || biome === Biome.Bokskogen || biome === Biome.Myren;
}

// ─── Drift Pattern ───

/**
 * Compute drift offset from an anchor position using sine patterns.
 * Each lyktgubbe has a unique phase offset (derived from entity ID).
 */
export function driftOffset(time: number, phase: number): { dx: number; dy: number; dz: number } {
	const dx = Math.sin(time * DRIFT_FREQ_X + phase) * DRIFT_AMP;
	const dy = Math.sin(time * BOB_FREQ + phase * 1.7) * BOB_AMP;
	const dz = Math.sin(time * DRIFT_FREQ_Z + phase * 2.3) * DRIFT_AMP;
	return { dx, dy, dz };
}

// ─── Scatter / Reform ───

export interface ScatterState {
	/** Whether the lyktgubbe is currently scattered. */
	scattered: boolean;
	/** Scatter velocity components. */
	velX: number;
	velZ: number;
	/** Offset from anchor due to scatter. */
	offsetX: number;
	offsetZ: number;
}

export function createScatterState(): ScatterState {
	return { scattered: false, velX: 0, velZ: 0, offsetX: 0, offsetZ: 0 };
}

/**
 * Trigger scatter: compute burst velocity away from the player.
 * Returns updated scatter state.
 */
export function triggerScatter(
	posX: number,
	posZ: number,
	playerX: number,
	playerZ: number,
): Pick<ScatterState, "scattered" | "velX" | "velZ"> {
	const dx = posX - playerX;
	const dz = posZ - playerZ;
	const dist = Math.sqrt(dx * dx + dz * dz);
	const invDist = dist > 0.01 ? 1 / dist : 0;

	return {
		scattered: true,
		velX: dx * invDist * SCATTER_SPEED,
		velZ: dz * invDist * SCATTER_SPEED,
	};
}

/**
 * Update scatter state each frame.
 * When scattered: apply velocity with drag.
 * When reforming: drift back toward anchor (offset → 0).
 */
export function updateScatter(state: ScatterState, dt: number): ScatterState {
	if (state.scattered) {
		// Apply velocity with exponential drag
		const drag = Math.exp(-3 * dt);
		const velX = state.velX * drag;
		const velZ = state.velZ * drag;
		const offsetX = state.offsetX + state.velX * dt;
		const offsetZ = state.offsetZ + state.velZ * dt;

		// If velocity is near zero, switch to reform
		const speed = Math.sqrt(velX * velX + velZ * velZ);
		if (speed < 0.1) {
			return { scattered: false, velX: 0, velZ: 0, offsetX, offsetZ };
		}

		return { scattered: true, velX, velZ, offsetX, offsetZ };
	}

	// Reform: lerp offset back to zero
	const reformRate = REFORM_SPEED * dt;
	const dist = Math.sqrt(state.offsetX * state.offsetX + state.offsetZ * state.offsetZ);
	if (dist < REFORM_THRESHOLD) {
		return { scattered: false, velX: 0, velZ: 0, offsetX: 0, offsetZ: 0 };
	}

	const factor = Math.min(1, reformRate / dist);
	return {
		scattered: false,
		velX: 0,
		velZ: 0,
		offsetX: state.offsetX * (1 - factor),
		offsetZ: state.offsetZ * (1 - factor),
	};
}

// ─── Color ───

/**
 * Interpolate lyktgubbe color based on surface height.
 * Warm amber on land, cool blue over deep water.
 * Returns hex color as number.
 */
export function lyktgubbeColor(surfaceY: number): number {
	if (surfaceY >= WATER_LEVEL) return COLOR_AMBER;
	if (surfaceY <= DEEP_WATER_LEVEL) return COLOR_BLUE;

	// Linear interpolation between amber and blue
	const t = (WATER_LEVEL - surfaceY) / (WATER_LEVEL - DEEP_WATER_LEVEL);
	return lerpColor(COLOR_AMBER, COLOR_BLUE, t);
}

/** Linearly interpolate between two hex colors. */
function lerpColor(a: number, b: number, t: number): number {
	const ar = (a >> 16) & 0xff;
	const ag = (a >> 8) & 0xff;
	const ab = a & 0xff;
	const br = (b >> 16) & 0xff;
	const bg = (b >> 8) & 0xff;
	const bb = b & 0xff;

	const r = Math.round(ar + (br - ar) * t);
	const g = Math.round(ag + (bg - ag) * t);
	const blue = Math.round(ab + (bb - ab) * t);

	return (r << 16) | (g << 8) | blue;
}
