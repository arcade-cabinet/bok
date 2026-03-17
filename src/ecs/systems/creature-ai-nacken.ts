/**
 * Nacken ECS bridge — integrates nacken-aura.ts with ECS state.
 * Water spirit that disorients approaching players and teaches runes.
 */

import type { AnimStateId, BehaviorStateId } from "../traits/index.ts";
import { AnimState, BehaviorState } from "../traits/index.ts";
import type { CreatureEffects, CreatureUpdateContext } from "./creature-ai.ts";
import { AURA_COOLDOWN, DISORIENT_DURATION, getNackenData, inAuraRange } from "./nacken-aura.ts";

interface PosRef {
	x: number;
	y: number;
	z: number;
}

interface AiRef {
	behaviorState: BehaviorStateId;
	attackCooldown: number;
}

interface HpRef {
	hp: number;
	velY: number;
}

interface AnimRef {
	animState: AnimStateId;
	animTimer: number;
}

/**
 * Disorientation callback: applies camera sway + reversed controls.
 */
export type DisorientFn = (duration: number) => void;

/**
 * Update a single Nacken entity.
 * Sits on rock. Disorients approaching players. Teaches rune for iron offering.
 */
export function updateNackenAI(
	pos: PosRef,
	ai: AiRef,
	hp: HpRef,
	anim: AnimRef,
	entityId: number,
	dt: number,
	ctx: CreatureUpdateContext,
	applyDisorient: DisorientFn,
	effects?: CreatureEffects,
): void {
	const data = getNackenData(entityId);
	if (!data) return;

	// Nacken stays seated on its rock
	pos.x = data.seatX;
	pos.y = data.seatY;
	pos.z = data.seatZ;
	hp.velY = 0;

	// Cooldown tick
	data.disorientCooldown = Math.max(0, data.disorientCooldown - dt);

	// Idle "playing" animation
	ai.behaviorState = BehaviorState.Idle;
	anim.animState = AnimState.Idle;
	anim.animTimer += dt;

	// Check aura range for disorientation
	if (inAuraRange(pos.x, pos.z, ctx.playerX, ctx.playerZ) && ctx.playerAlive) {
		if (data.disorientCooldown <= 0) {
			applyDisorient(DISORIENT_DURATION);
			data.disorientCooldown = AURA_COOLDOWN;
			effects?.spawnParticles(pos.x, pos.y, pos.z, 0x44aaaa, 15);
		}
	}
}
