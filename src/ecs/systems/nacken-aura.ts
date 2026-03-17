/**
 * Nacken (Water Spirit) aura mechanic — pure math, no Three.js.
 * Humanoid sitting on water rocks with disorientation aura.
 * Teaches a rune when iron offering thrown in water.
 * Consumed by creature-ai-nacken.ts.
 */

// ─── Constants ───

/** Range at which disorientation aura activates. */
export const AURA_RANGE = 8;

/** Disorientation duration in seconds. */
export const DISORIENT_DURATION = 3;

/** Camera sway amplitude during disorientation. */
export const SWAY_AMPLITUDE = 0.15;

/** Camera sway frequency during disorientation. */
export const SWAY_FREQUENCY = 3.0;

/** Iron offering detection range from Nacken's water. */
export const OFFERING_RANGE = 6;

/** Cooldown between disorientation applications. */
export const AURA_COOLDOWN = 8;

/** Nacken emissive color: translucent green-blue. */
export const NACKEN_COLOR = 0x44aaaa;

// ─── State ───

export interface NackenData {
	seatX: number;
	seatY: number;
	seatZ: number;
	hasTeachRune: boolean;
	disorientCooldown: number;
}

const nackenStates = new Map<number, NackenData>();

export function registerNacken(entityId: number, x: number, y: number, z: number): void {
	nackenStates.set(entityId, {
		seatX: x,
		seatY: y,
		seatZ: z,
		hasTeachRune: true,
		disorientCooldown: 0,
	});
}

export function getNackenData(entityId: number): NackenData | undefined {
	return nackenStates.get(entityId);
}

export function cleanupNackenState(entityId: number): void {
	nackenStates.delete(entityId);
}

/** Reset all state (for tests). */
export function _resetNackenState(): void {
	nackenStates.clear();
}

// ─── Aura Check ───

/**
 * Check if player is within disorientation aura range.
 */
export function inAuraRange(nackenX: number, nackenZ: number, playerX: number, playerZ: number): boolean {
	const dx = nackenX - playerX;
	const dz = nackenZ - playerZ;
	return dx * dx + dz * dz <= AURA_RANGE * AURA_RANGE;
}

// ─── Disorientation ───

/**
 * Compute camera sway offset for disorientation effect.
 * @param time - Elapsed time in seconds
 * @returns sway offset for camera X
 */
export function computeSway(time: number): number {
	return Math.sin(time * SWAY_FREQUENCY * Math.PI * 2) * SWAY_AMPLITUDE;
}

/**
 * Check if disorientation should reverse controls.
 * Active during the full disorientation duration.
 */
export function isControlsReversed(disorientTimer: number): boolean {
	return disorientTimer > 0;
}

// ─── Offering Check ───

/**
 * Check if an iron offering is near Nacken's water.
 */
export function isIronOfferingNear(nackenX: number, nackenZ: number, offeringX: number, offeringZ: number): boolean {
	const dx = nackenX - offeringX;
	const dz = nackenZ - offeringZ;
	return dx * dx + dz * dz <= OFFERING_RANGE * OFFERING_RANGE;
}

/**
 * Consume rune teaching. Returns true if rune was available.
 */
export function teachRune(entityId: number): boolean {
	const data = nackenStates.get(entityId);
	if (!data || !data.hasTeachRune) return false;
	data.hasTeachRune = false;
	return true;
}
