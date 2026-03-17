// ─── Eating System ───
// Consumes food from the active hotbar slot when wantsEat is flagged.
// Removes 1 food item from inventory and restores hunger proportionally.

import type { World } from "koota";
import { removeItem } from "../inventory.ts";
import { Hotbar, Hunger, Inventory, PlayerState, PlayerTag } from "../traits/index.ts";
import { getFoodRestore, isFood } from "./food.ts";

/**
 * Resolve the item ID for the active hotbar slot.
 * Returns the numeric ID or null if the slot is empty.
 */
function activeSlotId(hotbar: { slots: ({ id: number } | null)[]; activeSlot: number }): number | null {
	const slot = hotbar.slots[hotbar.activeSlot];
	return slot ? slot.id : null;
}

export function eatingSystem(world: World, _dt: number) {
	world.query(PlayerTag, PlayerState, Hotbar, Inventory, Hunger).updateEach(([state, hotbar, inv, hunger]) => {
		if (!state.wantsEat) return;
		state.wantsEat = false;

		const id = activeSlotId(hotbar);
		if (id === null || !isFood(id)) return;

		// Check inventory has the food item
		const removed = removeItem(inv, id, 1);
		if (removed === 0) return;

		const restore = getFoodRestore(id);
		hunger.current = Math.min(hunger.max, hunger.current + restore);
	});
}
