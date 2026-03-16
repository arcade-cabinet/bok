/**
 * Creature AI behavior trees — one function per archetype.
 * Each receives creature state + distance to player and mutates behaviorState.
 */

import type { World } from "koota";
import { cosmeticRng } from "../../world/noise.ts";
import { getVoxelAt, isBlockSolid } from "../../world/voxel-helpers.ts";
import type { AnimStateId, BehaviorStateId, SpeciesId } from "../traits/index.ts";
import {
	AnimState,
	BehaviorState,
	CreatureAI,
	CreatureAnimation,
	CreatureHealth,
	CreatureTag,
	CreatureType,
	Health,
	PlayerState,
	PlayerTag,
	Position,
	Species,
} from "../traits/index.ts";
import type { BoidAgent } from "./boids.ts";
import { cleanupPassiveState, getTranaState, updateSkogssniglarAI, updateTranaAI } from "./creature-ai-passive.ts";
import { driftOffset, isLyktgubbeTime, SCATTER_RANGE, SCATTER_SPEED } from "./lyktgubbe-drift.ts";

const GRAVITY = 28;

/** Clean up per-entity state when a creature is removed. */
export function cleanupCreatureState(entityId: number): void {
	cleanupPassiveState(entityId);
}

export interface CreatureUpdateContext {
	playerX: number;
	playerY: number;
	playerZ: number;
	playerAlive: boolean;
	isDaytime: boolean;
	timeOfDay: number;
}

/** Run hostile AI (Mörker behavior): chase + attack + burn in daylight. */
export function updateHostileAI(world: World, dt: number, ctx: CreatureUpdateContext, effects?: CreatureEffects) {
	const DAYTIME_DPS = 2;

	world
		.query(CreatureTag, CreatureAI, CreatureHealth, CreatureAnimation, Position)
		.updateEach(([ai, hp, anim, pos], entity) => {
			if (ai.aiType !== "hostile") return;

			const dx = ctx.playerX - pos.x;
			const dz = ctx.playerZ - pos.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (ctx.isDaytime) {
				hp.hp -= DAYTIME_DPS * dt;
				anim.animState = AnimState.Burn;
			}

			applyGravity(hp, pos, dt);
			ai.attackCooldown = Math.max(0, ai.attackCooldown - dt);

			if (dist <= ai.attackRange && ctx.playerAlive) {
				ai.behaviorState = BehaviorState.Attack;
				if (!ctx.isDaytime) anim.animState = AnimState.Attack;
				if (ai.attackCooldown <= 0) {
					ai.attackCooldown = 1.0;
					applyDamageToPlayer(world, ai.attackDamage);
				}
			} else if (dist <= ai.aggroRange && ctx.playerAlive) {
				ai.behaviorState = BehaviorState.Chase;
				if (!ctx.isDaytime) anim.animState = AnimState.Chase;
				chase(pos, hp, dx, dz, dist, ai.moveSpeed, dt);
			} else {
				ai.behaviorState = BehaviorState.Idle;
				if (!ctx.isDaytime) anim.animState = AnimState.Idle;
			}

			if (hp.hp <= 0) {
				cleanupCreatureState(entity.id());
				effects?.spawnParticles(pos.x, pos.y, pos.z, 0xff0000, 20);
				effects?.onCreatureDied(entity.id());
				entity.destroy();
			}
		});
}

/** Run passive AI: Lyktgubbe drift/scatter, Skogssnigel wander/graze/retract, Trana wade/fish/flee. */
export function updatePassiveAI(world: World, dt: number, ctx: CreatureUpdateContext, effects?: CreatureEffects) {
	// Collect trana positions for Boids flocking
	const tranaAgents: Array<{ entityId: number; agent: BoidAgent }> = [];
	world.query(CreatureTag, CreatureAI, CreatureType, Position).readEach(([ai, cType, pos], entity) => {
		if (ai.aiType === "passive" && cType.species === Species.Trana) {
			const ts = getTranaState(entity.id());
			tranaAgents.push({
				entityId: entity.id(),
				agent: { x: pos.x, z: pos.z, vx: ts?.wadeDirX ?? 0, vz: ts?.wadeDirZ ?? 0 },
			});
		}
	});

	world
		.query(CreatureTag, CreatureAI, CreatureHealth, CreatureAnimation, CreatureType, Position)
		.updateEach(([ai, hp, anim, cType, pos], entity) => {
			if (ai.aiType !== "passive") return;

			if (cType.species === Species.Lyktgubbe) {
				updateLyktgubbeAI(pos, ai, hp, anim, entity, dt, ctx, effects);
			} else if (cType.species === Species.Skogssnigle) {
				updateSkogssniglarAI(pos, ai, hp, anim, entity, dt, ctx, applyGravity);
			} else if (cType.species === Species.Trana) {
				updateTranaAI(pos, ai, hp, anim, entity, dt, ctx, tranaAgents, applyGravity);
			}
		});
}

