/**
 * Spawn zone helpers for the 3x3 chunk starting area.
 *
 * Guarantees:
 *   - Ängen (meadow) biome in all 9 chunks around origin
 *   - Flat plateau around the shrine for walkable terrain
 *   - No landmarks in the starting zone
 *   - Reduced tree density near the shrine
 */

import type { VoxelRenderer } from "../engine/voxel-types.ts";
import { Biome, type BiomeId } from "./biomes.ts";
import { BlockId } from "./blocks.ts";

/** Half-extent in chunks: -1..1 = 3x3 grid. */
const SPAWN_EXTENT = 1;

/** Radius in blocks around shrine center to flatten. */
const FLATTEN_RADIUS = 14;

/** Inner radius where trees are suppressed entirely. */
const TREE_CLEAR_RADIUS = 8;

/** Max height variation within the flattened plateau. */
const MAX_HEIGHT_VARIATION = 2;

/** Shrine center in global coords (chunk 0,0 local 8,8). */
const SHRINE_X = 8;
const SHRINE_Z = 8;

// ─── Chunk-level queries ───

/** True if chunk (cx, cz) is within the 3x3 starting zone. */
export function isInSpawnZone(cx: number, cz: number): boolean {
	return Math.abs(cx) <= SPAWN_EXTENT && Math.abs(cz) <= SPAWN_EXTENT;
}

/**
 * Force Ängen biome for positions within the starting zone.
 * Returns the forced biome or null if outside the zone.
 */
export function forceSpawnBiome(gx: number, gz: number): BiomeId | null {
	const cx = Math.floor(gx / 16);
	const cz = Math.floor(gz / 16);
	if (!isInSpawnZone(cx, cz)) return null;
	return Biome.Angen;
}

// ─── Block-level queries ───

/** Distance from shrine center in blocks (Chebyshev / L-infinity). */
function distFromShrine(gx: number, gz: number): number {
	return Math.max(Math.abs(gx - SHRINE_X), Math.abs(gz - SHRINE_Z));
}

/** True if this position should have trees suppressed (inner clear zone). */
export function isTreeSuppressed(gx: number, gz: number): boolean {
	return distFromShrine(gx, gz) <= TREE_CLEAR_RADIUS;
}

/**
 * Clamp a computed terrain height to produce a flat plateau near the shrine.
 * Returns the original height if outside the flatten radius.
 */
export function clampSpawnHeight(gx: number, gz: number, rawHeight: number, targetY: number): number {
	const dist = distFromShrine(gx, gz);
	if (dist > FLATTEN_RADIUS) return rawHeight;

	// Lerp between flat target and raw height based on distance
	const t = dist / FLATTEN_RADIUS; // 0 at center, 1 at edge
	const smoothT = t * t; // ease-in — very flat near center
	const maxDelta = MAX_HEIGHT_VARIATION * smoothT;
	const delta = rawHeight - targetY;
	const clamped = Math.max(-maxDelta, Math.min(maxDelta, delta));
	return Math.round(targetY + clamped);
}

// ─── Post-generation plateau flattening ───

/**
 * Flatten terrain in a radius around the shrine after chunk generation.
 * Fills gaps, caps height, removes floating blocks above the plateau.
 */
export function flattenSpawnPlateau(renderer: VoxelRenderer, surfaceY: number): void {
	const maxY = surfaceY + MAX_HEIGHT_VARIATION;

	for (let gx = SHRINE_X - FLATTEN_RADIUS; gx <= SHRINE_X + FLATTEN_RADIUS; gx++) {
		for (let gz = SHRINE_Z - FLATTEN_RADIUS; gz <= SHRINE_Z + FLATTEN_RADIUS; gz++) {
			const dist = distFromShrine(gx, gz);
			if (dist > FLATTEN_RADIUS) continue;

			// Remove any blocks sticking up above the plateau
			for (let y = maxY + 1; y <= surfaceY + 8; y++) {
				const entry = renderer.getVoxel({ x: gx, y, z: gz });
				if (entry && entry.blockId !== 0 && entry.blockId !== BlockId.Water) {
					renderer.removeVoxel("Ground", { position: { x: gx, y, z: gz } });
				}
			}

			// Ensure the surface is filled (no holes)
			const atSurface = renderer.getVoxel({ x: gx, y: surfaceY, z: gz });
			if (!atSurface || atSurface.blockId === 0 || atSurface.blockId === BlockId.Water) {
				renderer.setVoxel("Ground", {
					position: { x: gx, y: surfaceY, z: gz },
					blockId: BlockId.Grass,
				});
			}

			// Fill subsurface if missing (prevent falling through)
			for (let y = surfaceY - 1; y >= surfaceY - 3; y--) {
				const below = renderer.getVoxel({ x: gx, y, z: gz });
				if (!below || below.blockId === 0) {
					renderer.setVoxel("Ground", {
						position: { x: gx, y, z: gz },
						blockId: BlockId.Dirt,
					});
				}
			}
		}
	}
}

/** Iterate all 9 spawn zone chunks. Callback receives (cx, cz). */
export function forEachSpawnChunk(fn: (cx: number, cz: number) => void): void {
	for (let cx = -SPAWN_EXTENT; cx <= SPAWN_EXTENT; cx++) {
		for (let cz = -SPAWN_EXTENT; cz <= SPAWN_EXTENT; cz++) {
			fn(cx, cz);
		}
	}
}
