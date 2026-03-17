// ─── Jera (Harvest) Transform Rules ───
// Pure data + logic: transformation recipes for Jera runes.
// Maps (input resource + signal type) → output item.
// No ECS, no Three.js — just lookup tables and pure functions.

import { BlockId } from "../../world/blocks.ts";
import { SignalType, type SignalTypeId } from "./signal-data.ts";

/** A single Jera transformation recipe. */
export interface JeraRecipe {
	/** Input item/block ID to consume. */
	inputId: number;
	/** Required signal type at the Jera face. */
	signalType: SignalTypeId;
	/** Minimum signal strength required. */
	minStrength: number;
	/** Output item/block ID produced. */
	outputId: number;
	/** Number of output items per transformation. */
	outputQty: number;
}

/** Item IDs for smelting products (reused from blocks.ts / items). */
const IRON_INGOT_ID = 301;
const COPPER_INGOT_ID = 302;
const CHARCOAL_ID = 303;

/** All Jera transformation recipes. */
export const JERA_RECIPES: ReadonlyArray<JeraRecipe> = [
	// Ore smelting: ore + heat → ingot
	{
		inputId: BlockId.IronOre,
		signalType: SignalType.Heat,
		minStrength: 5,
		outputId: IRON_INGOT_ID,
		outputQty: 1,
	},
	{
		inputId: BlockId.CopperOre,
		signalType: SignalType.Heat,
		minStrength: 4,
		outputId: COPPER_INGOT_ID,
		outputQty: 1,
	},
	// Wood processing: wood + heat → charcoal
	{
		inputId: BlockId.Wood,
		signalType: SignalType.Heat,
		minStrength: 3,
		outputId: CHARCOAL_ID,
		outputQty: 1,
	},
	// Sand smelting: sand + heat → glass
	{
		inputId: BlockId.Sand,
		signalType: SignalType.Heat,
		minStrength: 6,
		outputId: BlockId.Glass,
		outputQty: 1,
	},
];

/** Exported item IDs for use in tests and other modules. */
export { CHARCOAL_ID, COPPER_INGOT_ID, IRON_INGOT_ID };

/**
 * Find a matching Jera recipe for the given input and signal.
 * Returns the recipe if input matches and signal meets minimum strength, else undefined.
 */
export function findJeraRecipe(
	inputId: number,
	signalType: SignalTypeId,
	signalStrength: number,
): JeraRecipe | undefined {
	return JERA_RECIPES.find(
		(r) => r.inputId === inputId && r.signalType === signalType && signalStrength >= r.minStrength,
	);
}

/**
 * Check if a block/item ID is a valid Jera input for any recipe.
 */
export function isJeraInput(itemId: number): boolean {
	return JERA_RECIPES.some((r) => r.inputId === itemId);
}
