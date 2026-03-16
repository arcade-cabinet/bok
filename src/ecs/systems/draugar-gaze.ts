/**
 * Draugar (Restless Dead) gaze mechanic — pure math, no Three.js.
 * Spectral humanoids that advance only when unobserved (dot product check).
 * Freeze when player looks at them. Teleport to mound at dawn.
 * Consumed by creature-ai-hostile.ts.
 */

// ─── Constants ───

/** Dot product threshold for "observed" (cosine of ~60° half-cone). */
export const OBSERVE_THRESHOLD = 0.5;

/** Speed when advancing (unobserved). */
export const ADVANCE_SPEED = 3.5;

/** Contact damage (massive). */
export const CONTACT_DAMAGE = 40;

/** Contact range (blocks). */
export const CONTACT_RANGE = 1.2;

/** Emissive color: frost blue. */
export const FROST_BLUE = 0xaaccee;

/** HP for Draugar. */
export const DRAUGAR_HP = 10;

/** Detection range (how far Draugar can detect player). */
export const DRAUGAR_DETECTION = 20;

/** Dawn teleport time window (early morning). */
export const DAWN_START = 0.0;
export const DAWN_END = 0.05;

// ─── State ───

export interface DraugarData {
	moundX: number;
	moundY: number;
	moundZ: number;
	frozen: boolean;
}

const draugarStates = new Map<number, DraugarData>();

export function registerDraugar(entityId: number, x: number, y: number, z: number): void {
	draugarStates.set(entityId, {
		moundX: x,
		moundY: y,
		moundZ: z,
		frozen: false,
	});
}

export function getDraugarData(entityId: number): DraugarData | undefined {
	return draugarStates.get(entityId);
}

export function cleanupDraugarState(entityId: number): void {
	draugarStates.delete(entityId);
}

/** Reset all state (for tests). */
export function _resetDraugarState(): void {
	draugarStates.clear();
}

// ─── Observation Check ───

/**
 * Check if the player is looking at the Draugar.
 * Uses dot product of player's look direction and direction to creature.
 *
 * @param playerX - Player position X
 * @param playerZ - Player position Z
 * @param playerYaw - Player yaw rotation (radians)
 * @param creatureX - Draugar position X
 * @param creatureZ - Draugar position Z
 * @returns true if the player is observing the Draugar
 */
export function isObserved(
	playerX: number,
	playerZ: number,
	playerYaw: number,
	creatureX: number,
	creatureZ: number,
): boolean {
	// Player look direction from yaw
	const lookX = Math.sin(playerYaw);
	const lookZ = Math.cos(playerYaw);

	// Direction from player to creature
	const dx = creatureX - playerX;
	const dz = creatureZ - playerZ;
	const dist = Math.sqrt(dx * dx + dz * dz);
	if (dist < 0.01) return true; // on top of player = observed

	const ndx = dx / dist;
	const ndz = dz / dist;

	// Dot product: positive = creature is in front of player
	const dot = lookX * ndx + lookZ * ndz;
	return dot > OBSERVE_THRESHOLD;
}

// ─── Dawn Check ───

/**
 * Check if it's dawn (Draugar should teleport back to mound).
 */
export function isDawn(timeOfDay: number): boolean {
	return timeOfDay > 0.95 || (timeOfDay > DAWN_START && timeOfDay < DAWN_END);
}

// ─── Movement ───

/**
 * Compute advance movement toward player (only when unobserved).
 */
export function advanceToward(
	x: number,
	z: number,
	targetX: number,
	targetZ: number,
	speed: number,
	dt: number,
): { dx: number; dz: number } {
	const ddx = targetX - x;
	const ddz = targetZ - z;
	const dist = Math.sqrt(ddx * ddx + ddz * ddz);
	if (dist < 0.1) return { dx: 0, dz: 0 };
	const inv = (speed * dt) / dist;
	return { dx: ddx * inv, dz: ddz * inv };
}

/**
 * Check if Draugar is in contact range for damage.
 */
export function inContactRange(x: number, z: number, playerX: number, playerZ: number): boolean {
	const dx = x - playerX;
	const dz = z - playerZ;
	return dx * dx + dz * dz <= CONTACT_RANGE * CONTACT_RANGE;
}
