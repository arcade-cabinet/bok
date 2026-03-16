/**
 * Pure math for the Kartan (map) page.
 *
 * Chunk packing, fog-of-war state, biome colors for top-down rendering,
 * and landmark marker placement. No ECS or Three.js.
 */

import type { BiomeId } from "../../world/biomes.ts";
import { Biome } from "../../world/biomes.ts";

// ─── Chunk Coordinate Packing ───

/** Pack chunk coords into a single number for Set storage. */
export function packChunk(cx: number, cz: number): number {
	return (((cx + 32768) << 16) | ((cz + 32768) & 0xffff)) >>> 0;
}

/** Unpack a packed chunk key back to [cx, cz]. */
export function unpackChunk(key: number): [number, number] {
	const cx = (key >>> 16) - 32768;
	const cz = (key & 0xffff) - 32768;
	return [cx, cz];
}

/** Convert world position to chunk coords. */
export function worldToChunk(wx: number, wz: number): [number, number] {
	return [Math.floor(wx / 16), Math.floor(wz / 16)];
}

// ─── Fog-of-War State ───

export type FogState = "unexplored" | "explored" | "current";

/** Determine fog state for a chunk. */
export function chunkFogState(
	cx: number,
	cz: number,
	playerCx: number,
	playerCz: number,
	visited: ReadonlySet<number>,
): FogState {
	if (cx === playerCx && cz === playerCz) return "current";
	if (visited.has(packChunk(cx, cz))) return "explored";
	return "unexplored";
}

// ─── Biome Colors (top-down map rendering) ───

/** Map-view color per biome — muted, parchment-friendly palette. */
export const BIOME_COLORS: Record<BiomeId, string> = {
	[Biome.Angen]: "#7a9e5a",
	[Biome.Bokskogen]: "#4d6b3a",
	[Biome.Fjallen]: "#c8d0d8",
	[Biome.Skargarden]: "#5b8ca8",
	[Biome.Myren]: "#6b7a4d",
	[Biome.Blothogen]: "#3d2d3d",
};

/** Parchment color for unexplored chunks. */
export const FOG_COLOR = "#d4c4a0";

/** Bright tint for the player's current chunk. */
export const CURRENT_COLOR_ALPHA = 0.6;

// ─── Landmark Types for Map Markers ───

export type LandmarkType = "runsten" | "stenhog" | "fornlamning" | "kolmila" | "offerkalla" | "sjomarke" | "fjallstuga";

export interface LandmarkMarker {
	cx: number;
	cz: number;
	type: LandmarkType;
}

/** Rune glyphs for landmark markers on the map. */
export const LANDMARK_GLYPHS: Record<LandmarkType, string> = {
	runsten: "\u16A0",
	stenhog: "\u16A2",
	fornlamning: "\u16B1",
	kolmila: "\u16B7",
	offerkalla: "\u16C1",
	sjomarke: "\u16C7",
	fjallstuga: "\u16D2",
};
