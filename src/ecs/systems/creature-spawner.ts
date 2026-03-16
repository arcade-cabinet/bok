/**
 * Creature spawning — handles spawn logic per species.
 * Currently only spawns Mörker at night (preserving original enemy behavior).
 */

import type { World } from "koota";
import { cosmeticRng, worldRng } from "../../world/noise.ts";
import { getVoxelAt, isBlockSolid } from "../../world/voxel-helpers.ts";
import {
	AiType,
	AnimState,
	BehaviorState,
	CreatureAI,
	CreatureAnimation,
	CreatureHealth,
	CreatureTag,
	CreatureType,
	Position,
	Species,
} from "../traits/index.ts";
import type { CreatureEffects } from "./creature-ai.ts";

const MAX_CREATURES = 8;
const SPAWN_DISTANCE = 20;
const SPAWN_CHANCE = 0.01;

/** Species-specific defaults for spawning. */
const MORKER_DEFAULTS = {
	hp: 6,
	maxHp: 6,
	aiType: AiType.Hostile,
	aggroRange: 15,
	attackRange: 1.5,
	attackDamage: 15,
	moveSpeed: 2.5,
	detectionRange: 15,
} as const;

/** Attempt to spawn creatures near the player. */
export function spawnCreatures(
	world: World,
	playerX: number,
	playerZ: number,
	playerAlive: boolean,
	isDaytime: boolean,
	creatureCount: number,
	effects?: CreatureEffects,
) {
	// Only spawn Mörker at night (preserving original behavior)
	if (isDaytime || !playerAlive || creatureCount >= MAX_CREATURES) return;
	if (worldRng() >= SPAWN_CHANCE) return;

	const angle = worldRng() * Math.PI * 2;
	const spawnX = playerX + Math.cos(angle) * SPAWN_DISTANCE;
	const spawnZ = playerZ + Math.sin(angle) * SPAWN_DISTANCE;

	const spawnY = findSurfaceSpawn(spawnX, spawnZ);
	if (spawnY < 0) return;

	const variant = cosmeticRng();
	const species = Species.Morker;

	const entity = world.spawn(
		CreatureTag,
		Position({ x: spawnX, y: spawnY, z: spawnZ }),
		CreatureType({ species }),
		CreatureAI({
			aiType: MORKER_DEFAULTS.aiType,
			behaviorState: BehaviorState.Idle,
			targetEntity: -1,
			aggroRange: MORKER_DEFAULTS.aggroRange,
			attackRange: MORKER_DEFAULTS.attackRange,
			attackDamage: MORKER_DEFAULTS.attackDamage,
			attackCooldown: 0,
			moveSpeed: MORKER_DEFAULTS.moveSpeed,
			detectionRange: MORKER_DEFAULTS.detectionRange,
		}),
		CreatureAnimation({
			animState: AnimState.Idle,
			animTimer: 0,
			variant,
		}),
		CreatureHealth({
			hp: MORKER_DEFAULTS.hp,
			maxHp: MORKER_DEFAULTS.maxHp,
			velY: 0,
			meshIndex: -1,
		}),
	);

	effects?.onCreatureSpawned(entity.id(), species, variant);
}

/** Find a valid Y position on the terrain surface. Returns -1 if none found. */
function findSurfaceSpawn(x: number, z: number): number {
	for (let y = 60; y >= 0; y--) {
		const v = getVoxelAt(Math.floor(x), y, Math.floor(z));
		if (v > 0 && isBlockSolid(v)) {
			return y + 2;
		}
	}
	return -1;
}

export { MAX_CREATURES };
