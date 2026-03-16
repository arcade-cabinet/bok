/**
 * Procedural terrain generator using multi-layer simplex noise and biome system.
 *
 * Noise layers (uncorrelated via offset):
 *   Continental (200) — base elevation
 *   Erosion (50)      — surface detail
 *   Temperature (150) — biome selection axis 1 (height-adjusted)
 *   Moisture (120)    — biome selection axis 2
 *   Corruption (80)   — Blothögen overlay
 */

import type { VoxelRenderer, VoxelSetOptions } from "@jolly-pixel/voxel.renderer";
import type { BiomeId, BiomeWeight, SurfaceRule } from "./biomes.ts";
import {
	BIOME_SURFACE_RULES,
	Biome,
	blendSurfaceBlock,
	blendTreeType,
	getBiomeTrees,
	ICE_LINE,
	selectBiome,
	TREE_LINE,
} from "./biomes.ts";
import { BlockId } from "./blocks.ts";
import { applyCaveToStone } from "./cave-generator.ts";
import { noise2D } from "./noise.ts";
import { placeTree } from "./tree-generator.ts";

const CHUNK_SIZE = 16;
const WORLD_HEIGHT = 32;
const WATER_LEVEL = 10;
const BLEND_RADIUS = 8;

// Noise layer coordinate offsets (uncorrelated layers from same permutation table)
const OFF_CONT = 0;
const OFF_EROS = 1000;
const OFF_TEMP = 2000;
const OFF_MOIS = 3000;
const OFF_CORR = 5000;
const OFF_ISLE = 4000;

// ─── Noise Layers ───

export interface NoiseLayers {
	continental: number;
	erosion: number;
	temperature: number;
	moisture: number;
}

export function sampleNoiseLayers(gx: number, gz: number): NoiseLayers {
	return {
		continental: noise2D(gx / 200 + OFF_CONT, gz / 200 + OFF_CONT) * 0.5 + 0.5,
		erosion: noise2D(gx / 50 + OFF_EROS, gz / 50 + OFF_EROS) * 0.5 + 0.5,
		temperature: noise2D(gx / 150 + OFF_TEMP, gz / 150 + OFF_TEMP) * 0.5 + 0.5,
		moisture: noise2D(gx / 120 + OFF_MOIS, gz / 120 + OFF_MOIS) * 0.5 + 0.5,
	};
}

/** Height from continental base + erosion detail, clamped to valid range. */
export function computeHeight(layers: NoiseLayers): number {
	const base = layers.continental * 16 + 4;
	const detail = (layers.erosion - 0.5) * 8;
	return Math.max(1, Math.min(WORLD_HEIGHT - 5, Math.floor(base + detail)));
}

/** Higher elevation → colder. Shifts temperature down for mountain peaks. */
function adjustTemperature(rawTemp: number, height: number): number {
	const heightNorm = Math.max(0, (height - WATER_LEVEL) / (WORLD_HEIGHT - WATER_LEVEL));
	return Math.max(0, Math.min(1, rawTemp - heightNorm * 0.3));
}

/** Biome-specific height adjustments: islands (Skärgården) and waterlogging (Myren). */
export function adjustBiomeHeight(h: number, biome: BiomeId, gx: number, gz: number): number {
	if (biome === Biome.Skargarden) {
		const island = noise2D(gx / 30 + OFF_ISLE, gz / 30 + OFF_ISLE) * 0.5 + 0.5;
		if (island > 0.6) return WATER_LEVEL + Math.floor((island - 0.6) * 20) + 1;
		return WATER_LEVEL - 2;
	}
	if (biome === Biome.Myren) {
		return WATER_LEVEL + Math.floor((h - WATER_LEVEL) * 0.2);
	}
	return h;
}

/** Corruption biased toward world edges — further from origin = more corruption. */
export function isCorrupted(gx: number, gz: number): boolean {
	const dist = Math.sqrt(gx * gx + gz * gz);
	const edgeBias = Math.min(1, dist / 500) * 0.2;
	return noise2D(gx / 80 + OFF_CORR, gz / 80 + OFF_CORR) + edgeBias > 0.65;
}

/** Resolve biome at a world position (noise + height-adjusted temperature). */
function biomeAt(gx: number, gz: number): BiomeId {
	if (isCorrupted(gx, gz)) return Biome.Blothogen;
	const layers = sampleNoiseLayers(gx, gz);
	const h = computeHeight(layers);
	return selectBiome(adjustTemperature(layers.temperature, h), layers.moisture);
}

// ─── Boundary Blending ───

function posHash(gx: number, gz: number): number {
	return Math.abs(Math.sin(gx * 12.9898 + gz * 78.233) * 43758.5453) % 1;
}

