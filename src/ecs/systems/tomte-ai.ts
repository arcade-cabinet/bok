/**
 * Tomte AI — singleton gnome companion with tutorial teaching behavior.
 * Spawns after player builds first structure, despawns after 3 rune inscriptions.
 * Simple state machine: Idle → Wander → Watch (near player).
 */

import { worldRng } from "../../world/noise.ts";
import { getVoxelAt, isBlockSolid } from "../../world/voxel-helpers.ts";
import type { AnimStateId, BehaviorStateId } from "../traits/index.ts";
import { AnimState, BehaviorState } from "../traits/index.ts";
import type { CreatureEffects, CreatureUpdateContext } from "./creature-ai.ts";

// ─── Spawn Conditions ───

const _STRUCTURE_THRESHOLD = 1;
const INSCRIPTION_DESPAWN = 3;
const SPAWN_DISTANCE = 5;
const GRAVITY = 28;
const WATCH_RANGE = 8;
const WANDER_SPEED = 0.8;
const WANDER_INTERVAL = 4;

/** Module-scoped singleton state. */
let tomteEntityId = -1;
let wanderTimer = 0;
let wanderDirX = 0;
let wanderDirZ = 0;
let hintText: string | null = null;

export function isTomteSpawned(): boolean {
	return tomteEntityId >= 0;
}

export function getTomteHint(): string | null {
	return hintText;
}

export function getTomteEntityId(): number {
	return tomteEntityId;
}

export function registerTomte(entityId: number): void {
	tomteEntityId = entityId;
	hintText = "…";
}

export function resetTomteState(): void {
	tomteEntityId = -1;
	wanderTimer = 0;
	hintText = null;
}

/** Check if Tomte should spawn (immediately on fresh game, despawns after 3 runes). */
export function shouldSpawnTomte(_structuresBuilt: number, discoveredRunes: number): boolean {
	if (tomteEntityId >= 0) return false;
	if (discoveredRunes >= INSCRIPTION_DESPAWN) return false;
	return true;
}

/** Check if Tomte should despawn (3+ runes discovered). */
export function shouldDespawnTomte(discoveredRunes: number): boolean {
	return tomteEntityId >= 0 && discoveredRunes >= INSCRIPTION_DESPAWN;
}

/** Find a spawn position near the player on the surface. */
export function findTomteSpawn(px: number, pz: number): { x: number; y: number; z: number } | null {
	const angle = worldRng() * Math.PI * 2;
	const x = px + Math.cos(angle) * SPAWN_DISTANCE;
	const z = pz + Math.sin(angle) * SPAWN_DISTANCE;
	for (let y = 60; y >= 0; y--) {
		const v = getVoxelAt(Math.floor(x), y, Math.floor(z));
		if (v > 0 && isBlockSolid(v)) return { x, y: y + 2, z };
	}
	return null;
}

// ─── AI Update ───

export function updateTomteAI(
	pos: { x: number; y: number; z: number },
	ai: { behaviorState: BehaviorStateId; moveSpeed: number },
	hp: { velY: number },
	anim: { animState: AnimStateId; animTimer: number },
	_entityId: number,
	dt: number,
	ctx: CreatureUpdateContext,
	_effects?: CreatureEffects,
): void {
	const dx = ctx.playerX - pos.x;
	const dz = ctx.playerZ - pos.z;
	const dist = Math.sqrt(dx * dx + dz * dz);

	// Gravity
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

	// State: Watch when player is close, Wander otherwise
	if (dist < WATCH_RANGE) {
		ai.behaviorState = BehaviorState.Idle;
		anim.animState = AnimState.Idle;
		hintText = "The Tomte watches with keen eyes…";
	} else {
		ai.behaviorState = BehaviorState.Chase;
		anim.animState = AnimState.Chase;
		hintText = null;

		// Wander toward player loosely
		wanderTimer -= dt;
		if (wanderTimer <= 0) {
			wanderTimer = WANDER_INTERVAL;
			const invDist = dist > 0.01 ? 1 / dist : 0;
			wanderDirX = dx * invDist + (worldRng() - 0.5) * 0.5;
			wanderDirZ = dz * invDist + (worldRng() - 0.5) * 0.5;
		}
		pos.x += wanderDirX * WANDER_SPEED * dt;
		pos.z += wanderDirZ * WANDER_SPEED * dt;
	}

	anim.animTimer += dt;
}

export function cleanupTomteState(entityId: number): void {
	if (tomteEntityId === entityId) {
		tomteEntityId = -1;
		hintText = null;
	}
}
