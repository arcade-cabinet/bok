/**
 * Lindorm (Wyrm) tunneling AI — pure math, no Three.js.
 * 12-segment serpent that tunnels through soft blocks, breaches near player.
 * Uses follow-the-leader chain from spring-physics.ts for segment motion.
 * Consumed by creature-ai-hostile.ts.
 */

import { BlockId } from "../../world/blocks.ts";
import {
	BREACH_ARC_HEIGHT,
	BREACH_DAMAGE,
	BREACH_DURATION,
	BREACH_SPEED,
	BREACH_TRIGGER_RANGE,
	LINDORM_HP,
	LindormPhase,
	SEGMENT_COUNT,
	SEGMENT_SPACING,
	TUNNEL_DEPTH,
	TUNNEL_DURATION,
	TUNNEL_SPEED,
	VIBRATION_RANGE,
	type LindormData,
	type LindormPhaseId,
	type TunnelBlock,
} from "./lindorm-tunnel-data.ts";

export type { LindormData, LindormPhaseId, TunnelBlock };
export {
	BREACH_ARC_HEIGHT,
	BREACH_DAMAGE,
	BREACH_DURATION,
	BREACH_SPEED,
	BREACH_TRIGGER_RANGE,
	LINDORM_HP,
	LindormPhase,
	SEGMENT_COUNT,
	SEGMENT_SPACING,
	TUNNEL_DURATION,
	TUNNEL_SPEED,
	VIBRATION_RANGE,
};

// ─── State ───

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

export function _resetLindormState(): void {
	lindormStates.clear();
}

// ─── Soft Block Check ───

const SOFT_BLOCK_IDS: ReadonlySet<number> = new Set([
	BlockId.Dirt,
	BlockId.Grass,
	BlockId.Sand,
	BlockId.Moss,
	BlockId.Peat,
]);

export function canTunnelThrough(isSoftBlock: boolean): boolean {
	return isSoftBlock;
}

export function isSoftBlock(blockId: number): boolean {
	return SOFT_BLOCK_IDS.has(blockId);
}

// ─── Terrain Modification ───

export function collectTunnelBlocks(
	worldX: number,
	surfaceY: number,
	worldZ: number,
	getBlock: (x: number, y: number, z: number) => number,
): TunnelBlock[] {
	const bx = Math.floor(worldX);
	const bz = Math.floor(worldZ);
	const result: TunnelBlock[] = [];

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

export function nearTarget(x: number, z: number, targetX: number, targetZ: number): boolean {
	const dx = x - targetX;
	const dz = z - targetZ;
	return dx * dx + dz * dz < BREACH_TRIGGER_RANGE * BREACH_TRIGGER_RANGE;
}

// ─── Breach Arc ───

export function breachArcY(progress: number, surfaceY: number): number {
	return surfaceY + 4 * BREACH_ARC_HEIGHT * progress * (1 - progress);
}

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

export function breachHitsPlayer(headX: number, headZ: number, playerX: number, playerZ: number): boolean {
	const dx = headX - playerX;
	const dz = headZ - playerZ;
	return dx * dx + dz * dz < 2.0 * 2.0;
}

// ─── Mining Vibration ───

export function attractedByMining(lindormX: number, lindormZ: number, mineX: number, mineZ: number): boolean {
	const dx = mineX - lindormX;
	const dz = mineZ - lindormZ;
	return dx * dx + dz * dz <= VIBRATION_RANGE * VIBRATION_RANGE;
}
