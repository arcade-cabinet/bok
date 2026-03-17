import { describe, expect, it } from "vitest";
import { findRecipe, RECIPES } from "./recipe-table.ts";
import { MAX_RESOURCE_QTY, ResourceId } from "./resource.ts";
import { WorldState } from "./world-state.ts";

// ─── WorldState Basic Operations ───

describe("WorldState", () => {
	it("starts empty", () => {
		const ws = new WorldState();
		expect(ws.size).toBe(0);
		expect(ws.get(0, 0, 0)).toBeNull();
		expect(ws.has(0, 0, 0)).toBe(false);
	});

	it("adds resource to empty cell", () => {
		const ws = new WorldState();
		const added = ws.add(0, 0, 0, ResourceId.Ore, 3);
		expect(added).toBe(3);
		expect(ws.get(0, 0, 0)).toEqual({ type: ResourceId.Ore, qty: 3 });
		expect(ws.has(0, 0, 0)).toBe(true);
		expect(ws.size).toBe(1);
	});

	it("stacks same resource type in a cell", () => {
		const ws = new WorldState();
		ws.add(0, 0, 0, ResourceId.Ore, 3);
		const added = ws.add(0, 0, 0, ResourceId.Ore, 5);
		expect(added).toBe(5);
		expect(ws.get(0, 0, 0)?.qty).toBe(8);
	});

	it("rejects different resource type in occupied cell", () => {
		const ws = new WorldState();
		ws.add(0, 0, 0, ResourceId.Ore, 3);
		const added = ws.add(0, 0, 0, ResourceId.Wheat, 2);
		expect(added).toBe(0);
		expect(ws.get(0, 0, 0)?.type).toBe(ResourceId.Ore);
		expect(ws.get(0, 0, 0)?.qty).toBe(3);
	});

	it("caps quantity at MAX_RESOURCE_QTY", () => {
		const ws = new WorldState();
		ws.add(0, 0, 0, ResourceId.Ore, 14);
		const added = ws.add(0, 0, 0, ResourceId.Ore, 5);
		expect(added).toBe(2); // only 2 fits (16 - 14)
		expect(ws.get(0, 0, 0)?.qty).toBe(MAX_RESOURCE_QTY);
	});

	it("clamps initial add to MAX_RESOURCE_QTY", () => {
		const ws = new WorldState();
		const added = ws.add(0, 0, 0, ResourceId.Ore, 20);
		expect(added).toBe(MAX_RESOURCE_QTY);
		expect(ws.get(0, 0, 0)?.qty).toBe(MAX_RESOURCE_QTY);
	});

	it("defaults quantity to 1", () => {
		const ws = new WorldState();
		ws.add(0, 0, 0, ResourceId.Ingot);
		expect(ws.get(0, 0, 0)?.qty).toBe(1);
	});

	it("removes resource from cell", () => {
		const ws = new WorldState();
		ws.add(0, 0, 0, ResourceId.Ore, 5);
		const removed = ws.remove(0, 0, 0, 3);
		expect(removed).toBe(3);
		expect(ws.get(0, 0, 0)?.qty).toBe(2);
	});

	it("removes cell entry when qty reaches zero", () => {
		const ws = new WorldState();
		ws.add(0, 0, 0, ResourceId.Ore, 3);
		ws.remove(0, 0, 0, 3);
		expect(ws.has(0, 0, 0)).toBe(false);
		expect(ws.size).toBe(0);
	});

	it("remove returns 0 from empty cell", () => {
		const ws = new WorldState();
		expect(ws.remove(0, 0, 0, 5)).toBe(0);
	});

	it("remove clamps to available quantity", () => {
		const ws = new WorldState();
		ws.add(0, 0, 0, ResourceId.Wheat, 2);
		const removed = ws.remove(0, 0, 0, 10);
		expect(removed).toBe(2);
		expect(ws.has(0, 0, 0)).toBe(false);
	});

	it("hasType checks specific resource", () => {
		const ws = new WorldState();
		ws.add(1, 0, 2, ResourceId.Bread);
		expect(ws.hasType(1, 0, 2, ResourceId.Bread)).toBe(true);
		expect(ws.hasType(1, 0, 2, ResourceId.Wheat)).toBe(false);
		expect(ws.hasType(0, 0, 0, ResourceId.Bread)).toBe(false);
	});

	it("clear removes a specific cell", () => {
		const ws = new WorldState();
		ws.add(0, 0, 0, ResourceId.Ore, 5);
		ws.add(1, 0, 0, ResourceId.Wheat, 3);
		ws.clear(0, 0, 0);
		expect(ws.has(0, 0, 0)).toBe(false);
		expect(ws.has(1, 0, 0)).toBe(true);
		expect(ws.size).toBe(1);
	});

	it("clearAll removes everything", () => {
		const ws = new WorldState();
		ws.add(0, 0, 0, ResourceId.Ore, 5);
		ws.add(1, 0, 0, ResourceId.Wheat, 3);
		ws.add(2, 0, 0, ResourceId.Ingot, 1);
		ws.clearAll();
		expect(ws.size).toBe(0);
	});

	it("entries iterates all occupied cells", () => {
		const ws = new WorldState();
		ws.add(0, 0, 0, ResourceId.Ore, 5);
		ws.add(3, 0, 1, ResourceId.Wheat, 2);

		const entries = [...ws.entries()];
		expect(entries).toHaveLength(2);

		const sorted = entries.sort((a, b) => a[0] - b[0]);
		expect(sorted[0]).toEqual([0, 0, 0, { type: ResourceId.Ore, qty: 5 }]);
		expect(sorted[1]).toEqual([3, 0, 1, { type: ResourceId.Wheat, qty: 2 }]);
	});

	it("supports multiple cells independently", () => {
		const ws = new WorldState();
		ws.add(0, 0, 0, ResourceId.Ore, 5);
		ws.add(1, 0, 0, ResourceId.Wheat, 3);
		ws.add(2, 0, 0, ResourceId.Ingot, 1);

		expect(ws.get(0, 0, 0)?.type).toBe(ResourceId.Ore);
		expect(ws.get(1, 0, 0)?.type).toBe(ResourceId.Wheat);
		expect(ws.get(2, 0, 0)?.type).toBe(ResourceId.Ingot);
		expect(ws.size).toBe(3);
	});
});

