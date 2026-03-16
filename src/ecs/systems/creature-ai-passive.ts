/**
 * Passive creature AI update functions — Skogssnigel and Trana.
 * Integrates pure-math behavior modules with ECS state.
 */

import { BlockId } from "../../world/blocks.ts";
import { cosmeticRng } from "../../world/noise.ts";
import { getVoxelAt } from "../../world/voxel-helpers.ts";
import type { AnimStateId, BehaviorStateId } from "../traits/index.ts";
import { AnimState, BehaviorState } from "../traits/index.ts";
import type { BoidAgent } from "./boids.ts";
import { applyForce, computeFlockForce, TRANA_BOID_PARAMS } from "./boids.ts";
import {
	createSnailState,
	type SnailBehaviorState,
	SnailState,
	updateSnailBehavior,
	wanderDelta,
} from "./snail-behavior.ts";
import {
	createTranaState,
	FLEE_SPEED,
	fleeDirection,
	type TranaBehaviorState,
	TranaState,
	updateTranaBehavior,
	wadeDelta,
} from "./trana-behavior.ts";

// Per-entity behavior state (keyed by entity ID)
const snailStates = new Map<number, SnailBehaviorState>();
const tranaStates = new Map<number, TranaBehaviorState>();

/** Clean up per-entity state when a creature is removed. */
export function cleanupPassiveState(entityId: number): void {
	snailStates.delete(entityId);
	tranaStates.delete(entityId);
}

/** Get trana state for an entity (for Boids data collection). */
export function getTranaState(entityId: number): TranaBehaviorState | undefined {
	return tranaStates.get(entityId);
}

interface CreatureUpdateCtx {
	playerX: number;
	playerY: number;
	playerZ: number;
}

interface AiRef {
	detectionRange: number;
	moveSpeed: number;
	behaviorState: BehaviorStateId;
}

interface HpRef {
	hp: number;
	velY: number;
}

interface AnimRef {
	animState: AnimStateId;
	animTimer: number;
}

interface EntityRef {
	id: () => number;
}

/** Skogssnigel AI: wander, graze on grass, retract when threatened. */
export function updateSkogssniglarAI(
	pos: { x: number; y: number; z: number },
	ai: AiRef,
	hp: HpRef,
	anim: AnimRef,
	entity: EntityRef,
	dt: number,
	ctx: CreatureUpdateCtx,
	applyGravity: (hp: HpRef, pos: { x: number; y: number; z: number }, dt: number) => void,
) {
	const eid = entity.id();
	let snail = snailStates.get(eid) ?? createSnailState();

	const dx = ctx.playerX - pos.x;
	const dz = ctx.playerZ - pos.z;
	const dist = Math.sqrt(dx * dx + dz * dz);

	// Check if on grass block
	const feetX = Math.floor(pos.x);
	const feetZ = Math.floor(pos.z);
	const feetY = Math.floor(pos.y - 1);
	const below = feetY >= 0 ? getVoxelAt(feetX, feetY, feetZ) : 0;
	const isOnGrass = below === BlockId.Grass || below === BlockId.Moss;

	snail = updateSnailBehavior(snail, dt, dist, isOnGrass, cosmeticRng());
	snailStates.set(eid, snail);

	if (snail.state === SnailState.Wander) {
		const delta = wanderDelta(snail, dt);
		pos.x += delta.dx;
		pos.z += delta.dz;
		ai.behaviorState = BehaviorState.Idle;
		anim.animState = AnimState.Walk;
	} else if (snail.state === SnailState.Graze) {
		ai.behaviorState = BehaviorState.Idle;
		anim.animState = AnimState.Idle;
	} else {
		ai.behaviorState = BehaviorState.Idle;
		anim.animState = AnimState.Idle;
	}

	applyGravity(hp, pos, dt);
	anim.animTimer += dt;
}

/** Trana AI: wade in water, fish, flee in V-formation with Boids. */
export function updateTranaAI(
	pos: { x: number; y: number; z: number },
	ai: AiRef,
	hp: HpRef,
	anim: AnimRef,
	entity: EntityRef,
	dt: number,
	ctx: CreatureUpdateCtx,
	flockData: Array<{ entityId: number; agent: BoidAgent }>,
	applyGravity: (hp: HpRef, pos: { x: number; y: number; z: number }, dt: number) => void,
) {
	const eid = entity.id();
	let trana = tranaStates.get(eid) ?? createTranaState();

	const dx = ctx.playerX - pos.x;
	const dz = ctx.playerZ - pos.z;
	const dist = Math.sqrt(dx * dx + dz * dz);

	trana = updateTranaBehavior(trana, dt, dist, cosmeticRng());
	tranaStates.set(eid, trana);

	if (trana.state === TranaState.Flee) {
		const self: BoidAgent = { x: pos.x, z: pos.z, vx: trana.wadeDirX, vz: trana.wadeDirZ };
		const neighbors = flockData.filter((f) => f.entityId !== eid).map((f) => f.agent);

		const fleeDir = fleeDirection(pos.x, pos.z, ctx.playerX, ctx.playerZ);
		const boidForce = neighbors.length > 0 ? computeFlockForce(self, neighbors, TRANA_BOID_PARAMS) : { fx: 0, fz: 0 };

		const combinedForce = {
			fx: fleeDir.dx * FLEE_SPEED * 0.5 + boidForce.fx,
			fz: fleeDir.dz * FLEE_SPEED * 0.5 + boidForce.fz,
		};

		const vel = applyForce(trana.wadeDirX, trana.wadeDirZ, combinedForce, dt, FLEE_SPEED);
		trana = { ...trana, wadeDirX: vel.vx, wadeDirZ: vel.vz };
		tranaStates.set(eid, trana);

		pos.x += vel.vx * dt;
		pos.z += vel.vz * dt;
		ai.behaviorState = BehaviorState.Flee;
		anim.animState = AnimState.Flee;
	} else if (trana.state === TranaState.Fish) {
		ai.behaviorState = BehaviorState.Idle;
		anim.animState = AnimState.Idle;
	} else {
		const delta = wadeDelta(trana, dt);
		pos.x += delta.dx;
		pos.z += delta.dz;
		ai.behaviorState = BehaviorState.Idle;
		anim.animState = AnimState.Walk;
	}

	applyGravity(hp, pos, dt);
	anim.animTimer += dt;
}
