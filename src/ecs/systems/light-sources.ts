/**
 * Light sources — pure data module, no ECS/Three.js.
 * Defines light radii per source type, damage rates in light,
 * and helpers for querying light coverage at world positions.
 */

import { BlockId } from "../../world/blocks.ts";

// ─── Light Radii (in blocks) ───

/** Light radius per block source type. */
export const BLOCK_LIGHT_RADIUS: Record<number, number> = {
	[BlockId.Torch]: 4,
	[BlockId.Forge]: 4,
	[BlockId.Crystal]: 6,
};

/** Light radius per held item ID. */
export const ITEM_LIGHT_RADIUS: Record<number, number> = {
	108: 8, // Lantern
	109: 12, // Ember Lantern
};

/** Glyph Lamp block ID (reserved for future). */
export const GLYPH_LAMP_RADIUS = 20;

/** DPS to Mörker within any light radius. Intensity scales with proximity. */
export const LIGHT_DPS = 4;

// ─── Light Source Data ───

export interface LightSource {
	x: number;
	y: number;
	z: number;
	radius: number;
}

/**
 * Compute the light intensity at a position from a single source.
 * Returns 0 if outside radius, linear falloff [1..0) inside.
 */
export function lightIntensityAt(
	sx: number,
	sy: number,
	sz: number,
	radius: number,
	qx: number,
	qy: number,
	qz: number,
): number {
	const dx = qx - sx;
	const dy = qy - sy;
	const dz = qz - sz;
	const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
	if (dist >= radius) return 0;
	return 1 - dist / radius;
}

/**
 * Find the maximum light intensity at a position from multiple sources.
 * Returns 0 if no light reaches the position.
 */
export function maxLightIntensity(sources: LightSource[], qx: number, qy: number, qz: number): number {
	let max = 0;
	for (const s of sources) {
		const i = lightIntensityAt(s.x, s.y, s.z, s.radius, qx, qy, qz);
		if (i > max) max = i;
	}
	return max;
}

/**
 * Check if a position is within any light source radius.
 * Faster than maxLightIntensity when you only need a boolean.
 */
export function isInLight(sources: LightSource[], qx: number, qy: number, qz: number): boolean {
	for (const s of sources) {
		const dx = qx - s.x;
		const dy = qy - s.y;
		const dz = qz - s.z;
		if (dx * dx + dy * dy + dz * dz < s.radius * s.radius) return true;
	}
	return false;
}

/**
 * Compute damage per frame to a Mörker based on light intensity.
 * Intensity-proportional: closer to source = more damage.
 */
export function lightDamageToMorker(intensity: number, dt: number): number {
	if (intensity <= 0) return 0;
	return LIGHT_DPS * intensity * dt;
}

/**
 * Get the light radius for a block ID, or 0 if not a light source.
 */
export function getBlockLightRadius(blockId: number): number {
	return BLOCK_LIGHT_RADIUS[blockId] ?? 0;
}

/**
 * Get the light radius for a held item ID, or 0 if not a light item.
 */
export function getItemLightRadius(itemId: number): number {
	return ITEM_LIGHT_RADIUS[itemId] ?? 0;
}
