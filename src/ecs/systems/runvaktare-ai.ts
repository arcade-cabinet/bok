/**
 * Runväktare (Rune Warden) AI — pure math, no Three.js.
 * Dormant sentinels near ruins that activate when ruin blocks are mined.
 * Slam attack with ground AOE, return to post when player retreats.
 * Consumed by creature-ai-hostile.ts.
 */

// ─── Constants ───

/** Distance at which mining activity triggers activation. */
export const ACTIVATION_RANGE = 8;

/** Distance beyond which Runväktare returns to its post. */
export const RETURN_RANGE = 20;

/** Range of the ground-slam AOE attack. */
export const SLAM_RANGE = 3;

/** Slam damage dealt to the player. */
export const SLAM_DAMAGE = 25;

/** Cooldown between slam attacks (seconds). */
export const SLAM_COOLDOWN = 3.0;

/** Speed when gliding toward player. */
export const GLIDE_SPEED = 1.5;

/** Speed when returning to post. */
export const RETURN_SPEED = 2.0;

/** HP for Runväktare. */
export const RUNVAKTARE_HP = 20;

// ─── State ───

export const RunvaktareState = {
	Dormant: 0,
	Active: 1,
	Returning: 2,
} as const;
export type RunvaktareStateId = (typeof RunvaktareState)[keyof typeof RunvaktareState];

export interface RunvaktareData {
	state: RunvaktareStateId;
	postX: number;
	postY: number;
	postZ: number;
	slamCooldown: number;
}

const runvaktareStates = new Map<number, RunvaktareData>();

export function registerRunvaktare(entityId: number, x: number, y: number, z: number): void {
	runvaktareStates.set(entityId, {
		state: RunvaktareState.Dormant,
		postX: x,
		postY: y,
		postZ: z,
		slamCooldown: 0,
	});
}

export function getRunvaktareData(entityId: number): RunvaktareData | undefined {
	return runvaktareStates.get(entityId);
}

export function cleanupRunvaktareState(entityId: number): void {
	runvaktareStates.delete(entityId);
}

/** Reset all state (for tests). */
export function _resetRunvaktareState(): void {
	runvaktareStates.clear();
}

// ─── Activation ───

/**
 * Check if mining activity should activate a dormant Runväktare.
 * Returns true if the mined position is within ACTIVATION_RANGE of the post.
 */
export function shouldActivate(
	postX: number,
	postZ: number,
	mineX: number,
	mineZ: number,
	isRuneStone: boolean,
): boolean {
	if (!isRuneStone) return false;
	const dx = mineX - postX;
	const dz = mineZ - postZ;
	return dx * dx + dz * dz <= ACTIVATION_RANGE * ACTIVATION_RANGE;
}

/**
 * Activate a dormant Runväktare.
 */
export function activate(entityId: number): void {
	const data = runvaktareStates.get(entityId);
	if (data && data.state === RunvaktareState.Dormant) {
		data.state = RunvaktareState.Active;
	}
}

// ─── Movement ───

/**
 * Compute movement vector toward a target, clamped to speed.
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
	if (dist < 0.1) return { dx: 0, dz: 0 };
	const inv = (speed * dt) / dist;
	return { dx: ddx * inv, dz: ddz * inv };
}

/**
 * Check if Runväktare should return to post (player too far).
 */
export function shouldReturn(postX: number, postZ: number, playerX: number, playerZ: number): boolean {
	const dx = playerX - postX;
	const dz = playerZ - postZ;
	return dx * dx + dz * dz > RETURN_RANGE * RETURN_RANGE;
}

/**
 * Check if Runväktare has reached its post.
 */
export function atPost(x: number, z: number, postX: number, postZ: number): boolean {
	const dx = x - postX;
	const dz = z - postZ;
	return dx * dx + dz * dz < 0.5;
}

// ─── Slam Attack ───

/**
 * Check if slam attack can hit the player.
 */
export function canSlam(x: number, z: number, playerX: number, playerZ: number, cooldown: number): boolean {
	if (cooldown > 0) return false;
	const dx = playerX - x;
	const dz = playerZ - z;
	return dx * dx + dz * dz <= SLAM_RANGE * SLAM_RANGE;
}
