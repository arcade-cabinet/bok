/**
 * Runväktare ECS bridge — integrates runvaktare-ai.ts with ECS state.
 * Dormant sentinels that activate when ruin blocks are mined nearby.
 */

import type { AnimStateId, BehaviorStateId } from "../traits/index.ts";
import { AnimState, BehaviorState } from "../traits/index.ts";
import type { CreatureEffects, CreatureUpdateContext } from "./creature-ai.ts";
import {
	activate,
	atPost,
	canSlam,
	GLIDE_SPEED,
	getRunvaktareData,
	moveToward,
	RETURN_SPEED,
	RunvaktareState,
	SLAM_COOLDOWN,
	SLAM_DAMAGE,
	shouldReturn,
} from "./runvaktare-ai.ts";

interface PosRef {
	x: number;
	y: number;
	z: number;
}

interface AiRef {
	behaviorState: BehaviorStateId;
	attackCooldown: number;
	moveSpeed: number;
}

interface HpRef {
	hp: number;
	velY: number;
}

interface AnimRef {
	animState: AnimStateId;
}

/**
 * Update a single Runväktare entity.
 * Dormant → Active (when ruin mined) → Attack/Chase → Returning → Dormant.
 */
export function updateRunvaktareAI(
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
	const data = getRunvaktareData(entityId);
	if (!data) return;

	data.slamCooldown = Math.max(0, data.slamCooldown - dt);

	// Dormant — do nothing, appear as scenery
	if (data.state === RunvaktareState.Dormant) {
		ai.behaviorState = BehaviorState.Idle;
		anim.animState = AnimState.Idle;
		applyGravity(hp, pos, dt);
		return;
	}

	// Returning — glide back to post
	if (data.state === RunvaktareState.Returning) {
		ai.behaviorState = BehaviorState.Idle;
		anim.animState = AnimState.Walk;
		const move = moveToward(pos.x, pos.z, data.postX, data.postZ, RETURN_SPEED, dt);
		pos.x += move.dx;
		pos.z += move.dz;
		if (atPost(pos.x, pos.z, data.postX, data.postZ)) {
			data.state = RunvaktareState.Dormant;
			anim.animState = AnimState.Idle;
		}
		applyGravity(hp, pos, dt);
		return;
	}

	// Active — pursue and attack player
	if (shouldReturn(data.postX, data.postZ, ctx.playerX, ctx.playerZ)) {
		data.state = RunvaktareState.Returning;
		applyGravity(hp, pos, dt);
		return;
	}

	// Slam attack
	if (canSlam(pos.x, pos.z, ctx.playerX, ctx.playerZ, data.slamCooldown) && ctx.playerAlive) {
		ai.behaviorState = BehaviorState.Attack;
		anim.animState = AnimState.Attack;
		data.slamCooldown = SLAM_COOLDOWN;
		applyDamageToPlayer(SLAM_DAMAGE);
		effects?.spawnParticles(pos.x, pos.y, pos.z, 0x6b6b6b, 10);
		applyGravity(hp, pos, dt);
		return;
	}

	// Chase player
	if (ctx.playerAlive) {
		ai.behaviorState = BehaviorState.Chase;
		anim.animState = AnimState.Chase;
		const move = moveToward(pos.x, pos.z, ctx.playerX, ctx.playerZ, GLIDE_SPEED, dt);
		pos.x += move.dx;
		pos.z += move.dz;
	}

	applyGravity(hp, pos, dt);
}

/**
 * Notify all dormant Runväktare near a mined ruin block.
 * Called when a RuneStone block is broken.
 */
export function notifyRuneMined(runvaktareIds: number[], mineX: number, mineZ: number): void {
	for (const entityId of runvaktareIds) {
		const data = getRunvaktareData(entityId);
		if (!data || data.state !== RunvaktareState.Dormant) continue;
		const dx = mineX - data.postX;
		const dz = mineZ - data.postZ;
		if (dx * dx + dz * dz <= 8 * 8) {
			activate(entityId);
		}
	}
}
