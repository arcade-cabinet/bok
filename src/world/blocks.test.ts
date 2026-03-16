import { describe, expect, it } from "vitest";
import { BLOCKS, BlockId, getBlockHardness, getBlockName, isBouncy, isSlippery, isSoft } from "./blocks.ts";
import { tiles } from "./tileset-generator.ts";

// ─── Block ID registry ───

describe("BlockId", () => {
	it("has unique numeric values for all block types", () => {
		const values = Object.values(BlockId);
		const unique = new Set(values);
		expect(unique.size).toBe(values.length);
	});

	it("starts at 0 (Air) and has no gaps", () => {
		const values = Object.values(BlockId).sort((a, b) => a - b);
		expect(values[0]).toBe(0);
		expect(values[values.length - 1]).toBe(values.length - 1);
	});

	it("contains all 19 new biome-specific blocks", () => {
		const newBlocks = [
			"BirchWood",
			"BirchLeaves",
			"BeechWood",
			"BeechLeaves",
			"PineWood",
			"PineLeaves",
			"SpruceLeaves",
			"DeadWood",
			"Moss",
			"Mushroom",
			"Peat",
			"Ice",
			"SmoothStone",
			"Soot",
			"CorruptedStone",
			"IronOre",
			"CopperOre",
			"Crystal",
			"FaluRed",
		] as const;
		for (const name of newBlocks) {
			expect(BlockId[name]).toBeDefined();
			expect(typeof BlockId[name]).toBe("number");
		}
	});
});

// ─── Block metadata ───

describe("BLOCKS metadata", () => {
	it("has an entry for every BlockId", () => {
		for (const id of Object.values(BlockId)) {
			expect(BLOCKS[id]).toBeDefined();
			expect(BLOCKS[id].name).toBeTruthy();
		}
	});

	it("maps every block ID to a valid name", () => {
		for (const [key, id] of Object.entries(BlockId)) {
			const meta = BLOCKS[id];
			expect(meta.name).toBeTruthy();
			// Name should relate to the key (not an exact match, but non-empty)
			if (key !== "Air") {
				expect(meta.color).toMatch(/^#[0-9a-fA-F]{6}$/);
			}
		}
	});

	it("Air is non-solid with zero hardness", () => {
		expect(BLOCKS[BlockId.Air].solid).toBe(false);
		expect(BLOCKS[BlockId.Air].hardness).toBe(0);
	});

	it("all leaf blocks are transparent", () => {
		const leafBlocks = [
			BlockId.Leaves,
			BlockId.BirchLeaves,
			BlockId.BeechLeaves,
			BlockId.PineLeaves,
			BlockId.SpruceLeaves,
		];
		for (const id of leafBlocks) {
			expect(BLOCKS[id].transparent).toBe(true);
		}
	});

	it("all wood blocks are solid with hardness >= 1.5", () => {
		const woodBlocks = [BlockId.Wood, BlockId.BirchWood, BlockId.BeechWood, BlockId.PineWood, BlockId.DeadWood];
		for (const id of woodBlocks) {
			expect(BLOCKS[id].solid).toBe(true);
			expect(BLOCKS[id].hardness).toBeGreaterThanOrEqual(1.5);
		}
	});

	it("Crystal is transparent and emissive", () => {
		expect(BLOCKS[BlockId.Crystal].transparent).toBe(true);
		expect(BLOCKS[BlockId.Crystal].emissive).toBe(true);
	});

	it("Ice is transparent", () => {
		expect(BLOCKS[BlockId.Ice].transparent).toBe(true);
	});

	it("Mushroom is non-solid (decorative)", () => {
		expect(BLOCKS[BlockId.Mushroom].solid).toBe(false);
	});
});

// ─── Physics properties ───

describe("block physics", () => {
	it("Ice is slippery", () => {
		expect(isSlippery(BlockId.Ice)).toBe(true);
		expect(BLOCKS[BlockId.Ice].slippery).toBe(true);
	});

	it("Peat is bouncy", () => {
		expect(isBouncy(BlockId.Peat)).toBe(true);
		expect(BLOCKS[BlockId.Peat].bouncy).toBe(true);
	});

	it("Moss is soft", () => {
		expect(isSoft(BlockId.Moss)).toBe(true);
		expect(BLOCKS[BlockId.Moss].soft).toBe(true);
	});

	it("regular blocks have no special physics", () => {
		expect(isSlippery(BlockId.Stone)).toBe(false);
		expect(isBouncy(BlockId.Stone)).toBe(false);
		expect(isSoft(BlockId.Stone)).toBe(false);
	});

	it("unknown block IDs return false for all physics", () => {
		expect(isSlippery(999)).toBe(false);
		expect(isBouncy(999)).toBe(false);
		expect(isSoft(999)).toBe(false);
	});
});

// ─── Utility functions ───

describe("getBlockHardness", () => {
	it("returns correct hardness for known blocks", () => {
		expect(getBlockHardness(BlockId.Stone)).toBe(4.0);
		expect(getBlockHardness(BlockId.CorruptedStone)).toBe(6.0);
		expect(getBlockHardness(BlockId.SmoothStone)).toBe(5.0);
		expect(getBlockHardness(BlockId.BeechWood)).toBe(3.0);
	});

	it("returns 1.0 for unknown block IDs", () => {
		expect(getBlockHardness(999)).toBe(1.0);
	});
});

describe("getBlockName", () => {
	it("returns correct name for all new blocks", () => {
		expect(getBlockName(BlockId.BirchWood)).toBe("Birch Wood");
		expect(getBlockName(BlockId.FaluRed)).toBe("Falu Red");
		expect(getBlockName(BlockId.CorruptedStone)).toBe("Corrupted Stone");
		expect(getBlockName(BlockId.IronOre)).toBe("Iron Ore");
		expect(getBlockName(BlockId.CopperOre)).toBe("Copper Ore");
	});

	it("returns 'Unknown' for invalid block IDs", () => {
		expect(getBlockName(999)).toBe("Unknown");
	});
});

// ─── Tileset tile coverage ───

describe("tileset tiles", () => {
	it("has unique col/row positions for every tile", () => {
		const positions = new Set(tiles.map((t) => `${t.col},${t.row}`));
		expect(positions.size).toBe(tiles.length);
	});

	it("all tiles fit within the 8x5 grid", () => {
		for (const tile of tiles) {
			expect(tile.col).toBeGreaterThanOrEqual(0);
			expect(tile.col).toBeLessThan(8);
			expect(tile.row).toBeGreaterThanOrEqual(0);
			expect(tile.row).toBeLessThan(5);
		}
	});

	it("has at least 38 tiles (15 original + 23 new)", () => {
		expect(tiles.length).toBeGreaterThanOrEqual(38);
	});

	it("all tiles have a valid baseColor", () => {
		for (const tile of tiles) {
			expect(tile.baseColor).toBeTruthy();
		}
	});
});
