/**
 * Hostile creature spawning — Runväktare, Lindorm, Draugar.
 * Separated from creature-spawner.ts to keep files under 200 LOC.
 */

import type { World } from "koota";
import { worldRng } from "../../world/noise.ts";
import type { AiTypeId, SpeciesId } from "../traits/index.ts";
import { AiType, Species } from "../traits/index.ts";
import type { CreatureEffects } from "./creature-ai.ts";
import { registerDraugar } from "./draugar-gaze.ts";
import { INSCRIPTION_TIERS, isThresholdReached } from "./inscription-level.ts";
import { registerLindorm } from "./lindorm-tunnel.ts";
import { registerRunvaktare } from "./runvaktare-ai.ts";

const RUNVAKTARE_SPAWN_CHANCE = 0.005;
const LINDORM_SPAWN_CHANCE = 0.004;
const DRAUGAR_SPAWN_CHANCE = 0.007;

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

const RUNVAKTARE: SpawnDefaults = {
	hp: 20,
	maxHp: 20,
	aiType: AiType.Hostile,
	aggroRange: 15,
	attackRange: 3,
	attackDamage: 25,
	moveSpeed: 1.5,
	detectionRange: 15,
};
const LINDORM: SpawnDefaults = {
	hp: 15,
	maxHp: 15,
	aiType: AiType.Hostile,
	aggroRange: 25,
	attackRange: 2,
	attackDamage: 20,
	moveSpeed: 3.0,
	detectionRange: 25,
};
const DRAUGAR: SpawnDefaults = {
	hp: 10,
	maxHp: 10,
	aiType: AiType.Hostile,
	aggroRange: 20,
	attackRange: 1.2,
	attackDamage: 40,
	moveSpeed: 3.5,
	detectionRange: 20,
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
 * Attempt spawning hostile creatures (Runväktare, Lindorm, Draugar).
 * Called from spawnCreatures in creature-spawner.ts.
 *
 * Runväktare require inscription level >= 100 (RUNVAKTARE_WAKE).
 * Lindormar require inscription level >= 300 (LINDORM_ATTRACT).
 */
export function spawnHostileCreatures(
	world: World,
	playerX: number,
	playerZ: number,
	isDaytime: boolean,
	effects: CreatureEffects | undefined,
	spawnEntity: SpawnEntityFn,
	findSurface: FindSurfaceFn,
	inscriptionLevel = 0,
): void {
	if (
		!isDaytime &&
		isThresholdReached(inscriptionLevel, INSCRIPTION_TIERS.RUNVAKTARE_WAKE) &&
		worldRng() < RUNVAKTARE_SPAWN_CHANCE
	) {
		spawnRunvaktare(world, playerX, playerZ, effects, spawnEntity, findSurface);
	}
	if (isThresholdReached(inscriptionLevel, INSCRIPTION_TIERS.LINDORM_ATTRACT) && worldRng() < LINDORM_SPAWN_CHANCE) {
		spawnLindorm(world, playerX, playerZ, effects, spawnEntity, findSurface);
	}
	if (!isDaytime && worldRng() < DRAUGAR_SPAWN_CHANCE) {
		spawnDraugar(world, playerX, playerZ, effects, spawnEntity, findSurface);
	}
}

function spawnRunvaktare(
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
	const eid = spawnEntity(world, x, y, z, Species.Runvaktare, RUNVAKTARE, effects);
	registerRunvaktare(eid, x, y, z);
}

function spawnLindorm(
	world: World,
	px: number,
	pz: number,
	effects: CreatureEffects | undefined,
	spawnEntity: SpawnEntityFn,
	findSurface: FindSurfaceFn,
) {
	const angle = worldRng() * Math.PI * 2;
	const x = px + Math.cos(angle) * 25;
	const z = pz + Math.sin(angle) * 25;
	const y = findSurface(x, z);
	if (y < 0) return;
	const eid = spawnEntity(world, x, y - 3, z, Species.Lindorm, LINDORM, effects);
	registerLindorm(eid, px, pz);
}

function spawnDraugar(
	world: World,
	px: number,
	pz: number,
	effects: CreatureEffects | undefined,
	spawnEntity: SpawnEntityFn,
	findSurface: FindSurfaceFn,
) {
	const angle = worldRng() * Math.PI * 2;
	const x = px + Math.cos(angle) * 18;
	const z = pz + Math.sin(angle) * 18;
	const y = findSurface(x, z);
	if (y < 0) return;
	const eid = spawnEntity(world, x, y, z, Species.Draug, DRAUGAR, effects);
	registerDraugar(eid, x, y, z);
}
