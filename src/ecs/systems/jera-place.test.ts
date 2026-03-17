import { describe, expect, it } from "vitest";
import { BLOCKS, BlockId } from "../../world/blocks.ts";
import { canPlaceBlock, computePlacementCost, selectPlacementBlock } from "./jera-place.ts";
import { PLACE_COST_PER_HARDNESS, PLACE_DEFAULT_BLOCK, PLACE_MIN_SIGNAL } from "./self-modify-data.ts";
import { SignalType } from "./signal-data.ts";

describe("jera-place", () => {
	describe("selectPlacementBlock", () => {
		it("maps Heat to StoneBricks", () => {
			expect(selectPlacementBlock(SignalType.Heat)).toBe(BlockId.StoneBricks);
		});

		it("maps Light to Glass", () => {
			expect(selectPlacementBlock(SignalType.Light)).toBe(BlockId.Glass);
		});

		it("maps Force to Stone", () => {
			expect(selectPlacementBlock(SignalType.Force)).toBe(BlockId.Stone);
		});

		it("maps Detection to RuneStone", () => {
			expect(selectPlacementBlock(SignalType.Detection)).toBe(BlockId.RuneStone);
		});

		it("falls back to default for unknown signal type", () => {
			expect(selectPlacementBlock(99 as number)).toBe(PLACE_DEFAULT_BLOCK);
		});
	});

	describe("computePlacementCost", () => {
		it("computes cost from block hardness", () => {
			const stoneHardness = BLOCKS[BlockId.Stone].hardness;
			expect(computePlacementCost(BlockId.Stone)).toBe(Math.ceil(stoneHardness * PLACE_COST_PER_HARDNESS));
		});

		it("returns minimum signal for unknown block", () => {
			expect(computePlacementCost(999)).toBe(PLACE_MIN_SIGNAL);
		});

		it("ceiling rounds up fractional costs", () => {
			// Glass has hardness 1.0, cost should be 2
			expect(computePlacementCost(BlockId.Glass)).toBe(Math.ceil(1.0 * PLACE_COST_PER_HARDNESS));
		});
	});

	describe("canPlaceBlock", () => {
		it("returns true when exit is air and signal is sufficient", () => {
			// Stone has hardness 4.0, cost = ceil(4.0 * 2) = 8
			expect(canPlaceBlock(BlockId.Air, 10, BlockId.Stone)).toBe(true);
		});

		it("returns false when exit is not air", () => {
			expect(canPlaceBlock(BlockId.Stone, 15, BlockId.Stone)).toBe(false);
		});

		it("returns false when signal below minimum threshold", () => {
			expect(canPlaceBlock(BlockId.Air, 2, BlockId.Stone)).toBe(false);
		});

		it("returns false when signal below hardness cost", () => {
			// Stone cost = 8, signal 5 is below
			expect(canPlaceBlock(BlockId.Air, 5, BlockId.Stone)).toBe(false);
		});

		it("returns true for glass with moderate signal", () => {
			// Glass hardness 1.0, cost = ceil(1.0 * 2) = 2, but min is 4
			expect(canPlaceBlock(BlockId.Air, 4, BlockId.Glass)).toBe(true);
		});

		it("exactly meets threshold", () => {
			const cost = computePlacementCost(BlockId.Stone);
			expect(canPlaceBlock(BlockId.Air, cost, BlockId.Stone)).toBe(true);
		});
	});
});
