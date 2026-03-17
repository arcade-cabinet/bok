import { describe, expect, it } from "vitest";
import { BlockId } from "../../world/blocks.ts";
import { CRYSTAL_DUST_ID, RAIDO_PAIR_RANGE_CHUNKS } from "./raido-data.ts";
import {
	canAffordTravel,
	computeTravelCost,
	findPairedAnchors,
	findRaidoAnchors,
	getPairPartner,
	type TravelAnchor,
} from "./raido-travel.ts";
import { Face } from "./rune-data.ts";
import { RuneIndex } from "./rune-index.ts";

// ─── findRaidoAnchors ───

describe("findRaidoAnchors", () => {
	it("returns empty array for empty index", () => {
		const idx = new RuneIndex();
		const anchors = findRaidoAnchors(idx, () => BlockId.RuneStone);
		expect(anchors).toEqual([]);
	});

	it("finds Raido runes on RuneStone blocks", () => {
		const idx = new RuneIndex();
		idx.setRune(10, 5, 20, Face.PosX, 14); // RuneId.Raido = 14
		const anchors = findRaidoAnchors(idx, () => BlockId.RuneStone);
		expect(anchors).toHaveLength(1);
		expect(anchors[0]).toEqual({ x: 10, y: 5, z: 20, cx: 0, cz: 1 });
	});

	it("ignores Raido runes on non-RuneStone blocks", () => {
		const idx = new RuneIndex();
		idx.setRune(10, 5, 20, Face.PosX, 14);
		const anchors = findRaidoAnchors(idx, () => BlockId.Stone);
		expect(anchors).toHaveLength(0);
	});

	it("deduplicates multiple faces on same block", () => {
		const idx = new RuneIndex();
		idx.setRune(10, 5, 20, Face.PosX, 14);
		idx.setRune(10, 5, 20, Face.NegX, 14);
		const anchors = findRaidoAnchors(idx, () => BlockId.RuneStone);
		expect(anchors).toHaveLength(1);
	});

	it("ignores non-Raido runes", () => {
		const idx = new RuneIndex();
		idx.setRune(10, 5, 20, Face.PosX, 5); // Kenaz
		const anchors = findRaidoAnchors(idx, () => BlockId.RuneStone);
		expect(anchors).toHaveLength(0);
	});

	it("finds multiple anchors in different chunks", () => {
		const idx = new RuneIndex();
		idx.setRune(5, 10, 5, Face.PosX, 14);
		idx.setRune(50, 10, 50, Face.PosY, 14);
		const anchors = findRaidoAnchors(idx, () => BlockId.RuneStone);
		expect(anchors).toHaveLength(2);
	});
});

// ─── computeTravelCost ───

describe("computeTravelCost", () => {
	it("returns base cost for short distance", () => {
		const cost = computeTravelCost(0, 0, 10, 10);
		expect(cost).toBe(1); // base only, ~14 blocks
	});

	it("adds distance cost for long travel", () => {
		const cost = computeTravelCost(0, 0, 200, 0);
		expect(cost).toBe(3); // 1 base + 2 per 100 blocks
	});

	it("caps at maximum cost", () => {
		const cost = computeTravelCost(0, 0, 10000, 0);
		expect(cost).toBe(5);
	});

	it("works with negative coordinates", () => {
		const cost = computeTravelCost(-50, -50, 50, 50);
		// distance ~141 blocks → 1 base + 1 distance = 2
		expect(cost).toBe(2);
	});
});

// ─── canAffordTravel ───

describe("canAffordTravel", () => {
	it("returns true when enough crystal dust", () => {
		const inv = { [CRYSTAL_DUST_ID]: 5 };
		expect(canAffordTravel(inv, 3)).toBe(true);
	});

	it("returns false when not enough crystal dust", () => {
		const inv = { [CRYSTAL_DUST_ID]: 1 };
		expect(canAffordTravel(inv, 3)).toBe(false);
	});

	it("returns false when no crystal dust at all", () => {
		expect(canAffordTravel({}, 1)).toBe(false);
	});

	it("returns true for exact amount", () => {
		const inv = { [CRYSTAL_DUST_ID]: 2 };
		expect(canAffordTravel(inv, 2)).toBe(true);
	});
});

// ─── findPairedAnchors ───

describe("findPairedAnchors", () => {
	const makeAnchor = (x: number, z: number): TravelAnchor => ({
		x,
		y: 10,
		z,
		cx: Math.floor(x / 16),
		cz: Math.floor(z / 16),
	});

	it("returns empty for no anchors", () => {
		expect(findPairedAnchors([], RAIDO_PAIR_RANGE_CHUNKS)).toEqual([]);
	});

	it("returns empty for single anchor", () => {
		const anchors = [makeAnchor(10, 10)];
		expect(findPairedAnchors(anchors, RAIDO_PAIR_RANGE_CHUNKS)).toEqual([]);
	});

	it("pairs two nearby anchors", () => {
		const anchors = [makeAnchor(10, 10), makeAnchor(20, 20)];
		const pairs = findPairedAnchors(anchors, RAIDO_PAIR_RANGE_CHUNKS);
		expect(pairs).toHaveLength(1);
		expect(pairs[0][0]).toEqual(anchors[0]);
		expect(pairs[0][1]).toEqual(anchors[1]);
	});

	it("does not pair anchors beyond range", () => {
		// 200 blocks apart → chunks 0 and 12 → range 12 > 6
		const anchors = [makeAnchor(0, 0), makeAnchor(200, 0)];
		const pairs = findPairedAnchors(anchors, RAIDO_PAIR_RANGE_CHUNKS);
		expect(pairs).toHaveLength(0);
	});

	it("each anchor used in at most one pair", () => {
		const anchors = [makeAnchor(0, 0), makeAnchor(10, 0), makeAnchor(20, 0)];
		const pairs = findPairedAnchors(anchors, RAIDO_PAIR_RANGE_CHUNKS);
		expect(pairs).toHaveLength(1); // only one pair from 3 anchors
	});
});

// ─── getPairPartner ───

describe("getPairPartner", () => {
	const a: TravelAnchor = { x: 10, y: 5, z: 20, cx: 0, cz: 1 };
	const b: TravelAnchor = { x: 50, y: 5, z: 50, cx: 3, cz: 3 };

	it("returns partner for first anchor in pair", () => {
		const partner = getPairPartner(a, [[a, b]]);
		expect(partner).toEqual(b);
	});

	it("returns partner for second anchor in pair", () => {
		const partner = getPairPartner(b, [[a, b]]);
		expect(partner).toEqual(a);
	});

	it("returns null for unpaired anchor", () => {
		const c: TravelAnchor = { x: 100, y: 5, z: 100, cx: 6, cz: 6 };
		const partner = getPairPartner(c, [[a, b]]);
		expect(partner).toBeNull();
	});
});
