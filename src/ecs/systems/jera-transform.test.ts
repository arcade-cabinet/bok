import { describe, expect, it } from "vitest";
import { BlockId } from "../../world/blocks.ts";
import {
	CHARCOAL_ID,
	COPPER_INGOT_ID,
	findJeraRecipe,
	IRON_INGOT_ID,
	isJeraInput,
	JERA_RECIPES,
} from "./jera-transform.ts";
import { SignalType } from "./signal-data.ts";

// ─── findJeraRecipe ───

describe("findJeraRecipe", () => {
	it("iron ore + heat at strength 5 → iron ingot", () => {
		const recipe = findJeraRecipe(BlockId.IronOre, SignalType.Heat, 5);
		expect(recipe).toBeDefined();
		expect(recipe?.outputId).toBe(IRON_INGOT_ID);
		expect(recipe?.outputQty).toBe(1);
	});

	it("iron ore + heat below minimum strength → undefined", () => {
		expect(findJeraRecipe(BlockId.IronOre, SignalType.Heat, 4)).toBeUndefined();
	});

	it("copper ore + heat at strength 4 → copper ingot", () => {
		const recipe = findJeraRecipe(BlockId.CopperOre, SignalType.Heat, 4);
		expect(recipe).toBeDefined();
		expect(recipe?.outputId).toBe(COPPER_INGOT_ID);
		expect(recipe?.outputQty).toBe(1);
	});

	it("copper ore + heat below minimum strength → undefined", () => {
		expect(findJeraRecipe(BlockId.CopperOre, SignalType.Heat, 3)).toBeUndefined();
	});

	it("wood + heat at strength 3 → charcoal", () => {
		const recipe = findJeraRecipe(BlockId.Wood, SignalType.Heat, 3);
		expect(recipe).toBeDefined();
		expect(recipe?.outputId).toBe(CHARCOAL_ID);
		expect(recipe?.outputQty).toBe(1);
	});

	it("wood + heat below minimum strength → undefined", () => {
		expect(findJeraRecipe(BlockId.Wood, SignalType.Heat, 2)).toBeUndefined();
	});

	it("sand + heat at strength 6 → glass", () => {
		const recipe = findJeraRecipe(BlockId.Sand, SignalType.Heat, 6);
		expect(recipe).toBeDefined();
		expect(recipe?.outputId).toBe(BlockId.Glass);
	});

	it("wrong signal type returns undefined", () => {
		expect(findJeraRecipe(BlockId.IronOre, SignalType.Light, 10)).toBeUndefined();
		expect(findJeraRecipe(BlockId.IronOre, SignalType.Force, 10)).toBeUndefined();
		expect(findJeraRecipe(BlockId.IronOre, SignalType.Detection, 10)).toBeUndefined();
	});

	it("non-recipe input returns undefined", () => {
		expect(findJeraRecipe(BlockId.Grass, SignalType.Heat, 10)).toBeUndefined();
		expect(findJeraRecipe(BlockId.Stone, SignalType.Heat, 10)).toBeUndefined();
	});

	it("high strength still matches", () => {
		const recipe = findJeraRecipe(BlockId.IronOre, SignalType.Heat, 15);
		expect(recipe).toBeDefined();
		expect(recipe?.outputId).toBe(IRON_INGOT_ID);
	});
});

// ─── isJeraInput ───

describe("isJeraInput", () => {
	it("recognizes valid inputs", () => {
		expect(isJeraInput(BlockId.IronOre)).toBe(true);
		expect(isJeraInput(BlockId.CopperOre)).toBe(true);
		expect(isJeraInput(BlockId.Wood)).toBe(true);
		expect(isJeraInput(BlockId.Sand)).toBe(true);
	});

	it("rejects non-inputs", () => {
		expect(isJeraInput(BlockId.Grass)).toBe(false);
		expect(isJeraInput(BlockId.Stone)).toBe(false);
		expect(isJeraInput(BlockId.Air)).toBe(false);
	});
});

// ─── JERA_RECIPES ───

describe("JERA_RECIPES", () => {
	it("has at least 4 recipes", () => {
		expect(JERA_RECIPES.length).toBeGreaterThanOrEqual(4);
	});

	it("all recipes have positive minStrength", () => {
		for (const r of JERA_RECIPES) {
			expect(r.minStrength).toBeGreaterThan(0);
		}
	});

	it("all recipes have positive outputQty", () => {
		for (const r of JERA_RECIPES) {
			expect(r.outputQty).toBeGreaterThan(0);
		}
	});
});
