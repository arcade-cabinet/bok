// ─── Food System Data ───
// Pure data: food IDs, restoration values, cooking transformations.
// No ECS, no Three.js — just lookup tables and helpers.

import { BlockId } from "../../world/blocks.ts";

// ─── Food Item IDs (item type, not blocks) ───
export const FoodId = {
	RawMeat: 201,
	CookedMeat: 202,
	Wheat: 203,
	Berry: 204,
} as const;

/** Hunger restoration values for all edible items (blocks and items). */
const FOOD_RESTORE: Record<number, number> = {
	[BlockId.Mushroom]: 15,
	[BlockId.Cranberry]: 12,
	[BlockId.Wildflower]: 8, // berries from Ängen
	[FoodId.RawMeat]: 10,
	[FoodId.CookedMeat]: 35,
};

/** Cooking transformations: raw item → cooked item + time in seconds. */
const COOKING_TABLE: Record<number, { result: number; time: number }> = {
	[FoodId.RawMeat]: { result: FoodId.CookedMeat, time: 10 },
	[BlockId.Mushroom]: { result: BlockId.Mushroom, time: 5 }, // cooked mushroom = same block, more restore
};

/** Whether an item/block is edible. */
export function isFood(id: number): boolean {
	return id in FOOD_RESTORE;
}

/** Get hunger restoration value for a food item. Returns 0 if not food. */
export function getFoodRestore(id: number): number {
	return FOOD_RESTORE[id] ?? 0;
}

/** Whether an item can be cooked (placed on torch/campfire). */
export function isCookable(id: number): boolean {
	return id in COOKING_TABLE;
}

/** Get the cooked result and cooking time for an item. */
export function getCookingResult(id: number): { result: number; time: number } | null {
	return COOKING_TABLE[id] ?? null;
}

// ─── Hunger Effect Thresholds ───
/** Below this % of max hunger, movement speed is reduced. */
export const HUNGER_SLOW_THRESHOLD = 0.2;
/** Below this % of max hunger, health drains. */
export const HUNGER_DRAIN_THRESHOLD = 0.1;
/** Movement speed multiplier when hungry. */
export const HUNGER_SLOW_MULTIPLIER = 0.5;
/** Health drain rate (HP/sec) when critically hungry. */
export const HUNGER_HEALTH_DRAIN_RATE = 2;