/** 5-point blend: center (weight 2) + 4 cardinals at BLEND_RADIUS (weight 1 each). */
function blendWeights(gx: number, gz: number, center: BiomeId): BiomeWeight[] | null {
	const cardinals = [
		biomeAt(gx, gz + BLEND_RADIUS),
		biomeAt(gx, gz - BLEND_RADIUS),
		biomeAt(gx + BLEND_RADIUS, gz),
		biomeAt(gx - BLEND_RADIUS, gz),
	];
	if (cardinals.every((b) => b === center)) return null;

	const counts = new Map<BiomeId, number>();
	counts.set(center, 2);
	for (const b of cardinals) counts.set(b, (counts.get(b) ?? 0) + 1);

	const weights: BiomeWeight[] = [];
	for (const [biome, count] of counts) weights.push({ biome, weight: count / 6 });
	weights.sort((a, b) => b.weight - a.weight);
	return weights;
}

// ─── Tree Spawn Rates ───

/** Biome-specific tree density. Bokskogen is dense forest; Myren/Skärgården are sparse. */
export function treeSpawnRate(biome: BiomeId): number {
	switch (biome) {
		case Biome.Bokskogen:
			return 0.07;
		case Biome.Angen:
			return 0.03;
		case Biome.Fjallen:
			return 0.02;
		case Biome.Myren:
		case Biome.Skargarden:
			return 0.02;
		default:
			return 0.04;
	}
}

// ─── Main Generation ───

export function generateChunkTerrain(vr: VoxelRenderer, layerName: string, cx: number, cz: number): void {
	const entries: VoxelSetOptions[] = [];

	for (let lx = 0; lx < CHUNK_SIZE; lx++) {
		for (let lz = 0; lz < CHUNK_SIZE; lz++) {
			const gx = cx * CHUNK_SIZE + lx;
			const gz = cz * CHUNK_SIZE + lz;
			const layers = sampleNoiseLayers(gx, gz);
			const rawH = computeHeight(layers);
			const temp = adjustTemperature(layers.temperature, rawH);
			const biome = isCorrupted(gx, gz) ? Biome.Blothogen : selectBiome(temp, layers.moisture);
			const h = adjustBiomeHeight(rawH, biome, gx, gz);
			const hash = posHash(gx, gz);
			const weights = blendWeights(gx, gz, biome);
			const rule: SurfaceRule = weights ? blendSurfaceBlock(weights, hash) : BIOME_SURFACE_RULES[biome];

			// Fjällen: ice surface above ICE_LINE
			const surface = biome === Biome.Fjallen && h >= ICE_LINE ? BlockId.Ice : rule.surface;

			for (let y = 0; y < WORLD_HEIGHT; y++) {
				let blockId = 0;
				if (y === h) blockId = surface;
				else if (y < h && y > h - rule.depth) blockId = rule.subsurface;
				else if (y <= h - rule.depth) blockId = BlockId.Stone;
				else if (y > h && y <= WATER_LEVEL && rule.waterBlock) blockId = rule.waterBlock;
				// Cave carving + ore veins in stone layer
				if (blockId === BlockId.Stone) blockId = applyCaveToStone(gx, y, gz, h);
				if (blockId !== 0) entries.push({ position: { x: gx, y, z: gz }, blockId });
			}

			// Biome ground features (placed above surface)
			if (h > WATER_LEVEL) {
				if (biome === Biome.Bokskogen && hash > 0.92) {
					entries.push({ position: { x: gx, y: h + 1, z: gz }, blockId: BlockId.Mushroom });
				} else if (biome === Biome.Angen && hash > 0.94) {
					entries.push({ position: { x: gx, y: h + 1, z: gz }, blockId: BlockId.Wildflower });
				} else if (biome === Biome.Myren && hash > 0.9) {
					entries.push({ position: { x: gx, y: h + 1, z: gz }, blockId: BlockId.Cranberry });
				}
			}

			// Trees — biome-specific spawn rate, tree line cutoff for Fjällen
			if (h > WATER_LEVEL + 1 && lx >= 2 && lx <= 13 && lz >= 2 && lz <= 13) {
				if (biome === Biome.Fjallen && h >= TREE_LINE) continue;
				const rate = treeSpawnRate(biome);
				if (hash < rate) {
					const tree = weights ? blendTreeType(weights, hash / rate) : getBiomeTrees(biome)[0];
					placeTree(entries, gx, h, gz, tree);
				}
			}
		}
	}

	vr.setVoxelBulk(layerName, entries);
}

export { CHUNK_SIZE, WATER_LEVEL, WORLD_HEIGHT };
