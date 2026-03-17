import { describe, expect, it } from "vitest";
import type { VoxelSetOptions } from "../engine/voxel-types.ts";
import { Biome } from "./biomes.ts";
import { BlockId } from "./blocks.ts";
import {
	biomeAt,
	generateChunkLandmarks,
	isBiomeBoundary,
	LANDMARK_MIN_HEIGHT,
	LANDMARK_RATE,
	selectBiomeLandmark,
	surfaceYAt,
} from "./landmark-generator.ts";
import {
	placeFjallstuga,
	placeFornlamning,
	placeKolmila,
	placeOfferkalla,
	placeRunsten,
	placeSjomarke,
	placeStenhog,
} from "./landmark-types.ts";
import { initNoise } from "./noise.ts";

// ─── Landmark Rate ───

describe("landmark spawn rate", () => {
	it("LANDMARK_RATE is between 0 and 1 (exclusive)", () => {
		expect(LANDMARK_RATE).toBeGreaterThan(0);
		expect(LANDMARK_RATE).toBeLessThan(1);
	});

	it("LANDMARK_MIN_HEIGHT is above water level", () => {
		expect(LANDMARK_MIN_HEIGHT).toBeGreaterThan(10);
	});

	it("landmark placement is deterministic for same seed", () => {
		initNoise("landmark-det-test");
		const a: VoxelSetOptions[] = [];
		generateChunkLandmarks(a, 5, 5);
		initNoise("landmark-det-test");
		const b: VoxelSetOptions[] = [];
		generateChunkLandmarks(b, 5, 5);
		expect(a).toEqual(b);
	});

	it("sparse: most chunks produce no landmarks", () => {
		initNoise("landmark-sparse-test");
		let count = 0;
		for (let cx = 0; cx < 100; cx++) {
			for (let cz = 0; cz < 100; cz++) {
				const entries: VoxelSetOptions[] = [];
				generateChunkLandmarks(entries, cx, cz);
				if (entries.length > 0) count++;
			}
		}
		// ~5% of 10000 chunks = ~500, allow wide margin
		expect(count).toBeGreaterThan(100);
		expect(count).toBeLessThan(1500);
	});
});

// ─── Surface/Biome Helpers ───

describe("surfaceYAt", () => {
	it("returns a height within valid world range", () => {
		initNoise("surface-test");
		const h = surfaceYAt(100, 100);
		expect(h).toBeGreaterThanOrEqual(1);
		expect(h).toBeLessThanOrEqual(27);
	});

	it("same seed+position produces same height", () => {
		initNoise("surface-det");
		const a = surfaceYAt(50, 50);
		initNoise("surface-det");
		const b = surfaceYAt(50, 50);
		expect(a).toBe(b);
	});
});

describe("biomeAt", () => {
	it("returns a valid biome id", () => {
		initNoise("biome-at-test");
		const b = biomeAt(200, 200);
		const validBiomes = Object.values(Biome);
		expect(validBiomes).toContain(b);
	});
});

describe("isBiomeBoundary", () => {
	it("returns a boolean", () => {
		initNoise("boundary-test");
		const result = isBiomeBoundary(100, 100);
		expect(typeof result).toBe("boolean");
	});
});

// ─── Biome-Specific Landmark Selection ───

describe("selectBiomeLandmark", () => {
	it("Bokskogen → kolmila", () => {
		expect(selectBiomeLandmark(Biome.Bokskogen)).toBe("kolmila");
	});

	it("Myren → offerkalla", () => {
		expect(selectBiomeLandmark(Biome.Myren)).toBe("offerkalla");
	});

	it("Skärgården → sjomarke", () => {
		expect(selectBiomeLandmark(Biome.Skargarden)).toBe("sjomarke");
	});

	it("Fjällen → fjallstuga", () => {
		expect(selectBiomeLandmark(Biome.Fjallen)).toBe("fjallstuga");
	});

	it("Ängen → fornlamning (default)", () => {
		expect(selectBiomeLandmark(Biome.Angen)).toBe("fornlamning");
	});

	it("Blothögen → ruined-stone-circle", () => {
		expect(selectBiomeLandmark(Biome.Blothogen)).toBe("ruined-stone-circle");
	});
});

// ─── Structure Builders ───

describe("placeStenhog", () => {
	it("places base layer (3×3) and stacked column", () => {
		const entries: VoxelSetOptions[] = [];
		placeStenhog(entries, 10, 12, 10, 4);
		// 9 base blocks + 3 column blocks + 1 cap = 13
		expect(entries.length).toBe(13);
		// Check base includes all 3×3 positions at y=13
		const baseBlocks = entries.filter((e) => e.position.y === 13);
		expect(baseBlocks.length).toBe(9);
	});

	it("height 3 uses Stone, not SmoothStone", () => {
		const entries: VoxelSetOptions[] = [];
		placeStenhog(entries, 0, 10, 0, 3);
		const stoneBlocks = entries.filter((e) => e.blockId === BlockId.Stone);
		expect(stoneBlocks.length).toBeGreaterThan(0);
	});

	it("height 5 uses SmoothStone", () => {
		const entries: VoxelSetOptions[] = [];
		placeStenhog(entries, 0, 10, 0, 5);
		const smoothBlocks = entries.filter((e) => e.blockId === BlockId.SmoothStone);
		expect(smoothBlocks.length).toBeGreaterThan(0);
	});

	it("cap is always StoneBricks", () => {
		const entries: VoxelSetOptions[] = [];
		placeStenhog(entries, 0, 10, 0, 4);
		const topBlock = entries[entries.length - 1];
		expect(topBlock.blockId).toBe(BlockId.StoneBricks);
	});
});

