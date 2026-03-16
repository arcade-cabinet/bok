import type { World } from "koota";
import { describe, expect, it } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { CookingState, Inventory, PlayerTag } from "../traits/index.ts";
import { cookingSystem, startCooking } from "./cooking.ts";
import { FoodId } from "./food.ts";

/** Helper: start a cooking operation through ECS updateEach (writable reference). */
function beginCooking(world: World, inputId: number, resultId: number, cookTime: number) {
	world.query(PlayerTag, CookingState).updateEach(([cooking]) => {
		startCooking(cooking, inputId, resultId, cookTime);
	});
}

describe("cookingSystem", () => {
	it("ticks cooking timer each frame", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		beginCooking(world, FoodId.RawMeat, FoodId.CookedMeat, 10);

		cookingSystem(world, 3);

		expect(entity.get(CookingState).timer).toBeCloseTo(7);
		expect(entity.get(CookingState).active).toBe(true);
	});

	it("completes cooking and adds result to inventory", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		beginCooking(world, FoodId.RawMeat, FoodId.CookedMeat, 5);

		cookingSystem(world, 5);

		expect(entity.get(CookingState).active).toBe(false);
		expect(entity.get(Inventory).items[FoodId.CookedMeat]).toBe(1);
	});

	it("completes cooking when timer overshoots", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		beginCooking(world, FoodId.RawMeat, FoodId.CookedMeat, 5);

		cookingSystem(world, 10);

		expect(entity.get(CookingState).active).toBe(false);
		expect(entity.get(Inventory).items[FoodId.CookedMeat]).toBe(1);
	});

	it("does nothing when cooking is not active", () => {
		const world = createTestWorld();
		spawnPlayer(world);

		cookingSystem(world, 1);
		// No assertions needed beyond not throwing
	});

	it("resets all cooking state fields on completion", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		beginCooking(world, FoodId.RawMeat, FoodId.CookedMeat, 1);

		cookingSystem(world, 1);

		const done = entity.get(CookingState);
		expect(done.active).toBe(false);
		expect(done.timer).toBe(0);
		expect(done.inputId).toBe(0);
		expect(done.resultId).toBe(0);
	});
});

describe("startCooking", () => {
	it("sets cooking state correctly", () => {
		const state = { active: false, timer: 0, inputId: 0, resultId: 0 };
		const result = startCooking(state, FoodId.RawMeat, FoodId.CookedMeat, 10);

		expect(result).toBe(true);
		expect(state.active).toBe(true);
		expect(state.timer).toBe(10);
		expect(state.inputId).toBe(FoodId.RawMeat);
		expect(state.resultId).toBe(FoodId.CookedMeat);
	});

	it("rejects when already cooking", () => {
		const state = { active: true, timer: 5, inputId: FoodId.RawMeat, resultId: FoodId.CookedMeat };
		const result = startCooking(state, FoodId.RawMeat, FoodId.CookedMeat, 10);

		expect(result).toBe(false);
		expect(state.timer).toBe(5);
	});
});
