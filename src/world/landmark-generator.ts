/**
 * Chunk-level landmark placement using deterministic hashing.
 *
 * Landmarks are rarer than trees (~5% of chunks). Placement is decided once
 * per chunk using posHash at chunk coordinates. Biome boundary positions
 * get stenhogar + runstenar; interior positions get biome-specific landmarks
 * or fornlämningar (ruins).
 *
 * Integration: called from generateChunkTerrain after terrain columns,
 * before setVoxelBulk.
 */

import type { VoxelSetOptions } from "../engine/voxel-types.ts";
import type { BiomeId } from "./biomes.ts";
import { Biome, selectBiome } from "./biomes.ts";
import {
	placeFjallstuga,
	placeFornlamning,
	placeKolmila,
	placeOfferkalla,
	placeRuinedStoneCircle,
	placeRunsten,
	placeSjomarke,
	placeStenhog,
} from "./landmark-types.ts";
import { adjustBiomeHeight, computeHeight, isCorrupted, sampleNoiseLayers } from "./terrain-generator.ts";

const CHUNK_SIZE = 16;
const WATER_LEVEL = 10;
const BLEND_CHECK = 8;

/** Landmark spawn probability per chunk. ~5% = roughly 1 per 20 chunks. */
export const LANDMARK_RATE = 0.05;

/** Minimum surface height for landmark placement (must be above water). */
export const LANDMARK_MIN_HEIGHT = WATER_LEVEL + 2;

// ─── Surface / Biome Helpers ───

/** Deterministic hash at chunk scale for landmark decisions. */
function chunkHash(cx: number, cz: number): number {
	return Math.abs(Math.sin(cx * 45.9898 + cz * 113.233) * 23758.5453) % 1;
}

/** Secondary hash for sub-decisions (size, variant) within a chunk. */
function subHash(cx: number, cz: number): number {
	return Math.abs(Math.sin(cx * 78.233 + cz * 12.9898) * 43758.5453) % 1;
}

/** Adjust temperature for biome selection (duplicated to avoid circular dep). */
function adjustTemp(rawTemp: number, height: number): number {
	const heightNorm = Math.max(0, (height - WATER_LEVEL) / (32 - WATER_LEVEL));
	return Math.max(0, Math.min(1, rawTemp - heightNorm * 0.3));
}

/** Resolve biome at a world position. */
export function biomeAt(gx: number, gz: number): BiomeId {
	if (isCorrupted(gx, gz)) return Biome.Blothogen;
	const layers = sampleNoiseLayers(gx, gz);
	const h = computeHeight(layers);
	return selectBiome(adjustTemp(layers.temperature, h), layers.moisture);
}

/** Compute surface height at any world position. */
export function surfaceYAt(gx: number, gz: number): number {
	const layers = sampleNoiseLayers(gx, gz);
	const rawH = computeHeight(layers);
	const biome = biomeAt(gx, gz);
	return adjustBiomeHeight(rawH, biome, gx, gz);
}

/** Check if position is at a biome boundary (any cardinal neighbor differs). */
export function isBiomeBoundary(gx: number, gz: number): boolean {
	const center = biomeAt(gx, gz);
	return (
		biomeAt(gx + BLEND_CHECK, gz) !== center ||
		biomeAt(gx - BLEND_CHECK, gz) !== center ||
		biomeAt(gx, gz + BLEND_CHECK) !== center ||
		biomeAt(gx, gz - BLEND_CHECK) !== center
	);
}

// ─── Landmark Type Selection ───

/** Select which biome-specific landmark to place. */
export function selectBiomeLandmark(biome: BiomeId): string {
	switch (biome) {
		case Biome.Bokskogen:
			return "kolmila";
		case Biome.Myren:
			return "offerkalla";
		case Biome.Skargarden:
			return "sjomarke";
		case Biome.Fjallen:
			return "fjallstuga";
		case Biome.Blothogen:
			return "ruined-stone-circle";
		default:
			return "fornlamning";
	}
}

/**
 * Detect what landmark type exists in a chunk (if any).
 * Used by the map to show rune markers on explored chunks.
 */
export function detectLandmarkType(cx: number, cz: number): string | null {
	if (chunkHash(cx, cz) > LANDMARK_RATE) return null;
	const lx = 4 + Math.floor(subHash(cx, cz) * 8);
	const lz = 4 + Math.floor(subHash(cz, cx) * 8);
	const gx = cx * CHUNK_SIZE + lx;
	const gz = cz * CHUNK_SIZE + lz;
	const h = surfaceYAt(gx, gz);
	if (h < LANDMARK_MIN_HEIGHT) return null;
	const biome = biomeAt(gx, gz);
	if (isBiomeBoundary(gx, gz)) return "stenhog";
	return selectBiomeLandmark(biome);
}

// ─── Main Entry Point ───

/**
 * Generate landmarks for a chunk. Called from terrain-generator after columns.
 * Pushes landmark blocks into the shared entries array.
 */
export function generateChunkLandmarks(entries: VoxelSetOptions[], cx: number, cz: number): void {
	const hash = chunkHash(cx, cz);
	if (hash > LANDMARK_RATE) return;

	// Pick position within chunk (avoid edges for multi-block structures)
	const lx = 4 + Math.floor(subHash(cx, cz) * 8);
	const lz = 4 + Math.floor(subHash(cz, cx) * 8);
	const gx = cx * CHUNK_SIZE + lx;
	const gz = cz * CHUNK_SIZE + lz;

	const h = surfaceYAt(gx, gz);
	if (h < LANDMARK_MIN_HEIGHT) return;

	const biome = biomeAt(gx, gz);
	const boundary = isBiomeBoundary(gx, gz);

	if (boundary) {
		// Biome boundary: place stenhög + runsten
		const cairnH = 3 + Math.floor(subHash(cx + 1, cz + 1) * 3); // 3–5
		placeStenhog(entries, gx, h, gz, cairnH);
		placeRunsten(entries, gx + 2, h, gz);
	} else {
		// Interior: biome-specific landmark
		const type = selectBiomeLandmark(biome);
		switch (type) {
			case "kolmila":
				placeKolmila(entries, gx, h, gz);
				break;
			case "offerkalla":
				placeOfferkalla(entries, gx, h, gz);
				break;
			case "sjomarke":
				placeSjomarke(entries, gx, h, gz);
				break;
			case "fjallstuga":
				placeFjallstuga(entries, gx, h, gz);
				break;
			case "ruined-stone-circle":
				placeRuinedStoneCircle(entries, gx, h, gz);
				break;
			case "fornlamning": {
				const sizes = [5, 7, 9];
				const size = sizes[Math.floor(subHash(cx + 2, cz + 2) * 3)];
				placeFornlamning(entries, gx, h, gz, size);
				break;
			}
		}
	}
}
