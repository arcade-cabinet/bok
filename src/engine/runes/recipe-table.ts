// ─── Recipe Table ───
// Jera transformation recipes: input → output.
// No ECS, no Three.js — pure data.

import type { ResourceIdValue } from "./resource.ts";
import { ResourceId } from "./resource.ts";

/** A single transformation recipe for the Jera rune. */
export interface Recipe {
	/** Input resource type. */
	input: ResourceIdValue;
	/** Input quantity consumed per transformation. */
	inputQty: number;
	/** Output resource type. */
	output: ResourceIdValue;
	/** Output quantity produced per transformation. */
	outputQty: number;
}

/** All Jera transformation recipes. */
export const RECIPES: ReadonlyArray<Recipe> = [
	{ input: ResourceId.Ore, inputQty: 1, output: ResourceId.Ingot, outputQty: 1 },
	{ input: ResourceId.Wheat, inputQty: 2, output: ResourceId.Bread, outputQty: 1 },
	{ input: ResourceId.Wood, inputQty: 1, output: ResourceId.Planks, outputQty: 2 },
	{ input: ResourceId.CrystalShard, inputQty: 2, output: ResourceId.CrystalLens, outputQty: 1 },
	{ input: ResourceId.Sand, inputQty: 1, output: ResourceId.Glass, outputQty: 1 },
	{ input: ResourceId.RawMeat, inputQty: 1, output: ResourceId.CookedMeat, outputQty: 1 },
];

/** Lookup recipe by input resource type. Returns null if no recipe exists. */
export function findRecipe(inputType: ResourceIdValue): Recipe | null {
	return RECIPES.find((r) => r.input === inputType) ?? null;
}