describe("placeRunsten", () => {
	it("places 3 RuneStone blocks vertically", () => {
		const entries: VoxelSetOptions[] = [];
		placeRunsten(entries, 5, 12, 5);
		expect(entries.length).toBe(3);
		expect(entries.every((e) => e.blockId === BlockId.RuneStone)).toBe(true);
		expect(entries[0].position.y).toBe(13);
		expect(entries[1].position.y).toBe(14);
		expect(entries[2].position.y).toBe(15);
	});
});

describe("placeFornlamning", () => {
	it("size 5: creates 5×5 foundation floor", () => {
		const entries: VoxelSetOptions[] = [];
		placeFornlamning(entries, 10, 12, 10, 5);
		const floorBlocks = entries.filter((e) => e.position.y === 12 && e.blockId === BlockId.StoneBricks);
		expect(floorBlocks.length).toBe(25);
	});

	it("size 7: creates 7×7 foundation floor", () => {
		const entries: VoxelSetOptions[] = [];
		placeFornlamning(entries, 10, 12, 10, 7);
		const floorBlocks = entries.filter((e) => e.position.y === 12 && e.blockId === BlockId.StoneBricks);
		expect(floorBlocks.length).toBe(49);
	});

	it("includes a loot container stub (Glass) at center", () => {
		const entries: VoxelSetOptions[] = [];
		placeFornlamning(entries, 10, 12, 10, 5);
		const glass = entries.find((e) => e.blockId === BlockId.Glass);
		expect(glass).toBeDefined();
		expect(glass?.position.x).toBe(10);
		expect(glass?.position.z).toBe(10);
	});

	it("walls are partial (not complete perimeter)", () => {
		const entries: VoxelSetOptions[] = [];
		placeFornlamning(entries, 10, 12, 10, 5);
		const wallBlocks = entries.filter((e) => e.position.y > 12 && e.blockId === BlockId.Stone);
		// 5×5 perimeter has 16 edge positions, but only some get walls
		expect(wallBlocks.length).toBeGreaterThan(0);
		expect(wallBlocks.length).toBeLessThan(32); // Not all edges filled
	});
});

// ─── Biome-Specific Structures ───

describe("placeKolmila", () => {
	it("uses DeadWood and Soot blocks", () => {
		const entries: VoxelSetOptions[] = [];
		placeKolmila(entries, 10, 12, 10);
		const deadWood = entries.filter((e) => e.blockId === BlockId.DeadWood);
		const soot = entries.filter((e) => e.blockId === BlockId.Soot);
		expect(deadWood.length).toBeGreaterThan(0);
		expect(soot.length).toBe(1);
	});
});

describe("placeOfferkalla", () => {
	it("has stone ring and water pool", () => {
		const entries: VoxelSetOptions[] = [];
		placeOfferkalla(entries, 10, 12, 10);
		const water = entries.filter((e) => e.blockId === BlockId.Water);
		const stone = entries.filter((e) => e.blockId === BlockId.SmoothStone);
		const rune = entries.filter((e) => e.blockId === BlockId.RuneStone);
		expect(water.length).toBe(9); // 3×3 pool
		expect(stone.length).toBeGreaterThan(0);
		expect(rune.length).toBe(1); // Marker stone
	});
});

describe("placeSjomarke", () => {
	it("creates a tall pillar with torch on top", () => {
		const entries: VoxelSetOptions[] = [];
		placeSjomarke(entries, 10, 12, 10);
		const smoothStone = entries.filter((e) => e.blockId === BlockId.SmoothStone);
		const torch = entries.filter((e) => e.blockId === BlockId.Torch);
		expect(smoothStone.length).toBe(5); // 5 blocks tall
		expect(torch.length).toBe(1);
	});
});

describe("placeFjallstuga", () => {
	it("has Planks floor, PineWood walls, SpruceLeaves roof, and interior torch", () => {
		const entries: VoxelSetOptions[] = [];
		placeFjallstuga(entries, 10, 12, 10);
		const planks = entries.filter((e) => e.blockId === BlockId.Planks);
		const pineWood = entries.filter((e) => e.blockId === BlockId.PineWood);
		const roof = entries.filter((e) => e.blockId === BlockId.SpruceLeaves);
		const torch = entries.filter((e) => e.blockId === BlockId.Torch);
		expect(planks.length).toBe(9); // 3×3 floor
		expect(pineWood.length).toBeGreaterThan(0);
		expect(roof.length).toBe(9); // 3×3 roof
		expect(torch.length).toBe(1);
	});
});
