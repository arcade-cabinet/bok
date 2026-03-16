/**
 * Creature spawning — handles spawn logic per species.
 * Mörker spawn at night; Lyktgubbar at twilight/dawn; Skogssniglar/Tranor during day.
 */

import type { World } from "koota";
import type { BiomeId } from "../../world/biomes.ts";
import { cosmeticRng, worldRng } from "../../world/noise.ts";
import { getVoxelAt, isBlockSolid } from "../../world/voxel-helpers.ts";
import type { AiTypeId, SpeciesId } from "../traits/index.ts";
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
import { spawnHostileCreatures } from "./creature-spawner-hostile.ts";
import { isLyktgubbeBiome, isLyktgubbeTime } from "./lyktgubbe-drift.ts";
import { PACK_MAX, PACK_MIN, registerPack } from "./morker-pack.ts";
import { isSnailBiome } from "./snail-behavior.ts";
import { isTranaBiome, isTranaSpawnHeight } from "./trana-behavior.ts";

const MAX_CREATURES = 12;
const SPAWN_CHANCE = 0.01;
const LYKTGUBBE_SPAWN_CHANCE = 0.015;
const SNAIL_SPAWN_CHANCE = 0.008;
const TRANA_SPAWN_CHANCE = 0.006;
const TRANA_FLOCK_SIZE = 3;

interface SpawnDefaults {
	hp: number;
	maxHp: number;
	aiType: AiTypeId;
	aggroRange: number;
	attackRange: number;
	attackDamage: number;
	moveSpeed: number;
	detectionRange: number;
}

const MORKER: SpawnDefaults = {
	hp: 6,
	maxHp: 6,
	aiType: AiType.Hostile,
	aggroRange: 15,
	attackRange: 1.5,
	attackDamage: 15,
	moveSpeed: 2.5,
	detectionRange: 15,
};
const LYKTGUBBE: SpawnDefaults = {
	hp: 1,
	maxHp: 1,
	aiType: AiType.Passive,
	aggroRange: 0,
	attackRange: 0,
	attackDamage: 0,
	moveSpeed: 1.0,
	detectionRange: 6,
};
const SNAIL: SpawnDefaults = {
	hp: 8,
	maxHp: 8,
	aiType: AiType.Passive,
	aggroRange: 0,
	attackRange: 0,
	attackDamage: 0,
	moveSpeed: 0.4,
	detectionRange: 4,
};
const TRANA: SpawnDefaults = {
	hp: 4,
	maxHp: 4,
	aiType: AiType.Passive,
	aggroRange: 0,
	attackRange: 0,
	attackDamage: 0,
	moveSpeed: 0.6,
	detectionRange: 10,
};
let biomeResolver: ((gx: number, gz: number) => number) | null = null;

export function registerBiomeResolver(resolver: (gx: number, gz: number) => number): void {
	biomeResolver = resolver;
}

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

	if (isLyktgubbeTime(timeOfDay) && worldRng() < LYKTGUBBE_SPAWN_CHANCE) {
		spawnLyktgubbe(world, playerX, playerZ, effects);
	}
	if (isDaytime && worldRng() < SNAIL_SPAWN_CHANCE) {
		spawnBiomeGated(world, playerX, playerZ, 18, Species.Skogssnigle, SNAIL, isSnailBiome, effects);
	}
	if (isDaytime && worldRng() < TRANA_SPAWN_CHANCE) {
		spawnTranaFlock(world, playerX, playerZ, effects);
	}
	if (!isDaytime && worldRng() < SPAWN_CHANCE) {
		spawnMorkerPack(world, playerX, playerZ, effects);
	}
	spawnHostileCreatures(world, playerX, playerZ, isDaytime, effects, spawnEntity, findSurfaceSpawn);
}

/** Spawn a single creature entity with given defaults. Returns entity ID. */
function spawnEntity(
	world: World,
	x: number,
	y: number,
	z: number,
	species: SpeciesId,
	d: SpawnDefaults,
	effects?: CreatureEffects,
): number {
	const variant = cosmeticRng();
	const entity = world.spawn(
		CreatureTag,
		Position({ x, y, z }),
		CreatureType({ species }),
		CreatureAI({
			aiType: d.aiType,
			behaviorState: BehaviorState.Idle,
			targetEntity: -1,
			aggroRange: d.aggroRange,
			attackRange: d.attackRange,
			attackDamage: d.attackDamage,
			attackCooldown: 0,
			moveSpeed: d.moveSpeed,
			detectionRange: d.detectionRange,
		}),
		CreatureAnimation({ animState: AnimState.Idle, animTimer: 0, variant }),
		CreatureHealth({ hp: d.hp, maxHp: d.maxHp, velY: 0, meshIndex: -1 }),
	);
	effects?.onCreatureSpawned(entity.id(), species, variant);
	return entity.id();
}

