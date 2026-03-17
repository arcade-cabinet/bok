/**
 * World utility functions for spawn shrine generation and surface finding.
 * Extracted from terrain-generator.ts to keep chunk generation focused.
 */

import type { VoxelRenderer, VoxelSetOptions } from "../engine/voxel-types.ts";
import { BlockId } from "./blocks.ts";
import { placeRunsten, placeStenhog } from "./landmark-types.ts";

const WORLD_HEIGHT = 32;
const WATER_LEVEL = 10;

/**
 * Spawn shrine: stenhög (cairn) + runsten (runestone) + torches.
 * Placed on a 5×5 StoneBricks platform centered at (8, surfaceY, 8).
 */
export function generateSpawnShrine(vr: VoxelRenderer, layerName: string, surfaceY: number): void {
	const entries: VoxelSetOptions[] = [];
	// StoneBricks platform
	for (let x = 6; x <= 10; x++) {
		for (let z = 6; z <= 10; z++) {
			entries.push({ position: { x, y: surfaceY, z }, blockId: BlockId.StoneBricks });
			for (let y = surfaceY + 1; y <= surfaceY + 5; y++) {
				vr.removeVoxel(layerName, { position: { x, y, z } });
			}
		}
	}
	// Stenhög at center
	placeStenhog(entries, 8, surfaceY, 8, 3);
	// Runsten beside the cairn
	placeRunsten(entries, 10, surfaceY, 8);
	// Torches at corners
	entries.push({ position: { x: 6, y: surfaceY + 1, z: 6 }, blockId: BlockId.Torch });
	entries.push({ position: { x: 10, y: surfaceY + 1, z: 6 }, blockId: BlockId.Torch });
	entries.push({ position: { x: 6, y: surfaceY + 1, z: 10 }, blockId: BlockId.Torch });
	entries.push({ position: { x: 10, y: surfaceY + 1, z: 10 }, blockId: BlockId.Torch });
	vr.setVoxelBulk(layerName, entries);
}

export function findSurfaceY(vr: VoxelRenderer, x: number, z: number): number {
	for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
		const entry = vr.getVoxel({ x, y, z });
		if (entry && entry.blockId !== BlockId.Air && entry.blockId !== BlockId.Water) return y;
	}
	return WATER_LEVEL;
}