/** Lyktgubbe-specific AI: drift in sine patterns, scatter on approach. */
function updateLyktgubbeAI(
	pos: { x: number; y: number; z: number },
	ai: { detectionRange: number; moveSpeed: number; behaviorState: BehaviorStateId },
	hp: { hp: number; velY: number },
	anim: { animState: AnimStateId; animTimer: number },
	entity: { id: () => number; destroy: () => void },
	dt: number,
	ctx: CreatureUpdateContext,
	effects?: CreatureEffects,
) {
	if (!isLyktgubbeTime(ctx.timeOfDay)) {
		effects?.onCreatureDied(entity.id());
		entity.destroy();
		return;
	}

	const dx = ctx.playerX - pos.x;
	const dz = ctx.playerZ - pos.z;
	const dist = Math.sqrt(dx * dx + dz * dz);

	if (dist < SCATTER_RANGE) {
		ai.behaviorState = BehaviorState.Flee;
		anim.animState = AnimState.Flee;
		const invDist = dist > 0.01 ? 1 / dist : 0;
		pos.x -= dx * invDist * SCATTER_SPEED * dt;
		pos.z -= dz * invDist * SCATTER_SPEED * dt;
	} else {
		ai.behaviorState = BehaviorState.Idle;
		anim.animState = AnimState.Idle;
		const t = anim.animTimer;
		const phase = entity.id() * 1.37;
		const drift = driftOffset(t, phase);
		pos.x += drift.dx * dt * 0.5;
		pos.y += drift.dy * dt * 0.5;
		pos.z += drift.dz * dt * 0.5;
	}

	anim.animTimer += dt;
	hp.velY = 0;
}

/** Run neutral AI: passive until provoked, then hostile. */
export function updateNeutralAI(_world: World, _dt: number, _ctx: CreatureUpdateContext, _effects?: CreatureEffects) {
	// Neutral creatures (Vittra, Nacken, Runvaktare) — placeholder for future species
}

// ─── Shared helpers ───

function applyGravity(hp: { velY: number }, pos: { x: number; y: number; z: number }, dt: number) {
	hp.velY -= GRAVITY * dt;
	pos.y += hp.velY * dt;

	const feetX = Math.floor(pos.x);
	const feetZ = Math.floor(pos.z);
	const feetY = Math.floor(pos.y - 1);
	if (feetY >= 0) {
		const below = getVoxelAt(feetX, feetY, feetZ);
		if (below > 0 && isBlockSolid(below)) {
			pos.y = feetY + 1;
			hp.velY = 0;
		}
	}
	if (pos.y < 0) {
		pos.y = 0;
		hp.velY = 0;
	}
}

function chase(
	pos: { x: number; y: number; z: number },
	hp: { velY: number },
	dx: number,
	dz: number,
	dist: number,
	speed: number,
	dt: number,
) {
	const invDist = 1 / Math.max(dist, 0.01);
	pos.x += dx * invDist * speed * dt;
	pos.z += dz * invDist * speed * dt;

	const aheadX = Math.floor(pos.x + dx * invDist * 0.5);
	const aheadZ = Math.floor(pos.z + dz * invDist * 0.5);
	const aheadY = Math.floor(pos.y);
	const aheadBlock = getVoxelAt(aheadX, aheadY, aheadZ);
	if (aheadBlock > 0 && isBlockSolid(aheadBlock) && hp.velY === 0) {
		hp.velY = 8;
	}
}

function applyDamageToPlayer(world: World, damage: number) {
	world.query(PlayerTag, Health, PlayerState).updateEach(([health, state]) => {
		health.current = Math.max(0, health.current - damage);
		state.damageFlash = 1.0;
		state.shakeX = (cosmeticRng() - 0.5) * 0.1;
		state.shakeY = -0.15;
	});
}

/** Map BehaviorState to AnimState for rendering. */
export function behaviorToAnim(state: BehaviorStateId): AnimStateId {
	switch (state) {
		case BehaviorState.Idle:
			return AnimState.Idle;
		case BehaviorState.Chase:
			return AnimState.Chase;
		case BehaviorState.Attack:
			return AnimState.Attack;
		case BehaviorState.Flee:
			return AnimState.Flee;
		default:
			return AnimState.Idle;
	}
}

export interface CreatureEffects {
	spawnParticles: (x: number, y: number, z: number, color: string | number, count: number) => void;
	onCreatureSpawned: (entityId: number, species: SpeciesId, variant: number) => void;
	onCreatureDied: (entityId: number) => void;
}
