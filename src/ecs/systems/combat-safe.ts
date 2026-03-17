/**
 * Combat-safe check — determines if it's safe to auto-save.
 * Saves should not fire while a creature is actively chasing or
 * attacking the player, as the snapshot may capture a "dying" state.
 *
 * Pure ECS read — no Three.js, React, or side effects.
 */

import type { World } from "koota";
import { BehaviorState, CreatureAI, CreatureTag, Health, PlayerTag } from "../traits/index.ts";

/**
 * Returns true if any creature is in an active combat state
 * (Chase or Attack) targeting the player entity.
 */
export function isInActiveCombat(world: World): boolean {
	// Find the player entity ID via readEach (entity is 2nd callback arg)
	let playerEntity = -1;
	world.query(PlayerTag, Health).readEach(([_health], entity) => {
		playerEntity = entity.id();
	});

	if (playerEntity < 0) return false;

	let inCombat = false;
	world.query(CreatureTag, CreatureAI).readEach(([ai]) => {
		if (inCombat) return;
		const isAggressive = ai.behaviorState === BehaviorState.Chase || ai.behaviorState === BehaviorState.Attack;
		if (isAggressive && ai.targetEntity === playerEntity) {
			inCombat = true;
		}
	});

	return inCombat;
}
