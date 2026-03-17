/**
 * Equipment system — armor slots and damage reduction.
 * Each armor piece provides flat damage reduction.
 * Creature drops → armor crafting → progression loop.
 */

import type { EquipmentSlots } from "../traits/index.ts";

export type { EquipmentSlots } from "../traits/index.ts";
// Re-export trait for convenience (test imports)
export { Equipment } from "../traits/index.ts";

// ─── Armor Slot Type ───

export type ArmorSlot = "head" | "chest" | "legs" | "accessory";

// ─── Armor Item Definitions ───

export interface ArmorItemDef {
	name: string;
	slot: ArmorSlot;
	/** Flat damage reduction per hit. */
	armor: number;
	color: string;
}

/**
 * Armor item registry. IDs 401–404 reserved for armor.
 * Each piece corresponds to a creature-drop crafting chain:
 *   Näcken → Shell Plate (head)
 *   Lindorm → Scale Mail (chest)
 *   Mörker → Cloak (legs)
 *   Runväktare → Runeguard (accessory)
 */
export const ARMOR_ITEMS: Record<number, ArmorItemDef> = {
	401: { name: "Näcken Shell Plate", slot: "head", armor: 4, color: "#5a8a7a" },
	402: { name: "Lindorm Scale Mail", slot: "chest", armor: 6, color: "#4a6a3a" },
	403: { name: "Mörker Cloak", slot: "legs", armor: 3, color: "#2a2a3e" },
	404: { name: "Runväktare Runeguard", slot: "accessory", armor: 5, color: "#6a5a4a" },
};

// ─── Armor Math ───

/**
 * Sum total armor reduction from all equipped pieces.
 * Looks up each non-null slot in ARMOR_ITEMS.
 */
export function getTotalArmorReduction(slots: EquipmentSlots): number {
	let total = 0;
	const ids = [slots.head, slots.chest, slots.legs, slots.accessory];
	for (const id of ids) {
		if (id !== null && ARMOR_ITEMS[id]) {
			total += ARMOR_ITEMS[id].armor;
		}
	}
	return total;
}

/**
 * Apply flat armor reduction to incoming damage.
 * Damage is always at least 1 (armor can never fully negate).
 */
export function applyArmorReduction(rawDamage: number, armorValue: number): number {
	return Math.max(1, rawDamage - armorValue);
}
