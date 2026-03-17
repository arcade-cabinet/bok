import { describe, expect, it } from "vitest";
import {
	BIOME_RESOURCES,
	BIOME_SURFACE_RULES,
	Biome,
	type BiomeWeight,
	blendSurfaceBlock,
	blendTreeType,
	getBiomeTrees,
	ICE_LINE,
	isBiomeExclusive,
	selectBiome,
	TREE_LINE,
	TreeType,
} from "./biomes.ts";
import { BlockId } from "./blocks.ts";
import { initNoise, noise2D } from "./noise.ts";
import { computeHeight, type NoiseLayers, sampleNoiseLayers, treeSpawnRate } from "./terrain-generator.ts";

// ─── Biome Selection ───

describe("selectBiome", () => {
	it("cold temperature → Fjällen regardless of moisture", () => {
		expect(selectBiome(0.0, 0.0)).toBe(Biome.Fjallen);
		expect(selectBiome(0.1, 0.5)).toBe(Biome.Fjallen);
		expect(selectBiome(0.32, 1.0)).toBe(Biome.Fjallen);
	});

	it("cool + dry → Bokskogen", () => {
		expect(selectBiome(0.5, 0.2)).toBe(Biome.Bokskogen);
		expect(selectBiome(0.4, 0.49)).toBe(Biome.Bokskogen);
	});

	it("cool + wet → Myren", () => {
		expect(selectBiome(0.5, 0.7)).toBe(Biome.Myren);
		expect(selectBiome(0.4, 0.5)).toBe(Biome.Myren);
	});

	it("warm + dry → Ängen", () => {
		expect(selectBiome(0.8, 0.2)).toBe(Biome.Angen);
		expect(selectBiome(1.0, 0.0)).toBe(Biome.Angen);
	});

	it("warm + wet → Skärgården", () => {
		expect(selectBiome(0.8, 0.8)).toBe(Biome.Skargarden);
		expect(selectBiome(1.0, 1.0)).toBe(Biome.Skargarden);
	});

	it("boundary values are deterministic", () => {
		// Exactly at thresholds
		expect(selectBiome(0.33, 0.5)).toBe(Biome.Myren); // cool boundary, wet
		expect(selectBiome(0.66, 0.5)).toBe(Biome.Skargarden); // warm boundary, wet
		expect(selectBiome(0.66, 0.49)).toBe(Biome.Angen); // warm boundary, dry
	});
});

// ─── Per-Biome Tree Types ───

describe("getBiomeTrees", () => {
	it("Ängen → birch primary, pine secondary", () => {
		const trees = getBiomeTrees(Biome.Angen);
		expect(trees[0]).toBe(TreeType.Birch);
		expect(trees).toContain(TreeType.Pine);
	});

	it("Bokskogen → beech primary", () => {
		expect(getBiomeTrees(Biome.Bokskogen)[0]).toBe(TreeType.Beech);
	});

	it("Fjällen → spruce primary at tree line edge", () => {
		const trees = getBiomeTrees(Biome.Fjallen);
		expect(trees[0]).toBe(TreeType.Spruce);
		expect(trees).toContain(TreeType.Pine);
	});

	it("Blothögen → dead birch only", () => {
		const trees = getBiomeTrees(Biome.Blothogen);
		expect(trees).toEqual([TreeType.DeadBirch]);
	});

	it("all biomes include at least one tree type", () => {
		for (const biome of Object.values(Biome)) {
			expect(getBiomeTrees(biome).length).toBeGreaterThan(0);
		}
	});
});

// ─── Surface Rules ───

describe("BIOME_SURFACE_RULES", () => {
	it("every biome has a surface rule defined", () => {
		for (const biome of Object.values(Biome)) {
			const rule = BIOME_SURFACE_RULES[biome];
			expect(rule).toBeDefined();
			expect(rule.depth).toBeGreaterThan(0);
		}
	});

	it("Blothögen has no water", () => {
		expect(BIOME_SURFACE_RULES[Biome.Blothogen].waterBlock).toBe(0);
	});

	it("other biomes have water", () => {
		for (const biome of [Biome.Angen, Biome.Bokskogen, Biome.Fjallen, Biome.Skargarden, Biome.Myren]) {
			expect(BIOME_SURFACE_RULES[biome].waterBlock).toBeGreaterThan(0);
		}
	});

	it("Ängen surface is Grass", () => {
		expect(BIOME_SURFACE_RULES[Biome.Angen].surface).toBe(BlockId.Grass);
	});

	it("Bokskogen surface is Moss (moss floor)", () => {
		expect(BIOME_SURFACE_RULES[Biome.Bokskogen].surface).toBe(BlockId.Moss);
	});

	it("Fjällen surface is Snow with Stone subsurface", () => {
		const rule = BIOME_SURFACE_RULES[Biome.Fjallen];
		expect(rule.surface).toBe(BlockId.Snow);
		expect(rule.subsurface).toBe(BlockId.Stone);
	});

	it("Skärgården surface is SmoothStone (granite shores)", () => {
		expect(BIOME_SURFACE_RULES[Biome.Skargarden].surface).toBe(BlockId.SmoothStone);
	});

	it("Myren surface is Moss with Peat subsurface", () => {
		const rule = BIOME_SURFACE_RULES[Biome.Myren];
		expect(rule.surface).toBe(BlockId.Moss);
		expect(rule.subsurface).toBe(BlockId.Peat);
	});

	it("Blothögen surface is Soot with CorruptedStone subsurface", () => {
		const rule = BIOME_SURFACE_RULES[Biome.Blothogen];
		expect(rule.surface).toBe(BlockId.Soot);
		expect(rule.subsurface).toBe(BlockId.CorruptedStone);
	});
});

