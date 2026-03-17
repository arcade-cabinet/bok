/**
 * Voxel Obstacle Provider — bridges Yuka's ObstacleAvoidanceBehavior
 * with our voxel grid.
 *
 * Samples blocks in a detection cone ahead of the creature and creates
 * temporary pooled GameEntity obstacles for Yuka to steer around.
 * Uses the side-effect pattern: reads voxel grid via callback, never
 * imports Three.js.
 */

import { GameEntity, ObstacleAvoidanceBehavior, Vector3, type Vehicle } from "yuka";

// Scratch vector to avoid allocations
const _dirScratch = new Vector3();

// ─── Configuration ───

/** How far ahead to sample blocks (in blocks). */
const LOOK_AHEAD = 4;
/** Lateral scan width (blocks to each side). */
const LATERAL_SCAN = 1;
/** How many vertical levels to scan (at feet + head height). */
const VERTICAL_SCAN = 2;
/** Bounding radius for block obstacles (half a block). */
const BLOCK_OBSTACLE_RADIUS = 0.5;
/** Maximum pooled obstacle entities (reused each frame). */
const MAX_OBSTACLES = 24;

// ─── Obstacle Pool ───

const obstaclePool: GameEntity[] = [];
let poolInitialized = false;

function ensurePool(): void {
	if (poolInitialized) return;
	for (let i = 0; i < MAX_OBSTACLES; i++) {
		const entity = new GameEntity();
		entity.boundingRadius = BLOCK_OBSTACLE_RADIUS;
		obstaclePool.push(entity);
	}
	poolInitialized = true;
}

// ─── Types ───

export type VoxelSampler = (x: number, y: number, z: number) => number;
export type SolidChecker = (blockId: number) => boolean;

export interface ObstacleResult {
	/** Pooled GameEntity obstacles positioned at solid blocks. */
	obstacles: GameEntity[];
	/** Number of active obstacles in the array (use slice(0, count)). */
	count: number;
	/** Whether the creature is boxed in and should jump. */
	shouldJump: boolean;
}

// ─── Core ───

/**
 * Sample the voxel grid ahead of a creature and return obstacle entities.
 * Call once per creature per frame, before vehicle.update().
 */
export function sampleVoxelObstacles(vehicle: Vehicle, getVoxel: VoxelSampler, isSolid: SolidChecker): ObstacleResult {
	ensurePool();

	const px = vehicle.position.x;
	const py = vehicle.position.y;
	const pz = vehicle.position.z;

	// Direction the creature is moving (or facing)
	const speed = vehicle.getSpeed();
	let dirX: number;
	let dirZ: number;
	if (speed > 0.01) {
		dirX = vehicle.velocity.x / speed;
		dirZ = vehicle.velocity.z / speed;
	} else {
		// Use forward vector from rotation
		const forward = vehicle.getDirection(_dirScratch);
		dirX = forward.x;
		dirZ = forward.z;
	}

	let obstacleCount = 0;
	let blockedAtFeet = 0;

	// Scan a cone ahead of the creature
	for (let ahead = 1; ahead <= LOOK_AHEAD && obstacleCount < MAX_OBSTACLES; ahead++) {
		for (let lateral = -LATERAL_SCAN; lateral <= LATERAL_SCAN && obstacleCount < MAX_OBSTACLES; lateral++) {
			// Perpendicular direction: rotate 90 degrees
			const perpX = -dirZ;
			const perpZ = dirX;

			const sampleX = px + dirX * ahead + perpX * lateral;
			const sampleZ = pz + dirZ * ahead + perpZ * lateral;

			for (let vy = 0; vy < VERTICAL_SCAN && obstacleCount < MAX_OBSTACLES; vy++) {
				const sampleY = Math.floor(py) + vy;
				const bx = Math.floor(sampleX);
				const bz = Math.floor(sampleZ);

				const blockId = getVoxel(bx, sampleY, bz);
				if (blockId > 0 && isSolid(blockId)) {
					const obs = obstaclePool[obstacleCount];
					obs.position.set(bx + 0.5, sampleY + 0.5, bz + 0.5);
					obstacleCount++;

					// Track blocks directly ahead at feet level for jump detection
					if (lateral === 0 && vy === 0 && ahead <= 2) {
						blockedAtFeet++;
					}
				}
			}
		}
	}

	// Jump when directly blocked at close range and no side escape
	const shouldJump = blockedAtFeet >= 2;

	return {
		obstacles: obstaclePool,
		count: obstacleCount,
		shouldJump,
	};
}

/**
 * Create an ObstacleAvoidanceBehavior configured for voxel worlds.
 * The obstacles array is updated each frame via sampleVoxelObstacles.
 */
export function createVoxelAvoidanceBehavior(weight = 3.0): ObstacleAvoidanceBehavior {
	ensurePool();
	const behavior = new ObstacleAvoidanceBehavior(obstaclePool);
	behavior.weight = weight;
	// Detection box: slightly longer than LOOK_AHEAD
	behavior.dBoxMinLength = 2;
	return behavior;
}

/**
 * Update the obstacle list on an existing ObstacleAvoidanceBehavior.
 * Call after sampleVoxelObstacles to limit the behavior to only active obstacles.
 */
export function updateAvoidanceBehavior(behavior: ObstacleAvoidanceBehavior, obstacleResult: ObstacleResult): void {
	// Replace obstacles list with only active ones
	behavior.obstacles = obstacleResult.obstacles.slice(0, obstacleResult.count);
}

/** Reset the obstacle pool (for testing). */
export function resetObstaclePool(): void {
	poolInitialized = false;
	obstaclePool.length = 0;
}
