/**
 * Jatten ECS bridge — integrates jatten-boss.ts with ECS state.
 * 8-block tall world boss assembled from terrain blocks.
 */

import type { AnimStateId, BehaviorStateId } from "../traits/index.ts";
import { AnimState, BehaviorState } from "../traits/index.ts";
import type { CreatureEffects, CreatureUpdateContext } from "./creature-ai.ts";
import {
	ATTACK_COOLDOWN,
	ATTACK_DAMAGE,
	consumeBlock,
	getJattenData,
	inAttackRange,
	MOVE_SPEED,
	moveToward,
	REGEN_RANGE,
	STAGGER_DURATION,
	shouldRegen,
} from "./jatten-boss.ts";

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
	maxHp: number;
	velY: number;
}

interface AnimRef {
	animState: AnimStateId;
}

/** Callback to consume a terrain block near the Jatten for regeneration. */
export type ConsumeTerrainFn = (x: number, z: number, range: number) => boolean;

/**
 * Update a single Jatten entity.
 * Phases: approach → attack → regen → stagger (cyclical).
 */
export function updateJattenAI(
	pos: PosRef,
	ai: AiRef,
	hp: HpRef,
	anim: AnimRef,
	entityId: number,
	dt: number,
	ctx: CreatureUpdateContext,
	applyGravity: (hp: HpRef, pos: PosRef, dt: number) => void,
	applyDamageToPlayer: (damage: number) => void,
	consumeTerrain: ConsumeTerrainFn,
	effects?: CreatureEffects,
): void {
	const data = getJattenData(entityId);
	if (!data) return;

	// Tick cooldowns
	ai.attackCooldown = Math.max(0, ai.attackCooldown - dt);
	data.regenCooldown = Math.max(0, data.regenCooldown - dt);

	// Stagger phase — exposed core, can't move or attack
	if (data.phase === "stagger") {
		data.staggerTimer -= dt;
		ai.behaviorState = BehaviorState.Idle;
		anim.animState = AnimState.Idle;
		if (data.staggerTimer <= 0) {
			data.phase = "approach";
		}
		applyGravity(hp, pos, dt);
		return;
	}

	// Regen phase — pull blocks from terrain to heal
	if (data.phase === "regen") {
		if (shouldRegen(entityId, hp.hp, hp.maxHp)) {
			const consumed = consumeTerrain(pos.x, pos.z, REGEN_RANGE);
			if (consumed) {
				const healed = consumeBlock(entityId);
				hp.hp = Math.min(hp.maxHp, hp.hp + healed);
				effects?.spawnParticles(pos.x, pos.y + 4, pos.z, 0x6b6b6b, 8);
			}
		}
		data.phase = "approach";
		applyGravity(hp, pos, dt);
		return;
	}

	// Attack phase — swing at player when in range
	if (inAttackRange(pos.x, pos.z, ctx.playerX, ctx.playerZ)) {
		data.phase = "attack";
		ai.behaviorState = BehaviorState.Attack;
		anim.animState = AnimState.Attack;

		if (ai.attackCooldown <= 0 && ctx.playerAlive) {
			applyDamageToPlayer(ATTACK_DAMAGE);
			ai.attackCooldown = ATTACK_COOLDOWN;
			effects?.spawnParticles(ctx.playerX, ctx.playerY, ctx.playerZ, 0x6b6b6b, 12);
		}

		applyGravity(hp, pos, dt);
		return;
	}

	// Approach phase — move toward player
	data.phase = "approach";
	ai.behaviorState = BehaviorState.Chase;
	anim.animState = AnimState.Chase;

	const move = moveToward(pos.x, pos.z, ctx.playerX, ctx.playerZ, MOVE_SPEED, dt);
	pos.x += move.dx;
	pos.z += move.dz;

	// Attempt regen while approaching if hurt
	if (shouldRegen(entityId, hp.hp, hp.maxHp)) {
		data.phase = "regen";
	}

	applyGravity(hp, pos, dt);
}

/**
 * Trigger stagger from external damage accumulation.
 */
export function triggerStagger(entityId: number): void {
	const data = getJattenData(entityId);
	if (!data) return;
	data.phase = "stagger";
	data.staggerTimer = STAGGER_DURATION;
}