// ─── Recipe Table Tests ───

describe("Recipe table", () => {
	it("has recipes for all basic transformations", () => {
		expect(RECIPES.length).toBe(6);
	});

	it("finds ore → ingot recipe", () => {
		const recipe = findRecipe(ResourceId.Ore);
		expect(recipe).not.toBeNull();
		expect(recipe?.output).toBe(ResourceId.Ingot);
		expect(recipe?.inputQty).toBe(1);
		expect(recipe?.outputQty).toBe(1);
	});

	it("finds wheat → bread recipe (2:1)", () => {
		const recipe = findRecipe(ResourceId.Wheat);
		expect(recipe).not.toBeNull();
		expect(recipe?.output).toBe(ResourceId.Bread);
		expect(recipe?.inputQty).toBe(2);
		expect(recipe?.outputQty).toBe(1);
	});

	it("finds wood → planks recipe (1:2)", () => {
		const recipe = findRecipe(ResourceId.Wood);
		expect(recipe).not.toBeNull();
		expect(recipe?.output).toBe(ResourceId.Planks);
		expect(recipe?.inputQty).toBe(1);
		expect(recipe?.outputQty).toBe(2);
	});

	it("finds crystal shard → lens recipe (2:1)", () => {
		const recipe = findRecipe(ResourceId.CrystalShard);
		expect(recipe).not.toBeNull();
		expect(recipe?.output).toBe(ResourceId.CrystalLens);
		expect(recipe?.inputQty).toBe(2);
		expect(recipe?.outputQty).toBe(1);
	});

	it("finds sand → glass recipe", () => {
		const recipe = findRecipe(ResourceId.Sand);
		expect(recipe).not.toBeNull();
		expect(recipe?.output).toBe(ResourceId.Glass);
	});

	it("finds raw meat → cooked meat recipe", () => {
		const recipe = findRecipe(ResourceId.RawMeat);
		expect(recipe).not.toBeNull();
		expect(recipe?.output).toBe(ResourceId.CookedMeat);
	});

	it("returns null for output resources (no recipe)", () => {
		expect(findRecipe(ResourceId.Ingot)).toBeNull();
		expect(findRecipe(ResourceId.Bread)).toBeNull();
		expect(findRecipe(ResourceId.Planks)).toBeNull();
		expect(findRecipe(ResourceId.Glass)).toBeNull();
	});
});
