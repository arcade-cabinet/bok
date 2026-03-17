/**
 * Lindorm (Wyrm) tunneling AI — pure math, no Three.js.
 * 12-segment serpent that tunnels through soft blocks, breaches near player.
 * Uses follow-the-leader chain from spring-physics.ts for segment motion.
 * Consumed by creature-ai-hostile.ts.
 */

import { BlockId } from "../../world/blocks.ts";

// ─── Constants ───

/** Number of body segments (including head). */
export const SEGMENT_COUNT = 12;

/** Spacing between segments in blocks. */
export const SEGMENT_SPACING = 0.6;

/** Speed while tunneling underground. */
export const TUNNEL_SPEED = 3.0;

/** Speed during breach arc attack. */
export const BREACH_SPEED = 5.0;

/** Arc height during breach. */
export const BREACH_ARC_HEIGHT = 6.0;

/** Damage on contact during breach. */
export const BREACH_DAMAGE = 20;

/** Range at which mining vibrations attract. */
export const VIBRATION_RANGE = 25;

/** Range at which Lindorm decides to breach near player. */
export const BREACH_TRIGGER_RANGE = 5;

/** Time underground before next breach attempt. */
export const TUNNEL_DURATION = 4.0;

/** Time for a full breach arc. */
export const BREACH_DURATION = 2.0;

/** HP for Lindorm. */
export const LINDORM_HP = 15;

// ─── State ───

export const LindormPhase = {
	Underground: 0,
	Breaching: 1,
	Diving: 2,
} as const;
export type LindormPhaseId = (typeof LindormPhase)[keyof typeof LindormPhase];

export interface LindormData {
	phase: LindormPhaseId;
	phaseTimer: number;
	/** Underground movement target. */
	targetX: number;
	targetZ: number;
	/** Breach origin (where it surfaces). */
	breachX: number;
	breachZ: number;
	/** Breach arc progress [0,1]. */
	breachProgress: number;
	/** Direction of breach arc (radians). */
	breachAngle: number;
}

const lindormStates = new Map<number, LindormData>();

export function registerLindorm(entityId: number, targetX: number, targetZ: number): void {
	lindormStates.set(entityId, {
		phase: LindormPhase.Underground,
		phaseTimer: TUNNEL_DURATION,
		targetX,
		targetZ,
		breachX: 0,
		breachZ: 0,
		breachProgress: 0,
		breachAngle: 0,
	});
}

export function getLindormData(entityId: number): LindormData | undefined {
	return lindormStates.get(entityId);
}

export function cleanupLindormState(entityId: number): void {
	lindormStates.delete(entityId);
}

/** Reset all state (for tests). */
export function _resetLindormState(): void {
	lindormStates.clear();
}

// ─── Soft Block Check ───

/** Block IDs the Lindorm can tunnel through (dirt, grass, sand, moss, peat). */
const SOFT_BLOCK_IDS: ReadonlySet<number> = new Set([
	BlockId.Dirt,
	BlockId.Grass,
	BlockId.Sand,
	BlockId.Moss,
	BlockId.Peat,
]);

/** Tunnel depth — how many blocks below surface the wyrm carves. */
const TUNNEL_DEPTH = 3;

/**
 * Check if a block type is soft enough for Lindorm to tunnel through.
 * Soft blocks: dirt, grass, sand, moss, peat. Not stone.
 */
export function canTunnelThrough(isSoftBlock: boolean): boolean {
	return isSoftBlock;
}

/** Check if a block ID is soft enough for Lindorm tunneling. */
export function isSoftBlock(blockId: number): boolean {
	return SOFT_BLOCK_IDS.has(blockId);
}

// ─── Terrain Modification ───

export interface TunnelBlock {
	x: number;
	y: number;
	z: number;
}

/**
 * Collect soft blocks around the Lindorm's underground position to remove.
 * Creates a 1-wide column of removed blocks, simulating a wyrm-sized tunnel.
 */
export function collectTunnelBlocks(
	worldX: number,
	surfaceY: number,
	worldZ: number,
	getBlock: (x: number, y: number, z: number) => number,
): TunnelBlock[] {
	const bx = Math.floor(worldX);
	const bz = Math.floor(worldZ);
	const result: TunnelBlock[] = [];

	// Sample a column from surface down to tunnel depth
	for (let dy = 0; dy < TUNNEL_DEPTH; dy++) {
		const by = Math.floor(surfaceY) - dy;
		if (by < 0) break;
		const blockId = getBlock(bx, by, bz);
		if (isSoftBlock(blockId)) {
			result.push({ x: bx, y: by, z: bz });
		}
	}
	return result;
}

// ─── Tunnel Pathfinding ───

/**
 * Move underground toward a target position.
 * Returns the movement delta (XZ plane only, underground is implied).
 */
export function tunnelToward(
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
 * Check if the Lindorm is close enough to its target to start breaching.
 */
export function nearTarget(x: number, z: number, targetX: number, targetZ: number): boolean {
	const dx = x - targetX;
	const dz = z - targetZ;
	return dx * dx + dz * dz < BREACH_TRIGGER_RANGE * BREACH_TRIGGER_RANGE;
}

// ─── Breach Arc ───

/**
 * Compute Y position during breach arc (parabolic).
 * Progress [0,1]: 0=surface, 0.5=apex, 1=dive back.
 */
export function breachArcY(progress: number, surfaceY: number): number {
	// Parabola: 4*h*p*(1-p) peaks at 0.5
	return surfaceY + 4 * BREACH_ARC_HEIGHT * progress * (1 - progress);
}

/**
 * Compute XZ position during breach arc.
 * Lindorm arcs forward in the direction of breachAngle.
 */
export function breachArcXZ(
	breachX: number,
	breachZ: number,
	angle: number,
	progress: number,
): { x: number; z: number } {
	const arcLength = BREACH_ARC_HEIGHT * 1.5;
	return {
		x: breachX + Math.sin(angle) * progress * arcLength,
		z: breachZ + Math.cos(angle) * progress * arcLength,
	};
}

/**
 * Check if the breach arc contacts the player (damage check).
 */
export function breachHitsPlayer(headX: number, headZ: number, playerX: number, playerZ: number): boolean {
	const dx = headX - playerX;
	const dz = headZ - playerZ;
	return dx * dx + dz * dz < 2.0 * 2.0;
}

// ─── Mining Vibration ───

/**
 * Check if mining activity is within vibration range.
 * Returns true if the Lindorm should target this position.
 */
export function attractedByMining(lindormX: number, lindormZ: number, mineX: number, mineZ: number): boolean {
	const dx = mineX - lindormX;
	const dz = mineZ - lindormZ;
	return dx * dx + dz * dz <= VIBRATION_RANGE * VIBRATION_RANGE;
}
