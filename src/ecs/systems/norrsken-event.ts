/**
 * Norrsken (Northern Lights) — pure math module.
 * Trigger probability, aurora color cycling, resource surfacing positions.
 * No Three.js, no ECS imports.
 */

// ─── Constants ───

/** 5% chance per night to trigger. */
export const TRIGGER_CHANCE = 0.05;

/** Event lasts 60 seconds. */
export const EVENT_DURATION = 60;

/** Number of resource blocks that surface during event. */
export const RESOURCE_COUNT = 3;

/** Max radius around player for resource placement. */
export const RESOURCE_RADIUS = 15;

/** Min radius to avoid placing at player's feet. */
export const RESOURCE_MIN_RADIUS = 5;

/** Aurora palette: green, purple, blue. */
export const AURORA_COLORS: readonly [number, number, number] = [0x88ff88, 0xaa66cc, 0x66aaff];

/** Cycle period in seconds for full color rotation. */
export const COLOR_CYCLE_PERIOD = 6;

// ─── Night Detection ───

/**
 * Check if the current timeOfDay is night.
 * Night: sunHeight <= 0, which is timeOfDay in [0.5, 1.0).
 * Also includes exact midnight (0.0) though this is transient.
 */
export function isNightTime(timeOfDay: number): boolean {
	return timeOfDay >= 0.5 || timeOfDay === 0;
}

// ─── Trigger Check ───

/**
 * Determine if the Norrsken should trigger this night.
 * @param rng - Random value in [0, 1) from worldRng or cosmeticRng.
 * @returns true if event should trigger (rng < TRIGGER_CHANCE).
 */
export function shouldTrigger(rng: number): boolean {
	return rng < TRIGGER_CHANCE;
}

// ─── Aurora Color ───

/**
 * Compute the interpolated aurora color at a given event time.
 * Cycles through green → purple → blue → green over COLOR_CYCLE_PERIOD seconds.
 * @returns RGB values in [0, 255].
 */
export function auroraColor(eventTime: number): { r: number; g: number; b: number } {
	const cycle = (((eventTime / COLOR_CYCLE_PERIOD) % 1) + 1) % 1;
	const idx = Math.floor(cycle * 3);
	const frac = cycle * 3 - idx;
	const c0 = AURORA_COLORS[idx % 3];
	const c1 = AURORA_COLORS[(idx + 1) % 3];
	return lerpColor(c0, c1, frac);
}

/**
 * Pack RGB components into a single hex number (0xRRGGBB).
 */
export function packColor(r: number, g: number, b: number): number {
	return ((Math.round(r) & 0xff) << 16) | ((Math.round(g) & 0xff) << 8) | (Math.round(b) & 0xff);
}

function lerpColor(a: number, b: number, t: number): { r: number; g: number; b: number } {
	const ar = (a >> 16) & 0xff;
	const ag = (a >> 8) & 0xff;
	const ab = a & 0xff;
	const br = (b >> 16) & 0xff;
	const bg = (b >> 8) & 0xff;
	const bb = b & 0xff;
	return {
		r: ar + (br - ar) * t,
		g: ag + (bg - ag) * t,
		b: ab + (bb - ab) * t,
	};
}

// ─── Resource Surfacing ───

/**
 * Generate deterministic positions for resource blocks around the player.
 * Uses a simple hash to spread positions in a ring.
 * @returns Array of { x, z } integer world positions.
 */
export function generateResourcePositions(
	px: number,
	pz: number,
	seed: number,
	count: number,
): Array<{ x: number; z: number }> {
	const positions: Array<{ x: number; z: number }> = [];
	for (let i = 0; i < count; i++) {
		const hash1 = ((seed * 7919 + i * 2654435761) >>> 0) % 10000;
		const hash2 = ((seed * 104729 + i * 1299827) >>> 0) % 10000;
		const angle = (hash1 / 10000) * Math.PI * 2;
		const radius = RESOURCE_MIN_RADIUS + (hash2 / 10000) * (RESOURCE_RADIUS - RESOURCE_MIN_RADIUS);
		positions.push({
			x: Math.floor(px + Math.cos(angle) * radius),
			z: Math.floor(pz + Math.sin(angle) * radius),
		});
	}
	return positions;
}

/**
 * Compute aurora tint intensity based on event progress.
 * Fades in over 3 seconds at start, fades out over 3 seconds at end.
 */
export function auroraTintIntensity(timer: number): number {
	const elapsed = EVENT_DURATION - timer;
	const fadeIn = Math.min(1, elapsed / 3);
	const fadeOut = Math.min(1, timer / 3);
	return fadeIn * fadeOut;
}
