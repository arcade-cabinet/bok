import { createWorld } from "koota";
import { describe, expect, test } from "vitest";
import { Health, Hotbar, Inventory, PlayerState, PlayerTag } from "../traits/index.ts";
import { Equipment, type EquipmentSlots } from "./equipment.ts";

/** Helper to build a world with a player that has equipment. */
function setupWorld(slots?: Partial<EquipmentSlots>) {
	const world = createWorld();
	world.spawn(
		PlayerTag,
		Health,
		Inventory,
		Hotbar,
		PlayerState,
		Equipment({
			head: slots?.head ?? null,
			chest: slots?.chest ?? null,
			legs: slots?.legs ?? null,
			accessory: slots?.accessory ?? null,
		}),
	);
	return world;
}

describe("Equipment trait", () => {
	test("default equipment has all null slots", () => {
		const world = createWorld();
		world.spawn(PlayerTag, Equipment);
		let slots: EquipmentSlots | null = null;
		world.query(PlayerTag, Equipment).readEach(([eq]) => {
			slots = { head: eq.head, chest: eq.chest, legs: eq.legs, accessory: eq.accessory };
		});
		expect(slots).toEqual({ head: null, chest: null, legs: null, accessory: null });
	});

	test("equipment slots accept item IDs", () => {
		const world = setupWorld({ head: 401, chest: 402 });
		let head: number | null = null;
		let chest: number | null = null;
		world.query(PlayerTag, Equipment).readEach(([eq]) => {
			head = eq.head;
			chest = eq.chest;
		});
		expect(head).toBe(401);
		expect(chest).toBe(402);
	});
});

describe("Armor reduction", () => {
	test("getTotalArmorReduction sums equipped armor values", async () => {
		const { getTotalArmorReduction, ARMOR_ITEMS } = await import("./equipment.ts");
		// Equip head + chest
		const slots: EquipmentSlots = { head: 401, chest: 402, legs: null, accessory: null };
		const reduction = getTotalArmorReduction(slots);
		const expected = (ARMOR_ITEMS[401]?.armor ?? 0) + (ARMOR_ITEMS[402]?.armor ?? 0);
		expect(reduction).toBe(expected);
		expect(reduction).toBeGreaterThan(0);
	});

	test("getTotalArmorReduction returns 0 with no armor", async () => {
		const { getTotalArmorReduction } = await import("./equipment.ts");
		const slots: EquipmentSlots = { head: null, chest: null, legs: null, accessory: null };
		expect(getTotalArmorReduction(slots)).toBe(0);
	});

	test("armor cannot reduce damage below 1", async () => {
		const { applyArmorReduction } = await import("./equipment.ts");
		// Even with 100 armor, 5 damage should still deal at least 1
		expect(applyArmorReduction(5, 100)).toBe(1);
	});

	test("armor applies flat reduction", async () => {
		const { applyArmorReduction } = await import("./equipment.ts");
		expect(applyArmorReduction(20, 5)).toBe(15);
		expect(applyArmorReduction(20, 0)).toBe(20);
	});
});

describe("Armor items", () => {
	test("all four creature armors exist in ARMOR_ITEMS", async () => {
		const { ARMOR_ITEMS } = await import("./equipment.ts");
		// Näcken Shell Plate (head), Lindorm Scale Mail (chest),
		// Mörker Cloak (legs), Runväktare Runeguard (accessory)
		expect(Object.keys(ARMOR_ITEMS).length).toBeGreaterThanOrEqual(4);
		for (const item of Object.values(ARMOR_ITEMS)) {
			expect(item.armor).toBeGreaterThan(0);
			expect(["head", "chest", "legs", "accessory"]).toContain(item.slot);
		}
	});

	test("armor items are registered in ITEMS", async () => {
		const { ITEMS } = await import("../../world/blocks.ts");
		const { ARMOR_ITEMS } = await import("./equipment.ts");
		for (const id of Object.keys(ARMOR_ITEMS)) {
			expect(ITEMS[Number(id)]).toBeDefined();
			expect(ITEMS[Number(id)].type).toBe("armor");
		}
	});
});

describe("Armor recipes", () => {
	test("all four armor recipes exist at tier 2 (Forge)", async () => {
		const { RECIPES } = await import("../../world/blocks.ts");
		const armorRecipes = RECIPES.filter((r) => r.id.startsWith("armor_"));
		expect(armorRecipes.length).toBe(4);
		for (const r of armorRecipes) {
			expect(r.tier).toBe(2);
			expect(r.result.type).toBe("item");
		}
	});
});
