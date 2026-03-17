import { describe, expect, it } from "vitest";
import { BlockId } from "../../world/blocks.ts";
import {
	FoodId,
	getCookingResult,
	getFoodRestore,
	HUNGER_DRAIN_THRESHOLD,
	HUNGER_HEALTH_DRAIN_RATE,
	HUNGER_SLOW_MULTIPLIER,
	HUNGER_SLOW_THRESHOLD,
	isCookable,
	isFood,
} from "./food.ts";

describe("food data", () => {
	it("identifies food items correctly", () => {
		expect(isFood(BlockId.Mushroom)).toBe(true);
		expect(isFood(BlockId.Cranberry)).toBe(true);
		expect(isFood(BlockId.Wildflower)).toBe(true);
		expect(isFood(FoodId.RawMeat)).toBe(true);
		expect(isFood(FoodId.CookedMeat)).toBe(true);
	});

	it("rejects non-food items", () => {
		expect(isFood(BlockId.Stone)).toBe(false);
		expect(isFood(BlockId.Wood)).toBe(false);
		expect(isFood(BlockId.Torch)).toBe(false);
		expect(isFood(0)).toBe(false);
	});

	it("returns correct restoration values", () => {
		expect(getFoodRestore(BlockId.Mushroom)).toBe(15);
		expect(getFoodRestore(BlockId.Cranberry)).toBe(12);
		expect(getFoodRestore(BlockId.Wildflower)).toBe(8);
		expect(getFoodRestore(FoodId.RawMeat)).toBe(10);
		expect(getFoodRestore(FoodId.CookedMeat)).toBe(35);
	});

	it("returns 0 for non-food items", () => {
		expect(getFoodRestore(BlockId.Stone)).toBe(0);
		expect(getFoodRestore(999)).toBe(0);
	});

	it("cooked meat restores more than raw", () => {
		expect(getFoodRestore(FoodId.CookedMeat)).toBeGreaterThan(getFoodRestore(FoodId.RawMeat));
	});

	it("identifies cookable items", () => {
		expect(isCookable(FoodId.RawMeat)).toBe(true);
		expect(isCookable(BlockId.Mushroom)).toBe(true);
		expect(isCookable(BlockId.Stone)).toBe(false);
	});

	it("returns cooking result for raw meat", () => {
		const result = getCookingResult(FoodId.RawMeat);
		expect(result).not.toBeNull();
		expect(result?.result).toBe(FoodId.CookedMeat);
		expect(result?.time).toBeGreaterThan(0);
	});

	it("returns null for non-cookable items", () => {
		expect(getCookingResult(BlockId.Stone)).toBeNull();
	});

	it("exports valid threshold constants", () => {
		expect(HUNGER_SLOW_THRESHOLD).toBe(0.2);
		expect(HUNGER_DRAIN_THRESHOLD).toBe(0.1);
		expect(HUNGER_SLOW_MULTIPLIER).toBe(0.5);
		expect(HUNGER_HEALTH_DRAIN_RATE).toBe(2);
	});
});
