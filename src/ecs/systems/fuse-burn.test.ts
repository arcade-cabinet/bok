import { describe, expect, it } from "vitest";
import { BlockId } from "../../world/blocks.ts";
import { getHeatStrength, isFuseBlock, shouldFuseBurn } from "./fuse-burn.ts";
import { FUSE_BURN_THRESHOLD } from "./self-modify-data.ts";
import { SignalType } from "./signal-data.ts";

describe("fuse-burn", () => {
	describe("isFuseBlock", () => {
		it("returns true for Wood", () => {
			expect(isFuseBlock(BlockId.Wood)).toBe(true);
		});

		it("returns true for Planks", () => {
			expect(isFuseBlock(BlockId.Planks)).toBe(true);
		});

		it("returns true for all wood variants", () => {
			expect(isFuseBlock(BlockId.BirchWood)).toBe(true);
			expect(isFuseBlock(BlockId.BeechWood)).toBe(true);
			expect(isFuseBlock(BlockId.PineWood)).toBe(true);
			expect(isFuseBlock(BlockId.DeadWood)).toBe(true);
			expect(isFuseBlock(BlockId.TreatedPlanks)).toBe(true);
		});

		it("returns false for Stone", () => {
			expect(isFuseBlock(BlockId.Stone)).toBe(false);
		});

		it("returns false for Air", () => {
			expect(isFuseBlock(BlockId.Air)).toBe(false);
		});

		it("returns false for Crystal", () => {
			expect(isFuseBlock(BlockId.Crystal)).toBe(false);
		});
	});

	describe("shouldFuseBurn", () => {
		it("burns when heat meets threshold", () => {
			expect(shouldFuseBurn(BlockId.Wood, FUSE_BURN_THRESHOLD)).toBe(true);
		});

		it("burns when heat exceeds threshold", () => {
			expect(shouldFuseBurn(BlockId.Wood, FUSE_BURN_THRESHOLD + 5)).toBe(true);
		});

		it("does not burn when heat below threshold", () => {
			expect(shouldFuseBurn(BlockId.Wood, FUSE_BURN_THRESHOLD - 1)).toBe(false);
		});

		it("does not burn when heat is zero", () => {
			expect(shouldFuseBurn(BlockId.Wood, 0)).toBe(false);
		});

		it("does not burn non-fuse blocks", () => {
			expect(shouldFuseBurn(BlockId.Stone, 15)).toBe(false);
		});

		it("burns Planks same as Wood", () => {
			expect(shouldFuseBurn(BlockId.Planks, FUSE_BURN_THRESHOLD)).toBe(true);
		});
	});

	describe("getHeatStrength", () => {
		it("returns 0 for undefined signals", () => {
			expect(getHeatStrength(undefined)).toBe(0);
		});

		it("returns 0 when no heat in map", () => {
			const signals = new Map([[SignalType.Light, 5]]);
			expect(getHeatStrength(signals)).toBe(0);
		});

		it("returns heat strength when present", () => {
			const signals = new Map([
				[SignalType.Heat, 8],
				[SignalType.Light, 3],
			]);
			expect(getHeatStrength(signals)).toBe(8);
		});
	});
});
