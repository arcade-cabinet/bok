/**
 * Structure detection — pure math for enclosed space detection and Falu red scanning.
 * Flood-fill BFS determines if a position is inside an enclosed structure.
 * Falu red block counting determines Mörker spawn radius reduction.
 *
 * Pure math — no ECS, no Three.js.
 */

import { BlockId } from "../../world/blocks.ts";

/** Maximum air blocks before we consider the space "not enclosed". */
export const MAX_STRUCTURE_VOLUME = 256;

/** Scan radius for nearby Falu red blocks. */
export const FALU_SCAN_RADIUS = 12;

/** Height range for Falu red scan (above and below player). */
export const FALU_SCAN_HEIGHT = 4;

/** Spawn radius reduction per Falu red block (multiplicative). */
export const FALU_REDUCTION_PER_BLOCK = 0.05;

/** Minimum spawn radius multiplier (floor). */
export const MIN_SPAWN_RADIUS_MULT = 0.2;

/** Minimum structure volume to count for inscription level. */
export const MIN_INSCRIPTION_VOLUME = 8;

export interface EnclosureResult {
	enclosed: boolean;
	volume: number;
	faluRedCount: number;
}

const NEIGHBORS: ReadonlyArray<[number, number, number]> = [
	[1, 0, 0],
	[-1, 0, 0],
	[0, 1, 0],
	[0, -1, 0],
	[0, 0, 1],
	[0, 0, -1],
];

/**
 * Flood-fill BFS from a starting air block to detect enclosed spaces.
 * Returns whether the space is enclosed, its volume, and Falu red wall count.
 */
export function detectEnclosure(
	startX: number,
	startY: number,
	startZ: number,
	getVoxel: (x: number, y: number, z: number) => number,
	isSolid: (blockId: number) => boolean,
	maxVolume: number = MAX_STRUCTURE_VOLUME,
): EnclosureResult {
	const sx = Math.floor(startX);
	const sy = Math.floor(startY);
	const sz = Math.floor(startZ);

	// Starting in solid block = not inside a structure
	if (isSolid(getVoxel(sx, sy, sz))) {
		return { enclosed: false, volume: 0, faluRedCount: 0 };
	}

	const visited = new Set<number>();
	const queue: number[] = [];

	// Pack coords into a single integer for fast set operations
	const pack = (x: number, y: number, z: number) => (x + 512) * 1048576 + (y + 512) * 1024 + (z + 512);

	const startKey = pack(sx, sy, sz);
	visited.add(startKey);
	queue.push(sx, sy, sz);

	let volume = 0;
	let faluRedCount = 0;
	let head = 0;

	while (head < queue.length) {
		const x = queue[head++];
		const y = queue[head++];
		const z = queue[head++];
		volume++;

		if (volume > maxVolume) {
			return { enclosed: false, volume, faluRedCount };
		}

		for (const [dx, dy, dz] of NEIGHBORS) {
			const nx = x + dx;
			const ny = y + dy;
			const nz = z + dz;

			const key = pack(nx, ny, nz);
			if (visited.has(key)) continue;
			visited.add(key);

			const blockId = getVoxel(nx, ny, nz);
			if (isSolid(blockId)) {
				if (blockId === BlockId.FaluRed) faluRedCount++;
				continue; // Wall — don't expand
			}

			// Air — continue flood fill
			queue.push(nx, ny, nz);
		}
	}

	return { enclosed: true, volume, faluRedCount };
}

/**
 * Count Falu red blocks in a cubic region around the player.
 * Runs independently of enclosure detection for area-effect spawn reduction.
 */
export function countFaluRedNearby(
	px: number,
	py: number,
	pz: number,
	getVoxel: (x: number, y: number, z: number) => number,
	radius: number = FALU_SCAN_RADIUS,
	height: number = FALU_SCAN_HEIGHT,
): number {
	const cx = Math.floor(px);
	const cy = Math.floor(py);
	const cz = Math.floor(pz);
	let count = 0;

	for (let dx = -radius; dx <= radius; dx++) {
		for (let dz = -radius; dz <= radius; dz++) {
			for (let dy = -height; dy <= height; dy++) {
				if (getVoxel(cx + dx, cy + dy, cz + dz) === BlockId.FaluRed) {
					count++;
				}
			}
		}
	}
	return count;
}

/** Compute Mörker spawn radius multiplier from Falu red block count. */
export function faluSpawnRadiusMultiplier(faluRedCount: number): number {
	if (faluRedCount <= 0) return 1;
	return Math.max(MIN_SPAWN_RADIUS_MULT, 1 - faluRedCount * FALU_REDUCTION_PER_BLOCK);
}
