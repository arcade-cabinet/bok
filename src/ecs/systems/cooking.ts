// ─── Cooking System ───
// Manages timer-based food transformation. When the player starts cooking
// (raw food near a torch), the timer ticks down. On completion, the cooked
// result is added to inventory.

import type { World } from "koota";
import { addItem } from "../inventory.ts";
import { CookingState, Inventory, PlayerTag } from "../traits/index.ts";

export function cookingSystem(world: World, dt: number) {
	world.query(PlayerTag, CookingState, Inventory).updateEach(([cooking, inv]) => {
		if (!cooking.active) return;

		cooking.timer -= dt;
		if (cooking.timer <= 0) {
			addItem(inv, cooking.resultId, 1);
			cooking.active = false;
			cooking.timer = 0;
			cooking.inputId = 0;
			cooking.resultId = 0;
		}
	});
}

/**
 * Begin a cooking operation. Called from game bridge when the player
 * interacts with a torch while holding cookable food.
 * Returns true if cooking started successfully.
 */
export function startCooking(
	cooking: { active: boolean; timer: number; inputId: number; resultId: number },
	inputId: number,
	resultId: number,
	cookTime: number,
): boolean {
	if (cooking.active) return false;
	cooking.active = true;
	cooking.timer = cookTime;
	cooking.inputId = inputId;
	cooking.resultId = resultId;
	return true;
}
