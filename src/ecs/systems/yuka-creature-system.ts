/**
 * Yuka Creature System — integrates Yuka steering + FSM into the live game loop.
 *
 * Called from creatureSystem() BEFORE the legacy AI. For creatures with a
 * YukaState.hasVehicle flag, this system handles movement via Yuka and the
 * legacy AI is skipped.
 *
 * Flow per creature per frame:
 * 1. Lazily create Vehicle + FSM if not yet registered
 * 2. Sync ECS Position → Yuka Vehicle
 * 3. Update FSM context with live game state
 * 4. Run fsm.update() + vehicle.update(dt)
 * 5. Sync Yuka Vehicle → ECS Position (horizontal only)
 * 6. Apply gravity (vertical, same as legacy)
 * 7. Write back behaviorState + animState
 */

import type { World } from "koota";
import type { ObstacleAvoidanceBehavior, StateMachine } from "yuka";
import { getVoxelAt, isBlockSolid } from "../../world/voxel-helpers.ts";
import type { AiTypeId, SpeciesId } from "../traits/index.ts";
import {
	CreatureAI,
	CreatureAnimation,
	CreatureHealth,
	CreatureTag,
	CreatureType,
	Position,
	Species,
	YukaState,
} from "../traits/index.ts";
import type { CreatureEffects, CreatureUpdateContext } from "./creature-ai.ts";
import { isObserved as isObservedByPlayer } from "./draugar-gaze.ts";
import { getActiveLightSources } from "./light.ts";
import { getMorkerState, nearestLightFleeDir } from "./morker-pack.ts";
import { createCreatureVehicle, getVehicle, syncEcsToYuka, syncYukaToEcs } from "./yuka-bridge.ts";
import { type MorkerFsmContext, registerMorkerStates } from "./yuka-states-morker.ts";
import {
	type DraugarFsmContext,
	type RunvaktareFsmContext,
	registerDraugarStates,
	registerRunvaktareStates,
} from "./yuka-states-neutral.ts";
import {
	registerSnailStates,
	registerTranaStates,
	type SnailFsmContext,
	type TranaFsmContext,
} from "./yuka-states-passive.ts";
import { type CreatureFsmContext, createCreatureFsm, getFsmContext } from "./yuka-states-shared.ts";
import { createVoxelAvoidanceBehavior, sampleVoxelObstacles, updateAvoidanceBehavior } from "./yuka-voxel-obstacles.ts";

// ─── Gravity (same constants as legacy creature-ai.ts) ───

const GRAVITY = 28;

