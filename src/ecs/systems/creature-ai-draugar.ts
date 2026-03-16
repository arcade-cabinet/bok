/**
 * Draugar ECS bridge — integrates draugar-gaze.ts with ECS state.
 * Spectral humanoids that advance only when unobserved.
 */

import type { AnimStateId, BehaviorStateId } from "../traits/index.ts";
import { AnimState, BehaviorState } from "../traits/index.ts";
import type { CreatureEffects, CreatureUpdateContext } from "./creature-ai.ts";
import { ADVANCE_SPEED, CONTACT_DAMAGE, getDraugarData, inContactRange, isDawn, isObserved } from "./draugar-gaze.ts";

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
}

/**
 * Update a single Draugar entity.
 * Observed = freeze. Unobserved = advance. Dawn = teleport home.
 */
export function updateDraugarAI(
	pos: PosRef,
	ai: AiRef,
	hp: HpRef,
	anim: AnimRef,
	entityId: number,
	dt: number,
	ctx: CreatureUpdateContext,
	applyGravity: (hp: HpRef, pos: PosRef, dt: number) => void,
	applyDamageToPlayer: (damage: number) => void,
	effects?: CreatureEffects,
): void {
	const data = getDraugarData(entityId);
	if (!data) return;

	// Dawn teleport back to mound
	if (isDawn(ctx.timeOfDay)) {
		pos.x = data.moundX;
		pos.y = data.moundY;
		pos.z = data.moundZ;
		effects?.spawnParticles(pos.x, pos.y, pos.z, 0xaaccee, 5);
		// Mark for despawn by setting hp to 0
		hp.hp = 0;
		return;
	}

	ai.attackCooldown = Math.max(0, ai.attackCooldown - dt);

	// Observation check
	const observed = isObserved(ctx.playerX, ctx.playerZ, ctx.playerYaw, pos.x, pos.z);
	data.frozen = observed;

	if (observed) {
		// Frozen — appear as standing stone
		ai.behaviorState = BehaviorState.Idle;
		anim.animState = AnimState.Idle;
		applyGravity(hp, pos, dt);
		return;
	}

	// Contact damage
	if (inContactRange(pos.x, pos.z, ctx.playerX, ctx.playerZ) && ctx.playerAlive && ai.attackCooldown <= 0) {
		ai.behaviorState = BehaviorState.Attack;
		anim.animState = AnimState.Attack;
		ai.attackCooldown = 1.5;
		applyDamageToPlayer(CONTACT_DAMAGE);
		effects?.spawnParticles(pos.x, pos.y, pos.z, 0xaaccee, 8);
		applyGravity(hp, pos, dt);
		return;
	}

	// Advance toward player (unobserved)
	if (ctx.playerAlive) {
		ai.behaviorState = BehaviorState.Chase;
		anim.animState = AnimState.Chase;
		const dx = ctx.playerX - pos.x;
		const dz = ctx.playerZ - pos.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist > 0.1) {
			const inv = (ADVANCE_SPEED * dt) / dist;
			pos.x += dx * inv;
			pos.z += dz * inv;
		}
	}

	applyGravity(hp, pos, dt);
}
