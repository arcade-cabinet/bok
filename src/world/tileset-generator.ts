/**
 * Tileset canvas renderer.
 * Seeds a PRNG and paints each TileDef onto a canvas to produce a data URL
 * for the Jolly Pixel VoxelRenderer.
 */

import { tiles } from "./tileset-tiles.ts";

const TILE_SIZE = 32;
const COLS = 8;
const ROWS = 5;

/** Seeded PRNG (mulberry32) for deterministic textures. */
function mulberry32(seed: number): () => number {
	let s = seed | 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Generate the tileset as a data URL. */
export function generateTilesetDataURL(seed = 42): string {
	const rng = mulberry32(seed);
	const canvas = document.createElement("canvas");
	canvas.width = COLS * TILE_SIZE;
	canvas.height = ROWS * TILE_SIZE;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Failed to get 2D canvas context for tileset generation");

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	for (const tile of tiles) {
		ctx.save();
		ctx.translate(tile.col * TILE_SIZE, tile.row * TILE_SIZE);
		ctx.fillStyle = tile.baseColor;
		ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
		if (tile.draw) tile.draw(ctx, TILE_SIZE, rng);
		ctx.restore();
	}

	return canvas.toDataURL("image/png");
}

export { COLS, ROWS, TILE_SIZE, tiles };