// ─── Elevation Thresholds ───

describe("elevation thresholds", () => {
	it("TREE_LINE is below ICE_LINE", () => {
		expect(TREE_LINE).toBeLessThan(ICE_LINE);
	});

	it("TREE_LINE is above WATER_LEVEL", () => {
		expect(TREE_LINE).toBeGreaterThan(10);
	});
});

// ─── Tree Spawn Rates ───

describe("treeSpawnRate", () => {
	it("Bokskogen has highest tree density", () => {
		const rates = Object.values(Biome).map((b) => treeSpawnRate(b));
		expect(treeSpawnRate(Biome.Bokskogen)).toBe(Math.max(...rates));
	});

	it("Myren and Skärgården are sparse", () => {
		expect(treeSpawnRate(Biome.Myren)).toBeLessThanOrEqual(0.02);
		expect(treeSpawnRate(Biome.Skargarden)).toBeLessThanOrEqual(0.02);
	});

	it("all biomes have positive spawn rate", () => {
		for (const biome of Object.values(Biome)) {
			expect(treeSpawnRate(biome)).toBeGreaterThan(0);
		}
	});
});

// ─── Boundary Blending ───

describe("blendSurfaceBlock", () => {
	it("100% weight returns that biome's surface rule", () => {
		const weights: BiomeWeight[] = [{ biome: Biome.Fjallen, weight: 1.0 }];
		expect(blendSurfaceBlock(weights, 0.5)).toBe(BIOME_SURFACE_RULES[Biome.Fjallen]);
	});

	it("selects biome based on hash position in weight distribution", () => {
		const weights: BiomeWeight[] = [
			{ biome: Biome.Angen, weight: 0.7 },
			{ biome: Biome.Bokskogen, weight: 0.3 },
		];
		// hash 0.5 < 0.7 → Ängen
		expect(blendSurfaceBlock(weights, 0.5)).toBe(BIOME_SURFACE_RULES[Biome.Angen]);
		// hash 0.8 > 0.7, < 1.0 → Bokskogen
		expect(blendSurfaceBlock(weights, 0.8)).toBe(BIOME_SURFACE_RULES[Biome.Bokskogen]);
	});

	it("hash 0 always returns first biome", () => {
		const weights: BiomeWeight[] = [
			{ biome: Biome.Myren, weight: 0.1 },
			{ biome: Biome.Angen, weight: 0.9 },
		];
		expect(blendSurfaceBlock(weights, 0.0)).toBe(BIOME_SURFACE_RULES[Biome.Myren]);
	});
});

describe("blendTreeType", () => {
	it("returns primary tree of selected biome", () => {
		const weights: BiomeWeight[] = [{ biome: Biome.Angen, weight: 1.0 }];
		expect(blendTreeType(weights, 0.5)).toBe(TreeType.Birch);
	});

	it("selects tree type based on hash across biome weights", () => {
		const weights: BiomeWeight[] = [
			{ biome: Biome.Angen, weight: 0.5 },
			{ biome: Biome.Bokskogen, weight: 0.5 },
		];
		expect(blendTreeType(weights, 0.3)).toBe(TreeType.Birch); // Ängen
		expect(blendTreeType(weights, 0.7)).toBe(TreeType.Beech); // Bokskogen
	});
});

// ─── Noise Layer Composition ───

