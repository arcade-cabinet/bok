import { describe, expect, it } from "vitest";
import { BlockId } from "../../world/blocks.ts";
import { RuneId } from "./rune-data.ts";
import {
	DESTROY_MIN_SIGNAL,
	FUSE_BLOCKS,
	FUSE_BURN_THRESHOLD,
	isSelfModifyRune,
	PLACE_COST_PER_HARDNESS,
	PLACE_MIN_SIGNAL,
	SIGNAL_TO_BLOCK,
} from "./self-modify-data.ts";
import { SignalType } from "./signal-data.ts";

describe("self-modify-data", () => {
	describe("isSelfModifyRune", () => {
		it("returns true for Jera", () => {
			expect(isSelfModifyRune(RuneId.Jera)).toBe(true);
		});

		it("returns true for Thurisaz", () => {
			expect(isSelfModifyRune(RuneId.Thurisaz)).toBe(true);
		});

		it("returns false for other runes", () => {
			expect(isSelfModifyRune(RuneId.Kenaz)).toBe(false);
			expect(isSelfModifyRune(RuneId.Naudiz)).toBe(false);
			expect(isSelfModifyRune(RuneId.Fehu)).toBe(false);
			expect(isSelfModifyRune(RuneId.None)).toBe(false);
		});
	});

	describe("constants", () => {
		it("placement cost per hardness is positive", () => {
			expect(PLACE_COST_PER_HARDNESS).toBeGreaterThan(0);
		});

		it("placement minimum signal is positive", () => {
			expect(PLACE_MIN_SIGNAL).toBeGreaterThan(0);
		});

		it("destroy minimum signal is positive", () => {
			expect(DESTROY_MIN_SIGNAL).toBeGreaterThan(0);
		});

		it("fuse burn threshold is positive", () => {
			expect(FUSE_BURN_THRESHOLD).toBeGreaterThan(0);
		});
	});

	describe("SIGNAL_TO_BLOCK mapping", () => {
		it("maps all four signal types", () => {
			expect(SIGNAL_TO_BLOCK.get(SignalType.Heat)).toBe(BlockId.StoneBricks);
			expect(SIGNAL_TO_BLOCK.get(SignalType.Light)).toBe(BlockId.Glass);
			expect(SIGNAL_TO_BLOCK.get(SignalType.Force)).toBe(BlockId.Stone);
			expect(SIGNAL_TO_BLOCK.get(SignalType.Detection)).toBe(BlockId.RuneStone);
		});
	});

	describe("FUSE_BLOCKS", () => {
		it("contains Wood", () => {
			expect(FUSE_BLOCKS.has(BlockId.Wood)).toBe(true);
		});

		it("does not contain Stone", () => {
			expect(FUSE_BLOCKS.has(BlockId.Stone)).toBe(false);
		});

		it("does not contain Air", () => {
			expect(FUSE_BLOCKS.has(BlockId.Air)).toBe(false);
		});
	});
});
