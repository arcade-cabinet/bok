/**
 * Lindorm ECS bridge — integrates lindorm-tunnel.ts with ECS state.
 * Segmented wyrm that tunnels underground and breaches near the player.
 * Removes soft blocks to create permanent tunnels (environmental storytelling).
 */

import type { AnimStateId, BehaviorStateId } from "../traits/index.ts";
import { AnimState, BehaviorState } from "../traits/index.ts";
import type { CreatureEffects, CreatureUpdateContext } from "./creature-ai.ts";
import {
	attractedByMining,
	BREACH_DAMAGE,
	BREACH_DURATION,
	BREACH_SPEED,
	breachArcXZ,
	breachArcY,
	breachHitsPlayer,
	collectTunnelBlocks,
	getLindormData,
	LindormPhase,
	nearTarget,
	TUNNEL_DURATION,
	TUNNEL_SPEED,
	tunnelToward,
} from "./lindorm-tunnel.ts";

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
 * Update a single Lindorm entity.
 * Phase cycle: Underground → Breaching → Diving → Underground.
 */
export function updateLindormAI(
	pos: PosRef,
	ai: AiRef,
	_hp: HpRef,
	anim: AnimRef,
	entityId: number,
	dt: number,
	ctx: CreatureUpdateContext,
	surfaceYAt: (x: number, z: number) => number,
	applyDamageToPlayer: (damage: number) => void,
	effects?: CreatureEffects,
	getBlock?: (x: number, y: number, z: number) => number,
): void {
	const data = getLindormData(entityId);
	if (!data) return;

	data.phaseTimer -= dt;

	if (data.phase === LindormPhase.Underground) {
		// Vibration attraction: mining overrides player as target
		if (ctx.miningActive && ctx.mineX != null && ctx.mineZ != null) {
			if (attractedByMining(pos.x, pos.z, ctx.mineX, ctx.mineZ)) {
				data.targetX = ctx.mineX;
				data.targetZ = ctx.mineZ;
			} else {
				data.targetX = ctx.playerX;
				data.targetZ = ctx.playerZ;
			}
		} else {
			data.targetX = ctx.playerX;
			data.targetZ = ctx.playerZ;
		}

		const move = tunnelToward(pos.x, pos.z, data.targetX, data.targetZ, TUNNEL_SPEED, dt);
		pos.x += move.dx;
		pos.z += move.dz;
		const surfY = surfaceYAt(pos.x, pos.z);
		pos.y = surfY - 3; // stay underground

		// Remove soft blocks to create permanent tunnel
		if (getBlock && effects?.removeBlock) {
			const blocks = collectTunnelBlocks(pos.x, surfY, pos.z, getBlock);
			for (const b of blocks) {
				effects.removeBlock(b.x, b.y, b.z);
			}
			if (blocks.length > 0) {
				effects.spawnParticles(pos.x, surfY, pos.z, 0x7f5b4e, 4);
			}
		}

		ai.behaviorState = BehaviorState.Chase;
		anim.animState = AnimState.Chase;

		// Ready to breach?
		if (data.phaseTimer <= 0 && nearTarget(pos.x, pos.z, ctx.playerX, ctx.playerZ)) {
			data.phase = LindormPhase.Breaching;
			data.phaseTimer = BREACH_DURATION;
			data.breachX = pos.x;
			data.breachZ = pos.z;
			data.breachProgress = 0;
			data.breachAngle = Math.atan2(ctx.playerX - pos.x, ctx.playerZ - pos.z);
		}
		return;
	}

	if (data.phase === LindormPhase.Breaching) {
		// Arc overhead
		data.breachProgress = 1 - data.phaseTimer / BREACH_DURATION;
		const surfY = surfaceYAt(data.breachX, data.breachZ);
		pos.y = breachArcY(data.breachProgress, surfY);
		const arcPos = breachArcXZ(data.breachX, data.breachZ, data.breachAngle, data.breachProgress);
		pos.x = arcPos.x;
		pos.z = arcPos.z;

		ai.behaviorState = BehaviorState.Attack;
		anim.animState = AnimState.Attack;

		// Contact damage check
		if (breachHitsPlayer(pos.x, pos.z, ctx.playerX, ctx.playerZ) && ctx.playerAlive && ai.attackCooldown <= 0) {
			applyDamageToPlayer(BREACH_DAMAGE);
			ai.attackCooldown = BREACH_DURATION;
			effects?.spawnParticles(pos.x, pos.y, pos.z, 0xc9b896, 8);
		}

		if (data.phaseTimer <= 0) {
			data.phase = LindormPhase.Diving;
			data.phaseTimer = 0.5; // brief dive
		}
		return;
	}

	// Diving — descend back underground
	const surfY = surfaceYAt(pos.x, pos.z);
	pos.y = Math.max(surfY - 3, pos.y - BREACH_SPEED * dt);
	ai.behaviorState = BehaviorState.Chase;
	anim.animState = AnimState.Chase;

	if (pos.y <= surfY - 2) {
		data.phase = LindormPhase.Underground;
		data.phaseTimer = TUNNEL_DURATION;
	}
}
