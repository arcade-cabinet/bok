/**
 * Creature spawning — handles spawn logic per species.
 * Mörker spawn at night; Lyktgubbar spawn at twilight/dawn in valid biomes.
 */

import type { World } from "koota";
import type { BiomeId } from "../../world/biomes.ts";
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
import { isLyktgubbeBiome, isLyktgubbeTime } from "./lyktgubbe-drift.ts";

const MAX_CREATURES = 8;
const SPAWN_DISTANCE = 20;
const SPAWN_CHANCE = 0.01;
const LYKTGUBBE_SPAWN_CHANCE = 0.015;
const LYKTGUBBE_SPAWN_DISTANCE = 15;

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

const LYKTGUBBE_DEFAULTS = {
	hp: 1,
	maxHp: 1,
	aiType: AiType.Passive,
	aggroRange: 0,
	attackRange: 0,
	attackDamage: 0,
	moveSpeed: 1.0,
	detectionRange: 6,
} as const;

/** Biome resolver — injected to avoid circular dependency with terrain-generator. */
let biomeResolver: ((gx: number, gz: number) => number) | null = null;

/** Register a function that resolves biome at a world position. */
export function registerBiomeResolver(resolver: (gx: number, gz: number) => number): void {
	biomeResolver = resolver;
}

/** Attempt to spawn creatures near the player. */
export function spawnCreatures(
	world: World,
	playerX: number,
	playerZ: number,
	playerAlive: boolean,
	isDaytime: boolean,
	creatureCount: number,
	effects?: CreatureEffects,
	timeOfDay = 0.25,
) {
	if (!playerAlive || creatureCount >= MAX_CREATURES) return;

	// Lyktgubbe spawning (twilight/dawn, biome-gated)
	if (isLyktgubbeTime(timeOfDay) && worldRng() < LYKTGUBBE_SPAWN_CHANCE) {
		spawnLyktgubbe(world, playerX, playerZ, effects);
	}

	// Mörker spawning (night only)
	if (!isDaytime && worldRng() < SPAWN_CHANCE) {
		spawnMorker(world, playerX, playerZ, effects);
	}
}

function spawnMorker(world: World, playerX: number, playerZ: number, effects?: CreatureEffects) {
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

function spawnLyktgubbe(world: World, playerX: number, playerZ: number, effects?: CreatureEffects) {
	const angle = worldRng() * Math.PI * 2;
	const spawnX = playerX + Math.cos(angle) * LYKTGUBBE_SPAWN_DISTANCE;
	const spawnZ = playerZ + Math.sin(angle) * LYKTGUBBE_SPAWN_DISTANCE;

	// Biome check — only spawn in valid biomes
	if (biomeResolver) {
		const biome = biomeResolver(Math.floor(spawnX), Math.floor(spawnZ)) as BiomeId;
		if (!isLyktgubbeBiome(biome)) return;
	}

	const spawnY = findSurfaceSpawn(spawnX, spawnZ);
	if (spawnY < 0) return;

	// Float above ground
	const floatY = spawnY + 1.5;
	const variant = cosmeticRng();
	const species = Species.Lyktgubbe;

	const entity = world.spawn(
		CreatureTag,
		Position({ x: spawnX, y: floatY, z: spawnZ }),
		CreatureType({ species }),
		CreatureAI({
			aiType: LYKTGUBBE_DEFAULTS.aiType,
			behaviorState: BehaviorState.Idle,
			targetEntity: -1,
			aggroRange: LYKTGUBBE_DEFAULTS.aggroRange,
			attackRange: LYKTGUBBE_DEFAULTS.attackRange,
			attackDamage: LYKTGUBBE_DEFAULTS.attackDamage,
			attackCooldown: 0,
			moveSpeed: LYKTGUBBE_DEFAULTS.moveSpeed,
			detectionRange: LYKTGUBBE_DEFAULTS.detectionRange,
		}),
		CreatureAnimation({
			animState: AnimState.Idle,
			animTimer: 0,
			variant,
		}),
		CreatureHealth({
			hp: LYKTGUBBE_DEFAULTS.hp,
			maxHp: LYKTGUBBE_DEFAULTS.maxHp,
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
