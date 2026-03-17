import { describe, expect, it } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { BlockId } from "../../world/blocks.ts";
import { addItem } from "../inventory.ts";
import { Hotbar, Hunger, Inventory, PlayerState } from "../traits/index.ts";
import { eatingSystem } from "./eating.ts";
import { FoodId } from "./food.ts";

describe("eatingSystem", () => {
	it("consumes food and restores hunger when wantsEat is true", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			hunger: { current: 50, max: 100 },
			playerState: { wantsEat: true },
		});

		// Put mushroom in inventory and hotbar
		const inv = entity.get(Inventory);
		addItem(inv, BlockId.Mushroom, 5);
		const hotbar = entity.get(Hotbar);
		hotbar.slots[0] = { id: BlockId.Mushroom, type: "block" };
		hotbar.activeSlot = 0;

		eatingSystem(world, 0);

		expect(entity.get(Hunger).current).toBe(65); // 50 + 15
		expect(inv.items[BlockId.Mushroom]).toBe(4);
		expect(entity.get(PlayerState).wantsEat).toBe(false);
	});

	it("clamps hunger at max", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			hunger: { current: 95, max: 100 },
			playerState: { wantsEat: true },
		});

		const inv = entity.get(Inventory);
		addItem(inv, BlockId.Mushroom, 1);
		const hotbar = entity.get(Hotbar);
		hotbar.slots[0] = { id: BlockId.Mushroom, type: "block" };
		hotbar.activeSlot = 0;

		eatingSystem(world, 0);

		expect(entity.get(Hunger).current).toBe(100);
	});

	it("does nothing when wantsEat is false", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			hunger: { current: 50 },
			playerState: { wantsEat: false },
		});

		const inv = entity.get(Inventory);
		addItem(inv, BlockId.Mushroom, 5);
		const hotbar = entity.get(Hotbar);
		hotbar.slots[0] = { id: BlockId.Mushroom, type: "block" };
		hotbar.activeSlot = 0;

		eatingSystem(world, 0);

		expect(entity.get(Hunger).current).toBe(50);
		expect(inv.items[BlockId.Mushroom]).toBe(5);
	});

	it("does nothing when active slot is not food", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			hunger: { current: 50 },
			playerState: { wantsEat: true },
		});

		const hotbar = entity.get(Hotbar);
		hotbar.slots[0] = { id: BlockId.Stone, type: "block" };
		hotbar.activeSlot = 0;

		eatingSystem(world, 0);

		expect(entity.get(Hunger).current).toBe(50);
		expect(entity.get(PlayerState).wantsEat).toBe(false);
	});

	it("does nothing when inventory has no food", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			hunger: { current: 50 },
			playerState: { wantsEat: true },
		});

		const hotbar = entity.get(Hotbar);
		hotbar.slots[0] = { id: BlockId.Mushroom, type: "block" };
		hotbar.activeSlot = 0;
		// No mushrooms in inventory

		eatingSystem(world, 0);

		expect(entity.get(Hunger).current).toBe(50);
	});

	it("handles item-type food (cooked meat)", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			hunger: { current: 30, max: 100 },
			playerState: { wantsEat: true },
		});

		const inv = entity.get(Inventory);
		addItem(inv, FoodId.CookedMeat, 1);
		const hotbar = entity.get(Hotbar);
		hotbar.slots[0] = { id: FoodId.CookedMeat, type: "item" };
		hotbar.activeSlot = 0;

		eatingSystem(world, 0);

		expect(entity.get(Hunger).current).toBe(65); // 30 + 35
		expect(inv.items[FoodId.CookedMeat]).toBeUndefined(); // removed from record
	});

	it("does nothing when active slot is null", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			hunger: { current: 50 },
			playerState: { wantsEat: true },
		});

		const hotbar = entity.get(Hotbar);
		hotbar.slots[0] = null;
		hotbar.activeSlot = 0;

		eatingSystem(world, 0);

		expect(entity.get(Hunger).current).toBe(50);
		expect(entity.get(PlayerState).wantsEat).toBe(false);
	});
});
