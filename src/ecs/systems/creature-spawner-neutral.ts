/**
 * Neutral/boss creature spawning — Vittra, Nacken, Jatten.
 * Separated from creature-spawner.ts to keep files under 200 LOC.
 */

import type { World } from "koota";
import { worldRng } from "../../world/noise.ts";
import type { AiTypeId, SpeciesId } from "../traits/index.ts";
import { AiType, Species } from "../traits/index.ts";
import type { CreatureEffects } from "./creature-ai.ts";
import { INSCRIPTION_TIERS, isThresholdReached } from "./inscription-level.ts";
import { registerJatten } from "./jatten-boss.ts";
import { registerNacken } from "./nacken-aura.ts";
import { registerVittra } from "./vittra-debuff.ts";

const VITTRA_SPAWN_CHANCE = 0.006;
const NACKEN_SPAWN_CHANCE = 0.002;
const JATTEN_SPAWN_CHANCE = 0.001;

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

const VITTRA: SpawnDefaults = {
	hp: 5,
	maxHp: 5,
	aiType: AiType.Neutral,
	aggroRange: 8,
	attackRange: 0,
	attackDamage: 0,
	moveSpeed: 1.5,
	detectionRange: 8,
};

const NACKEN: SpawnDefaults = {
	hp: 20,
	maxHp: 20,
	aiType: AiType.Neutral,
	aggroRange: 0,
	attackRange: 0,
	attackDamage: 0,
	moveSpeed: 0,
	detectionRange: 8,
};

const JATTEN: SpawnDefaults = {
	hp: 100,
	maxHp: 100,
	aiType: AiType.Boss,
	aggroRange: 30,
	attackRange: 4,
	attackDamage: 30,
	moveSpeed: 1.2,
	detectionRange: 30,
};

type SpawnEntityFn = (
	world: World,
	x: number,
	y: number,
	z: number,
	species: SpeciesId,
	d: SpawnDefaults,
	effects?: CreatureEffects,
) => number;

type FindSurfaceFn = (x: number, z: number) => number;

/**
 * Attempt spawning neutral/boss creatures (Vittra, Nacken, Jatten).
 * Called from spawnCreatures in creature-spawner.ts.
 *
 * Jätten requires inscription level >= 1000 (JATTEN_WAKE).
 */
export function spawnNeutralCreatures(
	world: World,
	playerX: number,
	playerZ: number,
	isDaytime: boolean,
	effects: CreatureEffects | undefined,
	spawnEntity: SpawnEntityFn,
	findSurface: FindSurfaceFn,
	inscriptionLevel = 0,
): void {
	// Vittra spawn at night near mounds
	if (!isDaytime && worldRng() < VITTRA_SPAWN_CHANCE) {
		spawnVittra(world, playerX, playerZ, effects, spawnEntity, findSurface);
	}
	// Nacken spawn rarely (one per region, near water)
	if (worldRng() < NACKEN_SPAWN_CHANCE) {
		spawnNacken(world, playerX, playerZ, effects, spawnEntity, findSurface);
	}
	// Jätten: boss creature gated by inscription level
	if (isThresholdReached(inscriptionLevel, INSCRIPTION_TIERS.JATTEN_WAKE) && worldRng() < JATTEN_SPAWN_CHANCE) {
		spawnJatten(world, playerX + 30, playerZ + 30, effects, spawnEntity, findSurface);
	}
}

function spawnVittra(
	world: World,
	px: number,
	pz: number,
	effects: CreatureEffects | undefined,
	spawnEntity: SpawnEntityFn,
	findSurface: FindSurfaceFn,
) {
	const angle = worldRng() * Math.PI * 2;
	const x = px + Math.cos(angle) * 15;
	const z = pz + Math.sin(angle) * 15;
	const y = findSurface(x, z);
	if (y < 0) return;
	const eid = spawnEntity(world, x, y, z, Species.Vittra, VITTRA, effects);
	registerVittra(eid, x, y, z);
}

function spawnNacken(
	world: World,
	px: number,
	pz: number,
	effects: CreatureEffects | undefined,
	spawnEntity: SpawnEntityFn,
	findSurface: FindSurfaceFn,
) {
	const angle = worldRng() * Math.PI * 2;
	const x = px + Math.cos(angle) * 20;
	const z = pz + Math.sin(angle) * 20;
	const y = findSurface(x, z);
	if (y < 0) return;
	const eid = spawnEntity(world, x, y, z, Species.Nacken, NACKEN, effects);
	registerNacken(eid, x, y, z);
}

/**
 * Spawn a Jatten boss at given coordinates. Called when inscription threshold is met.
 * Exported for use by inscription check in game loop.
 */
export function spawnJatten(
	world: World,
	x: number,
	z: number,
	effects: CreatureEffects | undefined,
	spawnEntity: SpawnEntityFn,
	findSurface: FindSurfaceFn,
): void {
	const y = findSurface(x, z);
	if (y < 0) return;
	const eid = spawnEntity(world, x, y, z, Species.Jatten, JATTEN, effects);
	registerJatten(eid, x, z);
}