function applyCreatureGravity(hp: { velY: number }, pos: { x: number; y: number; z: number }, dt: number): void {
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

// ─── Per-creature avoidance behavior tracking ───

const avoidanceBehaviors = new Map<number, ObstacleAvoidanceBehavior>();

// ─── Species that use Yuka AI (others stay on legacy) ───

const YUKA_SPECIES = new Set<string>([
	Species.Morker,
	Species.Skogssnigle,
	Species.Trana,
	Species.Runvaktare,
	Species.Draug,
	// Vittra, Nacken use shared idle/chase states
	Species.Vittra,
	Species.Nacken,
]);

/** Check if a species uses Yuka AI. */
export function isYukaSpecies(species: string): boolean {
	return YUKA_SPECIES.has(species);
}

// ─── Vehicle + FSM Setup ───

function setupCreatureFsm(
	entityId: number,
	species: SpeciesId,
	ai: { aggroRange: number; attackRange: number; attackDamage: number; moveSpeed: number },
	posX: number,
	posY: number,
	posZ: number,
	damageCallback?: (damage: number) => void,
): CreatureFsmContext | null {
	const vehicle = createCreatureVehicle(entityId, {
		maxSpeed: ai.moveSpeed,
		maxForce: ai.moveSpeed * 2,
		mass: 1.0,
		boundingRadius: 0.5,
		position: { x: posX, y: posY, z: posZ },
	});

	// Add obstacle avoidance
	const avoidance = createVoxelAvoidanceBehavior(2.0);
	vehicle.steering.add(avoidance);
	avoidanceBehaviors.set(entityId, avoidance);

	// Create base FSM
	const { fsm, context } = createCreatureFsm(entityId, vehicle, ai);
	context.applyDamageToPlayer = damageCallback;

	// Species-specific setup
	switch (species) {
		case Species.Morker: {
			const ctx = context as MorkerFsmContext;
			ctx.isAlpha = false;
			ctx.flankTargetX = 0;
			ctx.flankTargetZ = 0;
			ctx.inLight = false;
			ctx.lightX = 0;
			ctx.lightZ = 0;
			ctx.isDaytime = false;
			registerMorkerStates(fsm as unknown as StateMachine<MorkerFsmContext>);
			break;
		}
		case Species.Skogssnigle: {
			const ctx = context as SnailFsmContext;
			ctx.isOnGrass = false;
			ctx.retractTimer = 0;
			ctx.grazeTimer = 0;
			registerSnailStates(fsm as unknown as StateMachine<SnailFsmContext>);
			fsm.changeTo("wander");
			return ctx;
		}
		case Species.Trana: {
			const ctx = context as TranaFsmContext;
			ctx.fleeRange = 8;
			registerTranaStates(fsm as unknown as StateMachine<TranaFsmContext>);
			fsm.changeTo("wade");
			return ctx;
		}
		case Species.Runvaktare: {
			const ctx = context as RunvaktareFsmContext;
			ctx.anchorX = posX;
			ctx.anchorZ = posZ;
			ctx.patrolRadius = 12;
			ctx.runeDisturbed = false;
			registerRunvaktareStates(fsm as unknown as StateMachine<RunvaktareFsmContext>);
			fsm.changeTo("dormant");
			return ctx;
		}
		case Species.Draug: {
			const ctx = context as DraugarFsmContext;
			ctx.isObserved = false;
			registerDraugarStates(fsm as unknown as StateMachine<DraugarFsmContext>);
			fsm.changeTo("pursuit");
			return ctx;
		}
		default:
			// Vittra, Nacken — use shared idle/chase/attack/flee
			break;
	}

	return context;
}

// ─── Main Update ───

/**
 * Run Yuka AI for all creatures that have been opted into Yuka.
 * Populates YukaState.hasVehicle=true for species that should use Yuka,
 * so legacy AI can skip them.
 *
 * Returns a Set of entity IDs that were processed by Yuka (so legacy AI skips them).
 */
export function yukaCreatureUpdate(
	world: World,
	dt: number,
	ctx: CreatureUpdateContext,
	effects?: CreatureEffects,
): Set<number> {
	const processed = new Set<number>();
	const lightSources = getActiveLightSources();

	// Collect creatures to process
	const creatures: Array<{
		entityId: number;
		species: SpeciesId;
		aiType: AiTypeId;
		aggroRange: number;
		attackRange: number;
		attackDamage: number;
		moveSpeed: number;
		posX: number;
		posY: number;
		posZ: number;
		velY: number;
		hp: number;
	}> = [];

	world
		.query(CreatureTag, CreatureType, CreatureAI, CreatureHealth, Position)
		.readEach(([cType, ai, hp, pos], entity) => {
			if (!YUKA_SPECIES.has(cType.species)) return;
			creatures.push({
				entityId: entity.id(),
				species: cType.species,
				aiType: ai.aiType,
				aggroRange: ai.aggroRange,
				attackRange: ai.attackRange,
				attackDamage: ai.attackDamage,
				moveSpeed: ai.moveSpeed,
				posX: pos.x,
				posY: pos.y,
				posZ: pos.z,
				velY: hp.velY,
				hp: hp.hp,
			});
		});

	for (const c of creatures) {
		if (c.hp <= 0) continue;

		// Lazily create Vehicle + FSM
		let fsmCtx = getFsmContext(c.entityId);
		if (!fsmCtx) {
			const newCtx = setupCreatureFsm(
				c.entityId,
				c.species,
				{ aggroRange: c.aggroRange, attackRange: c.attackRange, attackDamage: c.attackDamage, moveSpeed: c.moveSpeed },
				c.posX,
				c.posY,
				c.posZ,
				effects ? (damage: number) => applyDamageViaWorld(world, damage) : undefined,
			);
			if (!newCtx) continue;
			fsmCtx = newCtx;

			// Mark as Yuka-managed
			world.query(CreatureTag, YukaState).updateEach(([ys], entity) => {
				if (entity.id() === c.entityId) {
					ys.hasVehicle = true;
				}
			});
		}

		// Sync ECS → Yuka (horizontal only; Y is for obstacle avoidance reference)
		syncEcsToYuka(c.entityId, { x: c.posX, y: c.posY, z: c.posZ }, { x: 0, y: 0, z: 0 });

		// Update FSM context
		const dx = ctx.playerX - c.posX;
		const dz = ctx.playerZ - c.posZ;
		fsmCtx.distToPlayer = Math.sqrt(dx * dx + dz * dz);
		fsmCtx.playerX = ctx.playerX;
		fsmCtx.playerY = ctx.playerY;
		fsmCtx.playerZ = ctx.playerZ;
		fsmCtx.playerAlive = ctx.playerAlive;
		fsmCtx.attackCooldown = Math.max(0, fsmCtx.attackCooldown - dt);

		// Species-specific context updates
		updateSpeciesContext(c.entityId, c.species, fsmCtx, ctx, c.posX, c.posY, c.posZ, lightSources);

		// Run FSM decision-making
		fsmCtx.fsm.update();

		// Run vehicle steering
		const vehicle = getVehicle(c.entityId);
		if (vehicle) {
			// Update obstacle avoidance
			const obstacles = sampleVoxelObstacles(vehicle, getVoxelAt, isBlockSolid);
			const avoidance = avoidanceBehaviors.get(c.entityId);
			if (avoidance) {
				updateAvoidanceBehavior(avoidance, obstacles);
			}

			vehicle.update(dt);

			// Write YukaState
			world.query(CreatureTag, YukaState).updateEach(([ys], entity) => {
				if (entity.id() === c.entityId) {
					ys.currentStateName = fsmCtx.fsm.currentState?.constructor.name ?? "";
					ys.wantsJump = obstacles.shouldJump;
				}
			});
		}

		// Sync Yuka → ECS (horizontal position)
		const outPos = { x: c.posX, y: c.posY, z: c.posZ };
		const outVel = { x: 0, y: c.velY, z: 0 };
		syncYukaToEcs(c.entityId, outPos, outVel);

		// Apply gravity (vertical, same as legacy)
		const hpRef = { velY: c.velY };
		applyCreatureGravity(hpRef, outPos, dt);

		// Auto-jump from obstacle avoidance
		let wantsJump = false;
		world.query(CreatureTag, YukaState).readEach(([ys], entity) => {
			if (entity.id() === c.entityId) wantsJump = ys.wantsJump;
		});
		if (wantsJump && hpRef.velY === 0) {
			hpRef.velY = 8;
		}

		// Write back to ECS
		world
			.query(CreatureTag, CreatureAI, CreatureAnimation, CreatureHealth, Position)
			.updateEach(([ai, anim, hp, pos], entity) => {
				if (entity.id() === c.entityId) {
					pos.x = outPos.x;
					pos.y = outPos.y;
					pos.z = outPos.z;
					hp.velY = hpRef.velY;
					ai.behaviorState = fsmCtx.behaviorState;
					anim.animState = fsmCtx.animState;
				}
			});

		processed.add(c.entityId);
	}

	return processed;
}

// ─── Species Context Updates ───

function updateSpeciesContext(
	entityId: number,
	species: SpeciesId,
	fsmCtx: CreatureFsmContext,
	ctx: CreatureUpdateContext,
	posX: number,
	posY: number,
	posZ: number,
	lightSources: import("./light-sources.ts").LightSource[],
): void {
	if (species === Species.Morker) {
		const morkerCtx = fsmCtx as MorkerFsmContext;
		morkerCtx.isDaytime = ctx.isDaytime;
		const morkerState = getMorkerState(entityId);
		morkerCtx.isAlpha = morkerState?.isAlpha ?? false;

		const fleeDir = nearestLightFleeDir(posX, posY, posZ, lightSources);
		morkerCtx.inLight = fleeDir !== null;
		if (fleeDir) {
			morkerCtx.lightX = posX - fleeDir.dx * 3;
			morkerCtx.lightZ = posZ - fleeDir.dz * 3;
		}

		if (ctx.isDaytime && !fsmCtx.fsm.in("dawn_burn")) {
			fsmCtx.fsm.changeTo("dawn_burn");
		}
	} else if (species === Species.Skogssnigle) {
		const snailCtx = fsmCtx as SnailFsmContext;
		const feetY = Math.floor(posY - 1);
		const below = feetY >= 0 ? getVoxelAt(Math.floor(posX), feetY, Math.floor(posZ)) : 0;
		snailCtx.isOnGrass = below === 2 || below === 13;
	} else if (species === Species.Draug) {
		const draugarCtx = fsmCtx as DraugarFsmContext;
		draugarCtx.isObserved = isObservedByPlayer(ctx.playerX, ctx.playerZ, ctx.playerYaw ?? 0, posX, posZ);
	}
}

// ─── Damage Helper ───

import { cosmeticRng } from "../../world/noise.ts";
import { Equipment, Health, PlayerState, PlayerTag } from "../traits/index.ts";
import { applyArmorReduction, getTotalArmorReduction } from "./equipment.ts";

function applyDamageViaWorld(world: World, damage: number): void {
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

/** Clean up avoidance behavior tracking for a destroyed creature. */
export function cleanupYukaCreature(entityId: number): void {
	avoidanceBehaviors.delete(entityId);
}

/** Reset all Yuka creature state (game destroy). */
export function resetYukaCreatureSystem(): void {
	avoidanceBehaviors.clear();
}
