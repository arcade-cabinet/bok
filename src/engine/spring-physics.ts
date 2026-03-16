/**
 * Spring physics simulation and follow-the-leader chain.
 * Damped harmonic oscillator for floppy creature parts (Tomte cap, Trana neck).
 * Follow-the-leader for segmented creatures (Lindorm body segments).
 * Pure math — no Three.js dependency.
 */

// ─── Spring Physics ───

export interface SpringState {
	position: number;
	velocity: number;
}

/**
 * Create a new spring state at a given position.
 */
export function createSpring(position = 0): SpringState {
	return { position, velocity: 0 };
}

/**
 * Update a 1D damped spring toward a target.
 * Uses semi-implicit Euler: update velocity first, then position.
 * This is unconditionally stable for reasonable stiffness/damping.
 *
 * @param state - Current spring state (mutated in place)
 * @param target - Target position to converge toward
 * @param stiffness - Spring stiffness (higher = snappier, typical 50-300)
 * @param damping - Damping coefficient (higher = less bounce, typical 5-20)
 * @param dt - Time step in seconds
 */
export function springUpdate(state: SpringState, target: number, stiffness: number, damping: number, dt: number): void {
	const displacement = state.position - target;
	const acceleration = -stiffness * displacement - damping * state.velocity;
	state.velocity += acceleration * dt;
	state.position += state.velocity * dt;
}

/**
 * Check if a spring has converged to its target (within thresholds).
 */
export function springConverged(
	state: SpringState,
	target: number,
	posThreshold = 0.001,
	velThreshold = 0.001,
): boolean {
	return Math.abs(state.position - target) < posThreshold && Math.abs(state.velocity) < velThreshold;
}

// ─── Follow-the-Leader ───

export interface SegmentPosition {
	x: number;
	y: number;
	z: number;
}

/**
 * Update segment chain using follow-the-leader.
 * Each segment maintains fixed spacing from the one ahead.
 * Segments array is mutated in place. Index 0 is the head.
 *
 * @param segments - Array of segment positions (head at index 0)
 * @param headX - New head X position
 * @param headY - New head Y position
 * @param headZ - New head Z position
 * @param spacing - Distance between consecutive segments
 */
export function updateFollowChain(
	segments: SegmentPosition[],
	headX: number,
	headY: number,
	headZ: number,
	spacing: number,
): void {
	if (segments.length === 0) return;

	segments[0].x = headX;
	segments[0].y = headY;
	segments[0].z = headZ;

	for (let i = 1; i < segments.length; i++) {
		const prev = segments[i - 1];
		const curr = segments[i];
		const dx = curr.x - prev.x;
		const dy = curr.y - prev.y;
		const dz = curr.z - prev.z;
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

		if (dist > spacing) {
			const ratio = spacing / dist;
			curr.x = prev.x + dx * ratio;
			curr.y = prev.y + dy * ratio;
			curr.z = prev.z + dz * ratio;
		}
	}
}

/**
 * Compute heading angle (Y-axis rotation) between two positions.
 * Used for orienting segments to face their leader.
 */
export function segmentHeading(fromX: number, fromZ: number, toX: number, toZ: number): number {
	return Math.atan2(toX - fromX, toZ - fromZ);
}

/**
 * Create an initial chain of segments in a line behind a head position.
 */
export function createChain(
	headX: number,
	headY: number,
	headZ: number,
	count: number,
	spacing: number,
): SegmentPosition[] {
	const segments: SegmentPosition[] = [];
	for (let i = 0; i < count; i++) {
		segments.push({
			x: headX,
			y: headY,
			z: headZ + i * spacing,
		});
	}
	return segments;
}