/** Spawn at a random position around the player. */
function spawnAt(
	world: World,
	px: number,
	pz: number,
	dist: number,
	species: SpeciesId,
	d: SpawnDefaults,
	effects?: CreatureEffects,
) {
	const angle = worldRng() * Math.PI * 2;
	const x = px + Math.cos(angle) * dist;
	const z = pz + Math.sin(angle) * dist;
	const y = findSurfaceSpawn(x, z);
	if (y < 0) return;
	spawnEntity(world, x, y, z, species, d, effects);
}

/** Spawn with biome validation. */
function spawnBiomeGated(
	world: World,
	px: number,
	pz: number,
	dist: number,
	species: SpeciesId,
	d: SpawnDefaults,
	biomeCheck: (b: BiomeId) => boolean,
	effects?: CreatureEffects,
) {
	const angle = worldRng() * Math.PI * 2;
	const x = px + Math.cos(angle) * dist;
	const z = pz + Math.sin(angle) * dist;
	if (biomeResolver) {
		const biome = biomeResolver(Math.floor(x), Math.floor(z)) as BiomeId;
		if (!biomeCheck(biome)) return;
	}
	const y = findSurfaceSpawn(x, z);
	if (y < 0) return;
	spawnEntity(world, x, y, z, species, d, effects);
}

function spawnLyktgubbe(world: World, px: number, pz: number, effects?: CreatureEffects) {
	const angle = worldRng() * Math.PI * 2;
	const x = px + Math.cos(angle) * 15;
	const z = pz + Math.sin(angle) * 15;
	if (biomeResolver) {
		const biome = biomeResolver(Math.floor(x), Math.floor(z)) as BiomeId;
		if (!isLyktgubbeBiome(biome)) return;
	}
	const y = findSurfaceSpawn(x, z);
	if (y < 0) return;
	spawnEntity(world, x, y + 1.5, z, Species.Lyktgubbe, LYKTGUBBE, effects);
}

function spawnTranaFlock(world: World, px: number, pz: number, effects?: CreatureEffects) {
	const angle = worldRng() * Math.PI * 2;
	const bx = px + Math.cos(angle) * 20;
	const bz = pz + Math.sin(angle) * 20;
	if (biomeResolver) {
		const biome = biomeResolver(Math.floor(bx), Math.floor(bz)) as BiomeId;
		if (!isTranaBiome(biome)) return;
	}
	const by = findSurfaceSpawn(bx, bz);
	if (by < 0 || !isTranaSpawnHeight(by)) return;

	for (let i = 0; i < TRANA_FLOCK_SIZE; i++) {
		const sx = bx + (worldRng() - 0.5) * 4;
		const sz = bz + (worldRng() - 0.5) * 4;
		const sy = findSurfaceSpawn(sx, sz);
		if (sy >= 0) spawnEntity(world, sx, sy, sz, Species.Trana, TRANA, effects);
	}
}

function spawnMorkerPack(world: World, px: number, pz: number, effects?: CreatureEffects) {
	const packSize = PACK_MIN + Math.floor(worldRng() * (PACK_MAX - PACK_MIN + 1));
	const angle = worldRng() * Math.PI * 2;
	const bx = px + Math.cos(angle) * 20;
	const bz = pz + Math.sin(angle) * 20;
	const entityIds: number[] = [];

	for (let i = 0; i < packSize; i++) {
		const sx = bx + (worldRng() - 0.5) * 4;
		const sz = bz + (worldRng() - 0.5) * 4;
		const sy = findSurfaceSpawn(sx, sz);
		if (sy >= 0) {
			entityIds.push(spawnEntity(world, sx, sy, sz, Species.Morker, MORKER, effects));
		}
	}
	if (entityIds.length > 0) registerPack(entityIds);
}

function findSurfaceSpawn(x: number, z: number): number {
	for (let y = 60; y >= 0; y--) {
		const v = getVoxelAt(Math.floor(x), y, Math.floor(z));
		if (v > 0 && isBlockSolid(v)) return y + 2;
	}
	return -1;
}

export { MAX_CREATURES };
