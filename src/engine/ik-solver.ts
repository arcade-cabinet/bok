/**
 * Two-bone analytical IK solver.
 * Computes joint angles for a 2-bone chain to reach a target point.
 * Pure math — no Three.js dependency.
 */

export interface IKResult {
	/** Angle of the upper bone from the root joint (radians) */
	upperAngle: number;
	/** Angle of the lower bone relative to the upper (radians) */
	lowerAngle: number;
	/** Whether the target is within the chain's reach */
	reached: boolean;
}

/**
 * Solve 2-bone IK in 2D (in the plane of the chain).
 * Uses law of cosines for O(1) analytical solution.
 *
 * @param upperLen - Length of upper bone
 * @param lowerLen - Length of lower bone
 * @param targetX - Target X in local space (relative to root joint)
 * @param targetY - Target Y in local space
 */
export function solve2BoneIK(upperLen: number, lowerLen: number, targetX: number, targetY: number): IKResult {
	const distSq = targetX * targetX + targetY * targetY;
	const dist = Math.sqrt(distSq);
	const maxReach = upperLen + lowerLen;
	const minReach = Math.abs(upperLen - lowerLen);

	// Target out of reach — extend fully toward it
	if (dist >= maxReach) {
		const angle = Math.atan2(targetY, targetX);
		return { upperAngle: angle, lowerAngle: 0, reached: false };
	}

	// Target too close — fold as tightly as possible
	if (dist <= minReach) {
		const angle = Math.atan2(targetY, targetX);
		return { upperAngle: angle, lowerAngle: Math.PI, reached: false };
	}

	// Law of cosines: triangle formed by upperLen, lowerLen, dist
	const cosLower = (upperLen * upperLen + lowerLen * lowerLen - distSq) / (2 * upperLen * lowerLen);
	const lowerAngle = Math.PI - Math.acos(clamp(cosLower, -1, 1));

	const cosUpper = (upperLen * upperLen + distSq - lowerLen * lowerLen) / (2 * upperLen * dist);
	const upperOffset = Math.acos(clamp(cosUpper, -1, 1));
	const baseAngle = Math.atan2(targetY, targetX);

	return {
		upperAngle: baseAngle + upperOffset,
		lowerAngle: -lowerAngle,
		reached: true,
	};
}

/**
 * Compute the end effector position after applying IK angles.
 * Useful for verifying IK solutions in tests.
 */
export function getEndEffector(
	upperLen: number,
	lowerLen: number,
	upperAngle: number,
	lowerAngle: number,
): { x: number; y: number } {
	const elbowX = upperLen * Math.cos(upperAngle);
	const elbowY = upperLen * Math.sin(upperAngle);

	const totalAngle = upperAngle + lowerAngle;
	return {
		x: elbowX + lowerLen * Math.cos(totalAngle),
		y: elbowY + lowerLen * Math.sin(totalAngle),
	};
}

function clamp(val: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, val));
}
