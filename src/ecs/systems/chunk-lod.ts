/**
 * Chunk LOD — distance-based level-of-detail thresholds for chunk rendering.
 * Defines distance categories for chunk streaming priority and potential
 * mesh simplification. Pure math, no ECS/Three.js/React.
 */

/** Chunk distance category. */
export const ChunkLod = {
	/** Closest chunks — full detail. */
	Near: 0,
	/** Mid-range — standard detail. */
	Mid: 1,
	/** Far — reduced detail candidates. */
	Far: 2,
} as const;
export type ChunkLodId = (typeof ChunkLod)[keyof typeof ChunkLod];

/** Distance thresholds in chunks (squared). */
export const CHUNK_LOD_NEAR_SQ = 1; // 0-1 chunks away
export const CHUNK_LOD_MID_SQ = 4; // 1-2 chunks away
// Beyond MID_SQ = far

/**
 * Classify a chunk's LOD category based on squared chunk distance.
 * Distance is measured in chunks (not blocks).
 */
export function classifyChunkLod(chunkDistSq: number): ChunkLodId {
	if (chunkDistSq <= CHUNK_LOD_NEAR_SQ) return ChunkLod.Near;
	if (chunkDistSq <= CHUNK_LOD_MID_SQ) return ChunkLod.Mid;
	return ChunkLod.Far;
}

/**
 * Compute squared chunk distance from player chunk to target chunk.
 * Uses Chebyshev-like approximation for chunk grid.
 */
export function chunkDistanceSq(playerCx: number, playerCz: number, cx: number, cz: number): number {
	const dx = cx - playerCx;
	const dz = cz - playerCz;
	return dx * dx + dz * dz;
}

/**
 * Determine chunk streaming priority based on LOD category.
 * Lower value = higher priority (loaded first).
 */
export function chunkLoadPriority(lodCategory: ChunkLodId): number {
	return lodCategory; // Near=0 (highest), Mid=1, Far=2 (lowest)
}

/**
 * Check if a chunk should be unloaded based on distance from player.
 * unloadDistance is in chunks (e.g., renderDistance + 2).
 */
export function shouldUnloadChunk(
	playerCx: number,
	playerCz: number,
	cx: number,
	cz: number,
	unloadDistance: number,
): boolean {
	return Math.abs(cx - playerCx) > unloadDistance || Math.abs(cz - playerCz) > unloadDistance;
}
