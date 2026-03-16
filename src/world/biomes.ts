/**
 * Biome definitions, selection, and boundary blending for Swedish landscape terrain.
 *
 * Temperature × Moisture → Biome:
 *   Cold + Any    → Fjällen (mountains)
 *   Cool + Dry    → Bokskogen (beech forest)
 *   Cool + Wet    → Myren (mire/bog)
 *   Warm + Dry    → Ängen (meadow)
 *   Warm + Wet    → Skärgården (archipelago)
 *   Corruption    → Blothögen (overlay on any biome)
 */

import { BlockId } from "./blocks.ts";

// ─── Biome Enum ───

export const Biome = {
	Angen: 0,
	Bokskogen: 1,
	Fjallen: 2,
	Skargarden: 3,
	Myren: 4,
	Blothogen: 5,
} as const;

export type BiomeId = (typeof Biome)[keyof typeof Biome];

export const BIOME_NAMES: Record<BiomeId, string> = {
	[Biome.Angen]: "Ängen",
	[Biome.Bokskogen]: "Bokskogen",
	[Biome.Fjallen]: "Fjällen",
	[Biome.Skargarden]: "Skärgården",
	[Biome.Myren]: "Myren",
	[Biome.Blothogen]: "Blothögen",
};

// ─── Biome Selection ───

/**
 * Select biome from temperature [0,1] and moisture [0,1].
 * Temperature is already height-adjusted (higher elevation → colder).
 */
export function selectBiome(temperature: number, moisture: number): BiomeId {
	if (temperature < 0.33) return Biome.Fjallen;
	if (temperature < 0.66) return moisture < 0.5 ? Biome.Bokskogen : Biome.Myren;
	return moisture < 0.5 ? Biome.Angen : Biome.Skargarden;
}

// ─── Surface Rules ───

export interface SurfaceRule {
	surface: number;
	subsurface: number;
	depth: number;
	waterBlock: number;
}

export const BIOME_SURFACE_RULES: Record<BiomeId, SurfaceRule> = {
	[Biome.Angen]: { surface: BlockId.Grass, subsurface: BlockId.Dirt, depth: 4, waterBlock: BlockId.Water },
	[Biome.Bokskogen]: { surface: BlockId.Moss, subsurface: BlockId.Dirt, depth: 5, waterBlock: BlockId.Water },
	[Biome.Fjallen]: { surface: BlockId.Snow, subsurface: BlockId.Stone, depth: 2, waterBlock: BlockId.Water },
	[Biome.Skargarden]: { surface: BlockId.Stone, subsurface: BlockId.Stone, depth: 3, waterBlock: BlockId.Water },
	[Biome.Myren]: { surface: BlockId.Grass, subsurface: BlockId.Dirt, depth: 3, waterBlock: BlockId.Water },
	[Biome.Blothogen]: { surface: BlockId.Dirt, subsurface: BlockId.Stone, depth: 3, waterBlock: 0 },
};

// ─── Tree Types ───

export const TreeType = {
	Birch: 0,
	Beech: 1,
	Pine: 2,
	Spruce: 3,
	DeadBirch: 4,
} as const;

export type TreeTypeId = (typeof TreeType)[keyof typeof TreeType];

/** Tree types that spawn in each biome, in priority order. */
export function getBiomeTrees(biome: BiomeId): TreeTypeId[] {
	switch (biome) {
		case Biome.Angen:
			return [TreeType.Birch, TreeType.Pine];
		case Biome.Bokskogen:
			return [TreeType.Beech, TreeType.Pine];
		case Biome.Fjallen:
			return [TreeType.Spruce, TreeType.Pine];
		case Biome.Skargarden:
			return [TreeType.Pine];
		case Biome.Myren:
			return [TreeType.Pine];
		case Biome.Blothogen:
			return [TreeType.DeadBirch];
		default:
			return [TreeType.Pine];
	}
}

// ─── Elevation Thresholds ───

/** Above this height, Fjällen biome suppresses tree generation. */
export const TREE_LINE = 18;

/** Above this height, Fjällen uses Ice instead of Snow on the surface. */
export const ICE_LINE = 22;

// ─── Boundary Blending ───

export interface BiomeWeight {
	biome: BiomeId;
	weight: number;
}

/**
 * Pick a surface rule from weighted biome list using a deterministic hash [0,1).
 * The hash should be derived from block position for reproducibility.
 */
export function blendSurfaceBlock(weights: BiomeWeight[], hash: number): SurfaceRule {
	let accumulated = 0;
	for (const { biome, weight } of weights) {
		accumulated += weight;
		if (hash < accumulated) {
			return BIOME_SURFACE_RULES[biome];
		}
	}
	return BIOME_SURFACE_RULES[weights[0].biome];
}

/**
 * Pick a tree type from weighted biome list using a deterministic hash [0,1).
 * Returns the primary tree type of the selected biome.
 */
export function blendTreeType(weights: BiomeWeight[], hash: number): TreeTypeId {
	let accumulated = 0;
	for (const { biome, weight } of weights) {
		accumulated += weight;
		if (hash < accumulated) {
			return getBiomeTrees(biome)[0];
		}
	}
	return getBiomeTrees(weights[0].biome)[0];
}
