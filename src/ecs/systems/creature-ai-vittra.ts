/**
 * Vittra ECS bridge — integrates vittra-debuff.ts with ECS state.
 * Small underground folk that inflict otur debuffs when aggravated.
 */

import type { AnimStateId, BehaviorStateId } from "../traits/index.ts";
import { AnimState, BehaviorState } from "../traits/index.ts";
import type { CreatureEffects, CreatureUpdateContext } from "./creature-ai.ts";
import {
	getVittraData,
	HOVER_SPEED,
	inDebuffRange,
	ORBIT_SPEED,
	orbitPosition,
	shouldRetreat,
} from "./vittra-debuff.ts";

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
 * Update a single Vittra entity.
 * Passive until aggravated → orbit player inflicting otur debuffs.
 * Retreat at dawn. Appeased = despawn.
 */
export function updateVittraAI(
	pos: PosRef,
	ai: AiRef,
	hp: HpRef,
	anim: AnimRef,
	entityId: number,
	dt: number,
	ctx: CreatureUpdateContext,
	applyOturDebuff: () => void,
	effects?: CreatureEffects,
): void {
	const data = getVittraData(entityId);
	if (!data) return;

	// Appeased → despawn with particles
	if (data.appeased) {
		effects?.spawnParticles(pos.x, pos.y, pos.z, 0x3a5a40, 10);
		hp.hp = 0;
		return;
	}

	// Dawn retreat → despawn
	if (shouldRetreat(ctx.timeOfDay)) {
		pos.x = data.moundX;
		pos.y = data.moundY;
		pos.z = data.moundZ;
		effects?.spawnParticles(pos.x, pos.y, pos.z, 0x6b6b6b, 5);
		hp.hp = 0;
		return;
	}

	if (!data.aggravated) {
		// Passive — hover near mound
		ai.behaviorState = BehaviorState.Idle;
		anim.animState = AnimState.Idle;
		const dx = data.moundX - pos.x;
		const dz = data.moundZ - pos.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist > 2) {
			pos.x += (dx / dist) * HOVER_SPEED * 0.3 * dt;
			pos.z += (dz / dist) * HOVER_SPEED * 0.3 * dt;
		}
		return;
	}

	// Aggravated — orbit player and inflict debuffs
	data.orbitAngle += ORBIT_SPEED * dt;
	const target = orbitPosition(ctx.playerX, ctx.playerZ, data.orbitAngle);

	const dx = target.x - pos.x;
	const dz = target.z - pos.z;
	const dist = Math.sqrt(dx * dx + dz * dz);
	if (dist > 0.1) {
		const speed = Math.min(HOVER_SPEED, dist / dt);
		pos.x += (dx / dist) * speed * dt;
		pos.z += (dz / dist) * speed * dt;
	}

	// Float at player head height
	const targetY = ctx.playerY + 0.5;
	pos.y += (targetY - pos.y) * 2 * dt;

	ai.behaviorState = BehaviorState.Chase;
	anim.animState = AnimState.Chase;

	// Apply otur debuff when in range
	if (inDebuffRange(pos.x, pos.z, ctx.playerX, ctx.playerZ) && ctx.playerAlive) {
		applyOturDebuff();
	}
}
