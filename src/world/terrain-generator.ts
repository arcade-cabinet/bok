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
import type { BiomeId, BiomeWeight, SurfaceRule, TreeTypeId } from "./biomes.ts";
import {
	BIOME_SURFACE_RULES,
	Biome,
	blendSurfaceBlock,
	blendTreeType,
	getBiomeTrees,
	selectBiome,
	TreeType,
} from "./biomes.ts";
import { BlockId } from "./blocks.ts";
import { noise2D } from "./noise.ts";

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

function isCorrupted(gx: number, gz: number): boolean {
	return noise2D(gx / 80 + OFF_CORR, gz / 80 + OFF_CORR) > 0.65;
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

// ─── Tree Placement ───

function placeTree(entries: VoxelSetOptions[], gx: number, h: number, gz: number, tree: TreeTypeId): void {
	const trunk = tree === TreeType.DeadBirch ? 5 : 4;
	for (let ty = 1; ty <= trunk; ty++) {
		entries.push({ position: { x: gx, y: h + ty, z: gz }, blockId: BlockId.Wood });
	}
	if (tree === TreeType.DeadBirch) return;
	for (let tlx = -2; tlx <= 2; tlx++) {
		for (let tlz = -2; tlz <= 2; tlz++) {
			for (let ly = 3; ly <= 5; ly++) {
				if (Math.abs(tlx) === 2 && Math.abs(tlz) === 2 && ly === 5) continue;
				if (tlx === 0 && tlz === 0 && ly <= 4) continue;
				entries.push({ position: { x: gx + tlx, y: h + ly, z: gz + tlz }, blockId: BlockId.Leaves });
			}
		}
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
			const h = computeHeight(layers);
			const temp = adjustTemperature(layers.temperature, h);
			const biome = isCorrupted(gx, gz) ? Biome.Blothogen : selectBiome(temp, layers.moisture);
			const hash = posHash(gx, gz);
			const weights = blendWeights(gx, gz, biome);
			const rule: SurfaceRule = weights ? blendSurfaceBlock(weights, hash) : BIOME_SURFACE_RULES[biome];

			for (let y = 0; y < WORLD_HEIGHT; y++) {
				let blockId = 0;
				if (y === h) blockId = rule.surface;
				else if (y < h && y > h - rule.depth) blockId = rule.subsurface;
				else if (y <= h - rule.depth) blockId = BlockId.Stone;
				else if (y > h && y <= WATER_LEVEL && rule.waterBlock) blockId = rule.waterBlock;
				if (blockId !== 0) entries.push({ position: { x: gx, y, z: gz }, blockId });
			}

			// Trees — biome-specific spawn rate and type
			if (h > WATER_LEVEL + 1 && lx >= 2 && lx <= 13 && lz >= 2 && lz <= 13) {
				const rate = biome === Biome.Myren || biome === Biome.Skargarden ? 0.02 : 0.04;
				if (hash < rate) {
					const tree = weights ? blendTreeType(weights, hash / rate) : getBiomeTrees(biome)[0];
					placeTree(entries, gx, h, gz, tree);
				}
			}
		}
	}

	vr.setVoxelBulk(layerName, entries);
}

export function generateSpawnShrine(vr: VoxelRenderer, layerName: string, surfaceY: number): void {
	const entries: VoxelSetOptions[] = [];
	for (let x = 6; x <= 10; x++) {
		for (let z = 6; z <= 10; z++) {
			entries.push({ position: { x, y: surfaceY, z }, blockId: BlockId.StoneBricks });
			for (let y = surfaceY + 1; y <= surfaceY + 4; y++) {
				vr.removeVoxel(layerName, { position: { x, y, z } });
			}
		}
	}
	entries.push({ position: { x: 6, y: surfaceY + 1, z: 6 }, blockId: BlockId.Torch });
	entries.push({ position: { x: 10, y: surfaceY + 1, z: 6 }, blockId: BlockId.Torch });
	entries.push({ position: { x: 6, y: surfaceY + 1, z: 10 }, blockId: BlockId.Torch });
	entries.push({ position: { x: 10, y: surfaceY + 1, z: 10 }, blockId: BlockId.Torch });
	entries.push({ position: { x: 8, y: surfaceY, z: 8 }, blockId: BlockId.Glass });
	vr.setVoxelBulk(layerName, entries);
}

export function findSurfaceY(vr: VoxelRenderer, x: number, z: number): number {
	for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
		const entry = vr.getVoxel({ x, y, z });
		if (entry && entry.blockId !== BlockId.Air && entry.blockId !== BlockId.Water) return y;
	}
	return WATER_LEVEL;
}

export { CHUNK_SIZE, WATER_LEVEL, WORLD_HEIGHT };
