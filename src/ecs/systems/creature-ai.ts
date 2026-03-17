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
	Equipment,
	Health,
	PlayerState,
	PlayerTag,
	Position,
	Species,
} from "../traits/index.ts";
import type { BoidAgent } from "./boids.ts";
import { updateDraugarAI } from "./creature-ai-draugar.ts";
import { cleanupMorkerState, type MorkerInfo, updateMorkerAI } from "./creature-ai-hostile.ts";
import { updateLindormAI } from "./creature-ai-lindorm.ts";
import { cleanupPassiveState, getTranaState, updateSkogssniglarAI, updateTranaAI } from "./creature-ai-passive.ts";
import { updateRunvaktareAI } from "./creature-ai-runvaktare.ts";
import { cleanupDraugarState } from "./draugar-gaze.ts";
import { applyArmorReduction, getTotalArmorReduction } from "./equipment.ts";
import { cleanupJattenState } from "./jatten-boss.ts";
import { getActiveLightSources } from "./light.ts";
import { cleanupLindormState } from "./lindorm-tunnel.ts";
import { driftOffset, isLyktgubbeTime, SCATTER_RANGE, SCATTER_SPEED } from "./lyktgubbe-drift.ts";
import type { TargetPos } from "./morker-pack.ts";
import { cleanupNackenState } from "./nacken-aura.ts";
import { cleanupRunvaktareState } from "./runvaktare-ai.ts";
import { cleanupTomteState, updateTomteAI } from "./tomte-ai.ts";
import { cleanupVittraState } from "./vittra-debuff.ts";

const GRAVITY = 28;

/** Clean up per-entity state when a creature is removed. */
export function cleanupCreatureState(entityId: number): void {
	cleanupPassiveState(entityId);
	cleanupMorkerState(entityId);
	cleanupRunvaktareState(entityId);
	cleanupLindormState(entityId);
	cleanupDraugarState(entityId);
	cleanupVittraState(entityId);
	cleanupNackenState(entityId);
	cleanupJattenState(entityId);
	cleanupTomteState(entityId);
}

export interface CreatureUpdateContext {
	playerX: number;
	playerY: number;
	playerZ: number;
	playerYaw: number;
	playerAlive: boolean;
	isDaytime: boolean;
	timeOfDay: number;
	/** Whether the player is actively mining. */
	miningActive?: boolean;
	/** Target block position of active mining (for vibration attraction). */
	mineX?: number;
	mineY?: number;
	mineZ?: number;
}

/** Run hostile AI: dispatch by species (Mörker, Runväktare, Lindorm, Draugar). */
export function updateHostileAI(world: World, dt: number, ctx: CreatureUpdateContext, effects?: CreatureEffects) {
	const DAYTIME_DPS = 2;

	// Pre-pass: collect Mörker and Lyktgubbe positions
	const morkerList: MorkerInfo[] = [];
	const lyktgubbar: TargetPos[] = [];
	world.query(CreatureTag, CreatureType, Position).readEach(([cType, pos], entity) => {
		if (cType.species === Species.Morker) {
			morkerList.push({ entityId: entity.id(), x: pos.x, z: pos.z });
		} else if (cType.species === Species.Lyktgubbe) {
			lyktgubbar.push({ entityId: entity.id(), x: pos.x, z: pos.z });
		}
	});

	const dmg = (damage: number) => applyDamageToPlayer(world, damage);
	const lightSources = getActiveLightSources();

	world
		.query(CreatureTag, CreatureAI, CreatureHealth, CreatureAnimation, CreatureType, Position)
		.updateEach(([ai, hp, anim, cType, pos], entity) => {
			if (ai.aiType !== "hostile") return;

			if (cType.species === Species.Morker) {
				if (ctx.isDaytime) {
					hp.hp -= DAYTIME_DPS * dt;
					anim.animState = AnimState.Burn;
				}
				updateMorkerAI(
					pos,
					ai,
					hp,
					anim,
					entity.id(),
					dt,
					ctx,
					morkerList,
					lyktgubbar,
					applyGravity,
					chase,
					dmg,
					effects,
					lightSources,
				);
			} else if (cType.species === Species.Runvaktare) {
				updateRunvaktareAI(pos, ai, hp, anim, entity.id(), dt, ctx, applyGravity, dmg, effects);
			} else if (cType.species === Species.Lindorm) {
				updateLindormAI(pos, ai, hp, anim, entity.id(), dt, ctx, simpleSurfaceY, dmg, effects, getVoxelAt);
			} else if (cType.species === Species.Draug) {
				updateDraugarAI(pos, ai, hp, anim, entity.id(), dt, ctx, applyGravity, dmg, effects);
			}

			if (hp.hp <= 0) {
				cleanupCreatureState(entity.id());
				effects?.spawnParticles(pos.x, pos.y, pos.z, 0x1a1a2e, 20);
				effects?.onCreatureDied(entity.id());
				entity.destroy();
			}
		});
}

/** Simple surface Y lookup for Lindorm breach arc. */
function simpleSurfaceY(x: number, z: number): number {
	for (let y = 60; y >= 0; y--) {
		const v = getVoxelAt(Math.floor(x), y, Math.floor(z));
		if (v > 0 && isBlockSolid(v)) return y + 1;
	}
	return 0;
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
			} else if (cType.species === Species.Tomte) {
				updateTomteAI(pos, ai, hp, anim, entity.id(), dt, ctx, effects);
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

export { updateNeutralAI } from "./creature-ai-neutral.ts";

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
	// Read armor value from equipment (separate query — player may not have Equipment in tests)
	let armorValue = 0;
	world.query(PlayerTag, Equipment).readEach(([eq]) => {
		armorValue = getTotalArmorReduction(eq);
	});

	const reduced = applyArmorReduction(damage, armorValue);

	world.query(PlayerTag, Health, PlayerState).updateEach(([health, state]) => {
		health.current = Math.max(0, health.current - reduced);
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
	removeBlock?: (x: number, y: number, z: number) => void;
}
