/**
 * Jatten (Giant) boss mechanic — pure math, no Three.js.
 * Massive humanoid assembled from terrain blocks. Appears at inscription level 1000+.
 * Attacks player's structures, regenerates by pulling blocks from terrain.
 * Drops Runsten Seal on defeat. Consumed by creature-ai-jatten.ts.
 */

// ─── Constants ───

/** Inscription level threshold to trigger Jatten spawn. */
export const INSCRIPTION_THRESHOLD = 1000;

/** Jatten height in blocks. */
export const JATTEN_HEIGHT = 8;

/** Attack range (blocks) — melee arm swing. */
export const ATTACK_RANGE = 4;

/** Attack damage per hit. */
export const ATTACK_DAMAGE = 30;

/** Attack cooldown in seconds. */
export const ATTACK_COOLDOWN = 2.5;

/** Movement speed (blocks/sec) — slow but relentless. */
export const MOVE_SPEED = 1.2;

/** Regeneration range — radius to pull blocks from terrain. */
export const REGEN_RANGE = 10;

/** HP healed per block consumed. */
export const REGEN_PER_BLOCK = 5;

/** Regen cooldown in seconds. */
export const REGEN_COOLDOWN = 4;

/** Stagger threshold — damage needed to expose core. */
export const STAGGER_THRESHOLD = 30;

/** Stagger duration in seconds. */
export const STAGGER_DURATION = 3;

/** Max HP for the Jatten boss. */
export const JATTEN_MAX_HP = 100;

/** Terrain color — assembled from world blocks. */
export const JATTEN_STONE = 0x6b6b6b;
export const JATTEN_WOOD = 0x8b6914;
export const JATTEN_MOSS = 0x3a5a40;

// ─── State ───

export type JattenPhase = "approach" | "attack" | "regen" | "stagger";

export interface JattenData {
	phase: JattenPhase;
	targetX: number;
	targetZ: number;
	regenCooldown: number;
	staggerTimer: number;
	damageAccum: number;
	blocksConsumed: number;
}

const jattenStates = new Map<number, JattenData>();

export function registerJatten(entityId: number, targetX: number, targetZ: number): void {
	jattenStates.set(entityId, {
		phase: "approach",
		targetX,
		targetZ,
		regenCooldown: 0,
		staggerTimer: 0,
		damageAccum: 0,
		blocksConsumed: 0,
	});
}

export function getJattenData(entityId: number): JattenData | undefined {
	return jattenStates.get(entityId);
}

export function cleanupJattenState(entityId: number): void {
	jattenStates.delete(entityId);
}

/** Reset all state (for tests). */
export function _resetJattenState(): void {
	jattenStates.clear();
}

// ─── Inscription Check ───

/**
 * Check if player inscription level meets Jatten spawn threshold.
 */
export function meetsInscriptionThreshold(inscriptionLevel: number): boolean {
	return inscriptionLevel >= INSCRIPTION_THRESHOLD;
}

// ─── Phase Logic ───

/**
 * Compute movement toward target (player's structure or player).
 */
export function moveToward(
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
	if (dist < 0.5) return { dx: 0, dz: 0 };
	const inv = (speed * dt) / dist;
	return { dx: ddx * inv, dz: ddz * inv };
}

/**
 * Check if Jatten is in attack range.
 */
export function inAttackRange(x: number, z: number, targetX: number, targetZ: number): boolean {
	const dx = x - targetX;
	const dz = z - targetZ;
	return dx * dx + dz * dz <= ATTACK_RANGE * ATTACK_RANGE;
}

/**
 * Record damage and check for stagger.
 * Returns true if the Jatten should enter stagger phase.
 */
export function recordDamage(entityId: number, damage: number): boolean {
	const data = jattenStates.get(entityId);
	if (!data) return false;
	data.damageAccum += damage;
	if (data.damageAccum >= STAGGER_THRESHOLD) {
		data.damageAccum = 0;
		return true;
	}
	return false;
}

/**
 * Attempt terrain regeneration — returns true if regen should happen.
 */
export function shouldRegen(entityId: number, hp: number, maxHp: number): boolean {
	const data = jattenStates.get(entityId);
	if (!data) return false;
	return hp < maxHp && data.regenCooldown <= 0 && data.phase !== "stagger";
}

/**
 * Consume a block for regeneration.
 */
export function consumeBlock(entityId: number): number {
	const data = jattenStates.get(entityId);
	if (!data) return 0;
	data.blocksConsumed++;
	data.regenCooldown = REGEN_COOLDOWN;
	return REGEN_PER_BLOCK;
}
