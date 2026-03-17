/**
 * Species-specific tree generation for biome terrain.
 * Each tree type uses its own wood/leaf blocks and canopy shape per the design doc:
 *   Birch  — thin white trunk (4h), light canopy 5×5
 *   Beech  — thick trunk 2×2 (5h), dense canopy 7×7
 *   Pine   — thin trunk (5h), triangular canopy layers (5×5 → 3×3 → 1×1)
 *   Spruce — thin trunk (4h), narrow canopy 3×3
 *   Dead Birch — bare trunk (5h), no leaves
 */

import type { VoxelSetOptions } from "../engine/voxel-types.ts";
import { TreeType, type TreeTypeId } from "./biomes.ts";
import { BlockId } from "./blocks.ts";

type Entries = VoxelSetOptions[];

function push(entries: Entries, x: number, y: number, z: number, blockId: number): void {
	entries.push({ position: { x, y, z }, blockId });
}

/** Birch: thin BirchWood trunk, BirchLeaves 5×5 canopy with corner trimming. */
function placeBirch(e: Entries, gx: number, h: number, gz: number): void {
	for (let ty = 1; ty <= 4; ty++) push(e, gx, h + ty, gz, BlockId.BirchWood);
	for (let lx = -2; lx <= 2; lx++) {
		for (let lz = -2; lz <= 2; lz++) {
			for (let ly = 3; ly <= 5; ly++) {
				if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && ly === 5) continue;
				if (lx === 0 && lz === 0 && ly <= 4) continue;
				push(e, gx + lx, h + ly, gz + lz, BlockId.BirchLeaves);
			}
		}
	}
}

/** Beech: thick 2×2 BeechWood trunk, dense BeechLeaves 7×7 canopy. */
function placeBeech(e: Entries, gx: number, h: number, gz: number): void {
	for (let ty = 1; ty <= 5; ty++) {
		push(e, gx, h + ty, gz, BlockId.BeechWood);
		push(e, gx + 1, h + ty, gz, BlockId.BeechWood);
		push(e, gx, h + ty, gz + 1, BlockId.BeechWood);
		push(e, gx + 1, h + ty, gz + 1, BlockId.BeechWood);
	}
	for (let lx = -3; lx <= 3; lx++) {
		for (let lz = -3; lz <= 3; lz++) {
			for (let ly = 4; ly <= 7; ly++) {
				if (Math.abs(lx) === 3 && Math.abs(lz) === 3) continue;
				if (Math.abs(lx) <= 1 && Math.abs(lz) <= 1 && ly <= 5) continue;
				push(e, gx + lx, h + ly, gz + lz, BlockId.BeechLeaves);
			}
		}
	}
}

/** Pine: PineWood trunk, triangular PineLeaves layers (5×5 → 3×3 → crown). */
function placePine(e: Entries, gx: number, h: number, gz: number): void {
	for (let ty = 1; ty <= 5; ty++) push(e, gx, h + ty, gz, BlockId.PineWood);
	// Bottom layer: 5×5 at y+3
	for (let lx = -2; lx <= 2; lx++) {
		for (let lz = -2; lz <= 2; lz++) {
			if (Math.abs(lx) === 2 && Math.abs(lz) === 2) continue;
			push(e, gx + lx, h + 3, gz + lz, BlockId.PineLeaves);
		}
	}
	// Middle layer: 3×3 at y+4,5
	for (let ly = 4; ly <= 5; ly++) {
		for (let lx = -1; lx <= 1; lx++) {
			for (let lz = -1; lz <= 1; lz++) {
				if (lx === 0 && lz === 0 && ly === 4) continue;
				push(e, gx + lx, h + ly, gz + lz, BlockId.PineLeaves);
			}
		}
	}
	// Crown
	push(e, gx, h + 6, gz, BlockId.PineLeaves);
}

/** Spruce: narrow 3×3 SpruceLeaves canopy, used at Fjällen tree line. */
function placeSpruce(e: Entries, gx: number, h: number, gz: number): void {
	for (let ty = 1; ty <= 4; ty++) push(e, gx, h + ty, gz, BlockId.Wood);
	for (let ly = 3; ly <= 5; ly++) {
		for (let lx = -1; lx <= 1; lx++) {
			for (let lz = -1; lz <= 1; lz++) {
				if (lx === 0 && lz === 0 && ly <= 4) continue;
				push(e, gx + lx, h + ly, gz + lz, BlockId.SpruceLeaves);
			}
		}
	}
}

/** Dead Birch: bare DeadWood trunk, no canopy. */
function placeDeadBirch(e: Entries, gx: number, h: number, gz: number): void {
	for (let ty = 1; ty <= 5; ty++) push(e, gx, h + ty, gz, BlockId.DeadWood);
}

/** Dispatch tree placement by species. */
export function placeTree(entries: Entries, gx: number, h: number, gz: number, tree: TreeTypeId): void {
	switch (tree) {
		case TreeType.Birch:
			placeBirch(entries, gx, h, gz);
			break;
		case TreeType.Beech:
			placeBeech(entries, gx, h, gz);
			break;
		case TreeType.Pine:
			placePine(entries, gx, h, gz);
			break;
		case TreeType.Spruce:
			placeSpruce(entries, gx, h, gz);
			break;
		case TreeType.DeadBirch:
			placeDeadBirch(entries, gx, h, gz);
			break;
	}
}
