import { describe, expect, it } from "vitest";
import { BLOCKS, BlockId } from "../../world/blocks.ts";
import { DESTROY_COST_PER_HARDNESS, DESTROY_MIN_SIGNAL } from "./self-modify-data.ts";
import { canDestroyBlock, computeDestructionCost } from "./thurisaz-destroy.ts";

describe("thurisaz-destroy", () => {
	describe("computeDestructionCost", () => {
		it("computes cost from block hardness", () => {
			const stoneHardness = BLOCKS[BlockId.Stone].hardness;
			const expected = Math.max(Math.ceil(stoneHardness * DESTROY_COST_PER_HARDNESS), DESTROY_MIN_SIGNAL);
			expect(computeDestructionCost(BlockId.Stone)).toBe(expected);
		});

		it("enforces minimum signal for soft blocks", () => {
			// Dirt hardness 0.6, cost = ceil(0.6 * 1.5) = 1, but min is 5
			expect(computeDestructionCost(BlockId.Dirt)).toBe(DESTROY_MIN_SIGNAL);
		});

		it("returns minimum for unknown block", () => {
			expect(computeDestructionCost(999)).toBe(DESTROY_MIN_SIGNAL);
		});

		it("high hardness blocks cost more", () => {
			const runeStoneCost = computeDestructionCost(BlockId.RuneStone);
			const dirtCost = computeDestructionCost(BlockId.Dirt);
			expect(runeStoneCost).toBeGreaterThan(dirtCost);
		});
	});

	describe("canDestroyBlock", () => {
		it("returns true for solid block with sufficient signal", () => {
			expect(canDestroyBlock(BlockId.Dirt, 10)).toBe(true);
		});

		it("returns false for air", () => {
			expect(canDestroyBlock(BlockId.Air, 15)).toBe(false);
		});

		it("returns false for fluid blocks", () => {
			expect(canDestroyBlock(BlockId.Water, 15)).toBe(false);
		});

		it("returns false when signal below minimum", () => {
			expect(canDestroyBlock(BlockId.Dirt, 2)).toBe(false);
		});

		it("returns false when signal below hardness cost", () => {
			// RuneStone hardness 7.0, cost = max(ceil(7 * 1.5), 5) = 11
			expect(canDestroyBlock(BlockId.RuneStone, 6)).toBe(false);
		});

		it("returns true when exactly meeting cost", () => {
			const cost = computeDestructionCost(BlockId.Stone);
			expect(canDestroyBlock(BlockId.Stone, cost)).toBe(true);
		});

		it("returns false for non-solid blocks like Torch", () => {
			expect(canDestroyBlock(BlockId.Torch, 15)).toBe(false);
		});
	});
});
