import { describe, expect, it } from "vitest";
import {
	addItem,
	canAfford,
	deductCost,
	deserializeInventory,
	getItemCount,
	hasItem,
	type InventoryData,
	inventoryCount,
	isFull,
	removeItem,
	serializeInventory,
} from "./inventory.ts";

function emptyInventory(capacity = 256): InventoryData {
	return { items: {}, capacity };
}

describe("inventoryCount", () => {
	it("returns 0 for empty inventory", () => {
		expect(inventoryCount(emptyInventory())).toBe(0);
	});

	it("sums all item counts", () => {
		const inv = emptyInventory();
		inv.items[1] = 5;
		inv.items[2] = 3;
		inv.items[100] = 10;
		expect(inventoryCount(inv)).toBe(18);
	});
});

describe("getItemCount", () => {
	it("returns 0 for missing item", () => {
		expect(getItemCount(emptyInventory(), 42)).toBe(0);
	});

	it("returns count for existing item", () => {
		const inv = emptyInventory();
		inv.items[4] = 7;
		expect(getItemCount(inv, 4)).toBe(7);
	});
});

describe("hasItem", () => {
	it("returns false when item missing", () => {
		expect(hasItem(emptyInventory(), 1)).toBe(false);
	});

	it("returns true when item has enough", () => {
		const inv = emptyInventory();
		inv.items[1] = 5;
		expect(hasItem(inv, 1, 5)).toBe(true);
	});

	it("returns false when not enough", () => {
		const inv = emptyInventory();
		inv.items[1] = 2;
		expect(hasItem(inv, 1, 3)).toBe(false);
	});
});

describe("isFull", () => {
	it("returns false for empty inventory", () => {
		expect(isFull(emptyInventory(10))).toBe(false);
	});

	it("returns true when at capacity", () => {
		const inv = emptyInventory(5);
		inv.items[1] = 5;
		expect(isFull(inv)).toBe(true);
	});

	it("returns true when adding would exceed capacity", () => {
		const inv = emptyInventory(5);
		inv.items[1] = 4;
		expect(isFull(inv, 2)).toBe(true);
	});
});

describe("addItem", () => {
	it("adds items to empty inventory", () => {
		const inv = emptyInventory();
		const added = addItem(inv, 4, 3);
		expect(added).toBe(3);
		expect(inv.items[4]).toBe(3);
	});

	it("stacks with existing items", () => {
		const inv = emptyInventory();
		inv.items[4] = 2;
		addItem(inv, 4, 3);
		expect(inv.items[4]).toBe(5);
	});

	it("clamps to capacity", () => {
		const inv = emptyInventory(5);
		inv.items[1] = 3;
		const added = addItem(inv, 2, 5);
		expect(added).toBe(2);
		expect(inv.items[2]).toBe(2);
	});

	it("returns 0 when full", () => {
		const inv = emptyInventory(3);
		inv.items[1] = 3;
		const added = addItem(inv, 2, 1);
		expect(added).toBe(0);
		expect(inv.items[2]).toBeUndefined();
	});

	it("defaults to amount=1", () => {
		const inv = emptyInventory();
		addItem(inv, 9);
		expect(inv.items[9]).toBe(1);
	});
});

describe("removeItem", () => {
	it("removes items", () => {
		const inv = emptyInventory();
		inv.items[4] = 5;
		const removed = removeItem(inv, 4, 3);
		expect(removed).toBe(3);
		expect(inv.items[4]).toBe(2);
	});

	it("cleans up zero entries", () => {
		const inv = emptyInventory();
		inv.items[4] = 2;
		removeItem(inv, 4, 2);
		expect(inv.items[4]).toBeUndefined();
		expect(4 in inv.items).toBe(false);
	});

	it("returns actual amount removed when not enough", () => {
		const inv = emptyInventory();
		inv.items[4] = 1;
		const removed = removeItem(inv, 4, 5);
		expect(removed).toBe(1);
	});

	it("returns 0 for missing item", () => {
		expect(removeItem(emptyInventory(), 99, 1)).toBe(0);
	});
});

describe("canAfford", () => {
	it("returns true when all costs met", () => {
		const inv = emptyInventory();
		inv.items[4] = 3;
		inv.items[3] = 5;
		expect(canAfford(inv, { 4: 2, 3: 4 })).toBe(true);
	});

	it("returns false when one cost not met", () => {
		const inv = emptyInventory();
		inv.items[4] = 1;
		expect(canAfford(inv, { 4: 2 })).toBe(false);
	});

	it("returns true for empty cost", () => {
		expect(canAfford(emptyInventory(), {})).toBe(true);
	});
});

describe("deductCost", () => {
	it("deducts costs and returns true", () => {
		const inv = emptyInventory();
		inv.items[4] = 5;
		inv.items[3] = 10;
		const ok = deductCost(inv, { 4: 2, 3: 3 });
		expect(ok).toBe(true);
		expect(inv.items[4]).toBe(3);
		expect(inv.items[3]).toBe(7);
	});

	it("returns false and does not deduct when cannot afford", () => {
		const inv = emptyInventory();
		inv.items[4] = 1;
		const ok = deductCost(inv, { 4: 5 });
		expect(ok).toBe(false);
		expect(inv.items[4]).toBe(1);
	});
});

describe("serialization round-trip", () => {
	it("round-trips an inventory", () => {
		const inv = emptyInventory(128);
		inv.items[4] = 10;
		inv.items[9] = 3;
		inv.items[101] = 1;

		const json = serializeInventory(inv);
		const restored = deserializeInventory(json);

		expect(restored.capacity).toBe(128);
		expect(restored.items[4]).toBe(10);
		expect(restored.items[9]).toBe(3);
		expect(restored.items[101]).toBe(1);
		expect(Object.keys(restored.items)).toHaveLength(3);
	});

	it("handles empty inventory", () => {
		const inv = emptyInventory();
		const json = serializeInventory(inv);
		const restored = deserializeInventory(json);
		expect(restored.items).toEqual({});
		expect(restored.capacity).toBe(256);
	});

	it("falls back on invalid JSON", () => {
		const restored = deserializeInventory("not json");
		expect(restored.items).toEqual({});
		expect(restored.capacity).toBe(256);
	});

	it("strips zero-count entries on deserialize", () => {
		const json = JSON.stringify({ items: { 4: 0, 9: 5 }, capacity: 100 });
		const restored = deserializeInventory(json);
		expect(restored.items[4]).toBeUndefined();
		expect(restored.items[9]).toBe(5);
	});

	it("uses default capacity when missing", () => {
		const json = JSON.stringify({ items: { 4: 1 } });
		const restored = deserializeInventory(json, 64);
		expect(restored.capacity).toBe(64);
	});
});
