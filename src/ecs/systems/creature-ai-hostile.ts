/**
 * Hostile creature AI — Mörker pack coordination.
 * Integrates morker-pack.ts pure math with ECS state.
 * Pattern follows creature-ai-passive.ts.
 */

import type { AnimStateId, BehaviorStateId } from "../traits/index.ts";
import { AnimState, BehaviorState } from "../traits/index.ts";
import type { CreatureEffects } from "./creature-ai.ts";
import type { LightSource } from "./light-sources.ts";
import {
	ALPHA_SPEED_MULT,
	cleanupMorkerState,
	dawnDissolveDamage,
	flankPosition,
	getMorkerState,
	getPackMemberCount,
	lightSourceDamage,
	nearestLightFleeDir,
	nearestLyktgubbe,
	type TargetPos,
} from "./morker-pack.ts";

export { cleanupMorkerState };

interface CreatureUpdateCtx {
	playerX: number;
	playerY: number;
	playerZ: number;
	playerAlive: boolean;
	isDaytime: boolean;
	timeOfDay: number;
}

interface PosRef {
	x: number;
	y: number;
	z: number;
}

interface AiRef {
	aiType: string;
	behaviorState: BehaviorStateId;
	aggroRange: number;
	attackRange: number;
	attackDamage: number;
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

export interface MorkerInfo {
	entityId: number;
	x: number;
	z: number;
}

/**
 * Update a single Mörker with pack-aware AI.
 * Alpha chases directly; flankers move to surround the player.
 * All Mörker flee from torch light and hunt nearby Lyktgubbar.
 */
export function updateMorkerAI(
	pos: PosRef,
	ai: AiRef,
	hp: HpRef,
	anim: AnimRef,
	entityId: number,
	dt: number,
	ctx: CreatureUpdateCtx,
	morkerList: MorkerInfo[],
	lyktgubbar: TargetPos[],
	applyGravity: (hp: HpRef, pos: PosRef, dt: number) => void,
	chase: (pos: PosRef, hp: HpRef, dx: number, dz: number, dist: number, speed: number, dt: number) => void,
	applyDamageToPlayer: (damage: number) => void,
	effects?: CreatureEffects,
	lightSources: LightSource[] = [],
) {
	const dx = ctx.playerX - pos.x;
	const dz = ctx.playerZ - pos.z;
	const dist = Math.sqrt(dx * dx + dz * dz);
	const state = getMorkerState(entityId);

	// Dawn dissolution — extra damage
	const dawnDmg = dawnDissolveDamage(ctx.timeOfDay, dt);
	if (dawnDmg > 0) {
		hp.hp -= dawnDmg;
		effects?.spawnParticles(pos.x, pos.y, pos.z, 0x1a1a2e, 3);
	}

	// Light source damage — continuous DPS within any light radius
	const lsDmg = lightSourceDamage(pos.x, pos.y, pos.z, lightSources, dt);
	if (lsDmg > 0) hp.hp -= lsDmg;

	ai.attackCooldown = Math.max(0, ai.attackCooldown - dt);

	// Attack range — committed to melee, overrides flee
	if (dist <= ai.attackRange && ctx.playerAlive) {
		ai.behaviorState = BehaviorState.Attack;
		if (!ctx.isDaytime) anim.animState = AnimState.Attack;
		if (ai.attackCooldown <= 0) {
			ai.attackCooldown = 1.0;
			applyDamageToPlayer(ai.attackDamage);
		}
		applyGravity(hp, pos, dt);
		return;
	}

	// Flee from light sources when inside any light radius
	const fleeDir = nearestLightFleeDir(pos.x, pos.y, pos.z, lightSources);
	if (fleeDir && !ctx.isDaytime) {
		ai.behaviorState = BehaviorState.Flee;
		anim.animState = AnimState.Flee;
		pos.x += fleeDir.dx * ai.moveSpeed * dt;
		pos.z += fleeDir.dz * ai.moveSpeed * dt;
		applyGravity(hp, pos, dt);
		return;
	}

	// Hunt Lyktgubbar (ecological chain)
	const prey = nearestLyktgubbe(pos.x, pos.z, ctx.playerX, ctx.playerZ, lyktgubbar);
	if (prey && !ctx.isDaytime) {
		const ldx = prey.x - pos.x;
		const ldz = prey.z - pos.z;
		const ldist = Math.sqrt(ldx * ldx + ldz * ldz);
		ai.behaviorState = BehaviorState.Chase;
		anim.animState = AnimState.Chase;
		chase(pos, hp, ldx, ldz, ldist, ai.moveSpeed, dt);
		applyGravity(hp, pos, dt);
		return;
	}

	// Pack-coordinated pursuit
	if (dist <= ai.aggroRange && ctx.playerAlive) {
		ai.behaviorState = BehaviorState.Chase;
		if (!ctx.isDaytime) anim.animState = AnimState.Chase;

		if (state?.isAlpha || !state) {
			// Alpha: direct chase, slightly faster
			const speed = state ? ai.moveSpeed * ALPHA_SPEED_MULT : ai.moveSpeed;
			chase(pos, hp, dx, dz, dist, speed, dt);
		} else {
			// Flanker: move toward flanking position
			const alpha = findAlpha(morkerList, entityId);
			const flankerCount = state ? getPackMemberCount(state.packId) - 1 : 1;
			const target = alpha
				? flankPosition(alpha.x, alpha.z, ctx.playerX, ctx.playerZ, state.flankIndex, flankerCount)
				: { x: ctx.playerX, z: ctx.playerZ };

			const fdx = target.x - pos.x;
			const fdz = target.z - pos.z;
			const fdist = Math.sqrt(fdx * fdx + fdz * fdz);
			chase(pos, hp, fdx, fdz, fdist, ai.moveSpeed, dt);
		}
		applyGravity(hp, pos, dt);
		return;
	}

	// Idle
	ai.behaviorState = BehaviorState.Idle;
	if (!ctx.isDaytime) anim.animState = AnimState.Idle;
	applyGravity(hp, pos, dt);
}

function findAlpha(morkerList: MorkerInfo[], selfId: number): MorkerInfo | undefined {
	for (const m of morkerList) {
		if (m.entityId === selfId) continue;
		const s = getMorkerState(m.entityId);
		if (s?.isAlpha) return m;
	}
	return undefined;
}
