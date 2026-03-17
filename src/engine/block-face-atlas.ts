/**
 * Block face atlas — maps (blockId, faceDir) → tileset tile (col, row).
 *
 * Extracted from JP's BlockDefinition format so the custom mesher can
 * compute UVs without depending on @jolly-pixel/voxel.renderer.
 */

import type { FaceDir } from "./greedy-mesher.ts";

export interface TileCoord {
	col: number;
	row: number;
}

/** Per-block tile mapping: optional per-face overrides + default. */
interface BlockTileMap {
	default: TileCoord;
	faces: Partial<Record<FaceDir, TileCoord>>;
	/** Shape hint: "cube" blocks get greedy meshed, others are skipped. */
	shape: "cube" | "pole";
}

/** Lookup table built once at init. */
let atlas: Map<number, BlockTileMap> | null = null;

// JP Face enum: PosX=0, NegX=1, PosY=2, NegY=3, PosZ=4, NegZ=5
// Our FaceDir uses identical values, so face keys pass through directly.

/**
 * Build the atlas from JP-style block definitions.
 * Called once at init with the result of createBlockDefinitions().
 */
export function buildBlockFaceAtlas(
	defs: Array<{
		id: number;
		shapeId: string;
		defaultTexture?: { col: number; row: number };
		faceTextures?: Partial<Record<number, { col: number; row: number }>>;
	}>,
): void {
	atlas = new Map();
	for (const def of defs) {
		const faces: Partial<Record<FaceDir, TileCoord>> = {};
		if (def.faceTextures) {
			for (const [faceKey, tile] of Object.entries(def.faceTextures)) {
				if (tile) faces[Number(faceKey) as FaceDir] = { col: tile.col, row: tile.row };
			}
		}
		atlas.set(def.id, {
			default: def.defaultTexture ? { col: def.defaultTexture.col, row: def.defaultTexture.row } : { col: 0, row: 0 },
			faces,
			shape: def.shapeId === "cube" ? "cube" : "pole",
		});
	}
}

/** Get the tile coordinate for a specific block face. */
export function getBlockTile(blockId: number, face: FaceDir): TileCoord {
	const entry = atlas?.get(blockId);
	if (!entry) return { col: 0, row: 0 };
	return entry.faces[face] ?? entry.default;
}

/** Check if a block uses cube shape (eligible for greedy meshing). */
export function isBlockCube(blockId: number): boolean {
	const entry = atlas?.get(blockId);
	return entry ? entry.shape === "cube" : true;
}

/** Reset atlas (for cleanup). */
export function resetBlockFaceAtlas(): void {
	atlas = null;
}
