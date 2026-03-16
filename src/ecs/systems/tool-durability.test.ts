import { describe, expect, it } from "vitest";
import {
	COMBAT_DRAIN_COOLDOWN,
	drainDurability,
	getMaxDurability,
	getTierDurability,
	getToolTier,
	isTool,
	ToolTier,
} from "./tool-durability.ts";

describe("tool-durability data", () => {
	it("identifies tool items correctly", () => {
		expect(isTool(101)).toBe(true); // Wood Axe
		expect(isTool(102)).toBe(true); // Wood Pickaxe
		expect(isTool(103)).toBe(true); // Stone Pickaxe
		expect(isTool(104)).toBe(true); // Stone Sword
	});

	it("rejects non-tool items", () => {
		expect(isTool(201)).toBe(false); // Raw Meat
		expect(isTool(202)).toBe(false); // Cooked Meat
		expect(isTool(0)).toBe(false);
		expect(isTool(999)).toBe(false);
	});

	it("returns correct tier for each tool", () => {
		expect(getToolTier(101)).toBe(ToolTier.Wood);
		expect(getToolTier(102)).toBe(ToolTier.Wood);
		expect(getToolTier(103)).toBe(ToolTier.Stone);
		expect(getToolTier(104)).toBe(ToolTier.Stone);
	});

	it("returns undefined tier for non-tools", () => {
		expect(getToolTier(201)).toBeUndefined();
		expect(getToolTier(0)).toBeUndefined();
	});

	it("returns correct max durability per tier", () => {
		expect(getMaxDurability(101)).toBe(50); // Wood → 50
		expect(getMaxDurability(102)).toBe(50); // Wood → 50
		expect(getMaxDurability(103)).toBe(150); // Stone → 150
		expect(getMaxDurability(104)).toBe(150); // Stone → 150
	});

	it("returns undefined max durability for non-tools", () => {
		expect(getMaxDurability(201)).toBeUndefined();
		expect(getMaxDurability(0)).toBeUndefined();
	});

	it("returns tier durability by tier ID", () => {
		expect(getTierDurability(ToolTier.Wood)).toBe(50);
		expect(getTierDurability(ToolTier.Stone)).toBe(150);
		expect(getTierDurability(ToolTier.Iron)).toBe(500);
		expect(getTierDurability(ToolTier.Crystal)).toBe(1000);
	});
});

describe("drainDurability", () => {
	it("decrements durability by 1", () => {
		const slot = { durability: 10 };
		const broke = drainDurability(slot);
		expect(broke).toBe(false);
		expect(slot.durability).toBe(9);
	});

	it("returns true when tool breaks (reaches 0)", () => {
		const slot = { durability: 1 };
		const broke = drainDurability(slot);
		expect(broke).toBe(true);
		expect(slot.durability).toBe(0);
	});

	it("returns false for slots without durability", () => {
		const slot = { durability: undefined };
		const broke = drainDurability(slot);
		expect(broke).toBe(false);
	});

	it("returns false for slots with no durability field", () => {
		const slot = {};
		const broke = drainDurability(slot);
		expect(broke).toBe(false);
	});

	it("drains to zero from full wood durability after 50 drains", () => {
		const slot = { durability: 50 };
		for (let i = 0; i < 49; i++) {
			expect(drainDurability(slot)).toBe(false);
		}
		expect(drainDurability(slot)).toBe(true);
		expect(slot.durability).toBe(0);
	});
});

describe("constants", () => {
	it("combat drain cooldown is 1 second", () => {
		expect(COMBAT_DRAIN_COOLDOWN).toBe(1.0);
	});
});
