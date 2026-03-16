import { describe, expect, it } from "vitest";
import { TreeType } from "./biomes.ts";
import { BlockId } from "./blocks.ts";
import { placeTree } from "./tree-generator.ts";

interface Entry {
	position: { x: number; y: number; z: number };
	blockId: number;
}

function collectBlocks(tree: (typeof TreeType)[keyof typeof TreeType]): Entry[] {
	const entries: Entry[] = [];
	placeTree(entries, 0, 10, 0, tree);
	return entries;
}

function blockIds(entries: Entry[]): Set<number> {
	return new Set(entries.map((e) => e.blockId));
}

function _trunks(entries: Entry[]): Entry[] {
	return entries.filter((e) => e.position.x === 0 && e.position.z === 0 && e.position.y > 10);
}

// ─── Species-Specific Block Types ───

describe("placeTree block types", () => {
	it("Birch uses BirchWood and BirchLeaves", () => {
		const ids = blockIds(collectBlocks(TreeType.Birch));
		expect(ids.has(BlockId.BirchWood)).toBe(true);
		expect(ids.has(BlockId.BirchLeaves)).toBe(true);
		expect(ids.has(BlockId.Wood)).toBe(false);
		expect(ids.has(BlockId.Leaves)).toBe(false);
	});

	it("Beech uses BeechWood and BeechLeaves", () => {
		const ids = blockIds(collectBlocks(TreeType.Beech));
		expect(ids.has(BlockId.BeechWood)).toBe(true);
		expect(ids.has(BlockId.BeechLeaves)).toBe(true);
	});

	it("Pine uses PineWood and PineLeaves", () => {
		const ids = blockIds(collectBlocks(TreeType.Pine));
		expect(ids.has(BlockId.PineWood)).toBe(true);
		expect(ids.has(BlockId.PineLeaves)).toBe(true);
	});

	it("Spruce uses SpruceLeaves", () => {
		const ids = blockIds(collectBlocks(TreeType.Spruce));
		expect(ids.has(BlockId.SpruceLeaves)).toBe(true);
	});

	it("DeadBirch uses DeadWood with no leaves", () => {
		const entries = collectBlocks(TreeType.DeadBirch);
		const ids = blockIds(entries);
		expect(ids.has(BlockId.DeadWood)).toBe(true);
		expect(ids.size).toBe(1);
	});
});

// ─── Tree Shapes ───

describe("placeTree shapes", () => {
	it("Birch has thin 1-wide trunk, 4 blocks tall", () => {
		const entries = collectBlocks(TreeType.Birch);
		const trunkBlocks = entries.filter((e) => e.blockId === BlockId.BirchWood);
		expect(trunkBlocks.length).toBe(4);
		// All trunk blocks at center column
		expect(trunkBlocks.every((e) => e.position.x === 0 && e.position.z === 0)).toBe(true);
	});

	it("Beech has thick 2×2 trunk, 5 blocks tall", () => {
		const entries = collectBlocks(TreeType.Beech);
		const trunkBlocks = entries.filter((e) => e.blockId === BlockId.BeechWood);
		// 4 columns × 5 height = 20 trunk blocks
		expect(trunkBlocks.length).toBe(20);
	});

	it("Beech canopy spans 7×7 (wider than birch 5×5)", () => {
		const beechLeaves = collectBlocks(TreeType.Beech).filter((e) => e.blockId === BlockId.BeechLeaves);
		const birchLeaves = collectBlocks(TreeType.Birch).filter((e) => e.blockId === BlockId.BirchLeaves);
		expect(beechLeaves.length).toBeGreaterThan(birchLeaves.length);

		// Beech canopy extends to ±3 from center
		const maxX = Math.max(...beechLeaves.map((e) => Math.abs(e.position.x)));
		expect(maxX).toBe(3);
	});

	it("Pine has triangular profile (wider at bottom, narrow at top)", () => {
		const leaves = collectBlocks(TreeType.Pine).filter((e) => e.blockId === BlockId.PineLeaves);
		const bottomLayer = leaves.filter((e) => e.position.y === 13); // h=10, y+3=13
		const topLayer = leaves.filter((e) => e.position.y === 16); // crown at y+6=16
		expect(bottomLayer.length).toBeGreaterThan(topLayer.length);
		expect(topLayer.length).toBe(1); // single crown block
	});

	it("DeadBirch has 5 trunk blocks and no canopy", () => {
		const entries = collectBlocks(TreeType.DeadBirch);
		expect(entries.length).toBe(5);
		expect(entries.every((e) => e.blockId === BlockId.DeadWood)).toBe(true);
	});
});

// ─── Canopy Dimensions ───

describe("canopy dimensions", () => {
	it("Birch canopy is 5×5 (max offset ±2)", () => {
		const leaves = collectBlocks(TreeType.Birch).filter((e) => e.blockId === BlockId.BirchLeaves);
		const maxOffset = Math.max(...leaves.map((e) => Math.max(Math.abs(e.position.x), Math.abs(e.position.z))));
		expect(maxOffset).toBe(2);
	});

	it("Beech canopy is 7×7 (max offset ±3)", () => {
		const leaves = collectBlocks(TreeType.Beech).filter((e) => e.blockId === BlockId.BeechLeaves);
		const maxOffset = Math.max(...leaves.map((e) => Math.max(Math.abs(e.position.x), Math.abs(e.position.z))));
		expect(maxOffset).toBe(3);
	});

	it("Spruce canopy is narrow 3×3 (max offset ±1)", () => {
		const leaves = collectBlocks(TreeType.Spruce).filter((e) => e.blockId === BlockId.SpruceLeaves);
		const maxOffset = Math.max(...leaves.map((e) => Math.max(Math.abs(e.position.x), Math.abs(e.position.z))));
		expect(maxOffset).toBe(1);
	});
});
