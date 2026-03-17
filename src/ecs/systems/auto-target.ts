/**
 * Auto-targeting — selects nearest enemy within range and view cone.
 * Pure math, no ECS/Three.js dependencies.
 */

import { AUTO_TARGET_HALF_ANGLE, AUTO_TARGET_RANGE } from "../../ui/game/hud/mobile-controls-data.ts";

export interface TargetCandidate {
	entityId: number;
	x: number;
	y: number;
	z: number;
}

export interface AutoTargetResult {
	entityId: number;
	x: number;
	y: number;
	z: number;
	distSq: number;
}

/**
 * Select the best target from candidates within range and view cone.
 * Uses distance-weighted dot-product scoring: closer + more aligned = better.
 *
 * @param playerX/Y/Z — Player world position
 * @param yaw — Player camera yaw (radians)
 * @param candidates — Array of potential targets
 * @param range — Max targeting range in blocks
 * @param halfAngle — Half-angle of the targeting cone in radians
 * @returns Best target or null if none qualify
 */
export function selectAutoTarget(
	playerX: number,
	playerY: number,
	playerZ: number,
	yaw: number,
	candidates: readonly TargetCandidate[],
	range = AUTO_TARGET_RANGE,
	halfAngle = AUTO_TARGET_HALF_ANGLE,
): AutoTargetResult | null {
	const rangeSq = range * range;
	const cosThreshold = Math.cos(halfAngle);

	// Player look direction (horizontal only — Y ignored for targeting)
	const lookX = -Math.sin(yaw);
	const lookZ = -Math.cos(yaw);

	let best: AutoTargetResult | null = null;
	let bestScore = -1;

	for (const candidate of candidates) {
		const dx = candidate.x - playerX;
		const dy = candidate.y - playerY;
		const dz = candidate.z - playerZ;
		const distSq = dx * dx + dy * dy + dz * dz;

		if (distSq > rangeSq || distSq < 0.01) continue;

		// Horizontal distance for dot product (ignore Y for cone check)
		const horizDistSq = dx * dx + dz * dz;
		if (horizDistSq < 0.01) continue;

		const invHorizDist = 1 / Math.sqrt(horizDistSq);
		const ndx = dx * invHorizDist;
		const ndz = dz * invHorizDist;

		const dot = lookX * ndx + lookZ * ndz;
		if (dot < cosThreshold) continue;

		// Score: dot product weighted by inverse distance (closer + aligned = better)
		const score = dot / Math.sqrt(distSq);

		if (score > bestScore) {
			bestScore = score;
			best = { entityId: candidate.entityId, x: candidate.x, y: candidate.y, z: candidate.z, distSq };
		}
	}

	return best;
}

/**
 * Compute the yaw needed to face a target from the player position.
 */
export function yawToTarget(playerX: number, playerZ: number, targetX: number, targetZ: number): number {
	const dx = targetX - playerX;
	const dz = targetZ - playerZ;
	return Math.atan2(-dx, -dz);
}