describe("sampleNoiseLayers", () => {
	it("returns all four layers in [0,1] range", () => {
		initNoise("layer-range-test");
		const layers = sampleNoiseLayers(100, 100);
		for (const key of ["continental", "erosion", "temperature", "moisture"] as const) {
			expect(layers[key]).toBeGreaterThanOrEqual(0);
			expect(layers[key]).toBeLessThanOrEqual(1);
		}
	});

	it("same seed + position produces identical layers", () => {
		initNoise("determinism-test");
		const a = sampleNoiseLayers(42, 77);
		initNoise("determinism-test");
		const b = sampleNoiseLayers(42, 77);
		expect(a).toEqual(b);
	});

	it("different positions produce different layers", () => {
		initNoise("position-test");
		const a = sampleNoiseLayers(0, 0);
		const b = sampleNoiseLayers(500, 500);
		// At least one layer should differ significantly
		const diffs = (["continental", "erosion", "temperature", "moisture"] as const).map((k) => Math.abs(a[k] - b[k]));
		expect(Math.max(...diffs)).toBeGreaterThan(0.01);
	});

	it("layers at same position are uncorrelated (different offsets)", () => {
		initNoise("uncorrelated-test");
		const layers = sampleNoiseLayers(200, 200);
		// Continental and temperature should differ (different scales + offsets)
		expect(layers.continental).not.toBeCloseTo(layers.temperature, 5);
	});
});

describe("computeHeight", () => {
	it("mid-range layers produce mid-range height", () => {
		const layers: NoiseLayers = { continental: 0.5, erosion: 0.5, temperature: 0.5, moisture: 0.5 };
		const h = computeHeight(layers);
		expect(h).toBeGreaterThanOrEqual(8);
		expect(h).toBeLessThanOrEqual(16);
	});

	it("extreme continental produces extreme heights", () => {
		const low: NoiseLayers = { continental: 0.0, erosion: 0.5, temperature: 0.5, moisture: 0.5 };
		const high: NoiseLayers = { continental: 1.0, erosion: 0.5, temperature: 0.5, moisture: 0.5 };
		expect(computeHeight(low)).toBeLessThan(computeHeight(high));
	});

	it("height is clamped within valid range", () => {
		const extreme: NoiseLayers = { continental: 1.0, erosion: 1.0, temperature: 0, moisture: 0 };
		const h = computeHeight(extreme);
		expect(h).toBeGreaterThanOrEqual(1);
		expect(h).toBeLessThanOrEqual(27); // WORLD_HEIGHT - 5
	});

	it("erosion adds detail to base height", () => {
		const smooth: NoiseLayers = { continental: 0.5, erosion: 0.0, temperature: 0, moisture: 0 };
		const rough: NoiseLayers = { continental: 0.5, erosion: 1.0, temperature: 0, moisture: 0 };
		// Erosion 0 subtracts, erosion 1 adds
		expect(computeHeight(smooth)).toBeLessThan(computeHeight(rough));
	});
});

// ─── Noise Determinism ───

describe("noise determinism", () => {
	it("same seed produces identical noise values", () => {
		initNoise("test-biome-seed");
		const a = noise2D(100 / 200, 100 / 200);
		initNoise("test-biome-seed");
		const b = noise2D(100 / 200, 100 / 200);
		expect(a).toBe(b);
	});

	it("different seeds produce different noise values", () => {
		initNoise("seed-alpha");
		const a = noise2D(50 / 150, 50 / 150);
		initNoise("seed-beta");
		const b = noise2D(50 / 150, 50 / 150);
		expect(a).not.toBe(b);
	});
});

// ─── Biome-Specific Resources ───

describe("BIOME_RESOURCES", () => {
	it("every biome has at least one exclusive resource", () => {
		for (const biome of Object.values(Biome)) {
			expect(BIOME_RESOURCES[biome].length).toBeGreaterThan(0);
		}
	});

	it("Peat is exclusive to Myren", () => {
		expect(BIOME_RESOURCES[Biome.Myren]).toContain(BlockId.Peat);
		expect(isBiomeExclusive(BlockId.Peat)).toBe(Biome.Myren);
	});

	it("Soot is exclusive to Blothögen", () => {
		expect(BIOME_RESOURCES[Biome.Blothogen]).toContain(BlockId.Soot);
		expect(isBiomeExclusive(BlockId.Soot)).toBe(Biome.Blothogen);
	});

	it("CorruptedStone is exclusive to Blothögen", () => {
		expect(isBiomeExclusive(BlockId.CorruptedStone)).toBe(Biome.Blothogen);
	});

	it("Cranberry is exclusive to Myren", () => {
		expect(BIOME_RESOURCES[Biome.Myren]).toContain(BlockId.Cranberry);
		expect(isBiomeExclusive(BlockId.Cranberry)).toBe(Biome.Myren);
	});

	it("SmoothStone is exclusive to Skärgården", () => {
		expect(isBiomeExclusive(BlockId.SmoothStone)).toBe(Biome.Skargarden);
	});

	it("non-exclusive blocks return null", () => {
		expect(isBiomeExclusive(BlockId.Stone)).toBeNull();
		expect(isBiomeExclusive(BlockId.Wood)).toBeNull();
	});
});
