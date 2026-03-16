/**
 * Creature system — main entry point replacing enemySystem.
 * Dispatches spawning by species and AI updates by archetype.
 */

import type { World } from "koota";
import {
	CreatureHealth,
	CreatureTag,
	InscriptionLevel,
	PlayerState,
	PlayerTag,
	Position,
	Rotation,
	WorldTime,
} from "../traits/index.ts";
import type { CreatureEffects, CreatureUpdateContext } from "./creature-ai.ts";
import { cleanupCreatureState, updateHostileAI, updateNeutralAI, updatePassiveAI } from "./creature-ai.ts";
import { spawnCreatures } from "./creature-spawner.ts";
import { computeInscriptionLevel } from "./inscription-level.ts";

const DESPAWN_DISTANCE = 50;

export type { CreatureEffects };

export function creatureSystem(world: World, dt: number, effects?: CreatureEffects) {
	let timeOfDay = 0.25;
	world.query(WorldTime).readEach(([time]) => {
		timeOfDay = time.timeOfDay;
	});
	const isDaytime = timeOfDay > 0 && timeOfDay < 0.5;

	// Get player position, yaw, and inscription level
	let px = 0,
		py = 0,
		pz = 0,
		pYaw = 0;
	let playerAlive = false;
	let insLevel = 0;
	world.query(PlayerTag, Position, PlayerState, Rotation, InscriptionLevel).readEach(([pos, state, rot, ins]) => {
		px = pos.x;
		py = pos.y;
		pz = pos.z;
		pYaw = rot.yaw;
		playerAlive = !state.isDead;
		insLevel = computeInscriptionLevel(ins.totalBlocksPlaced, ins.totalBlocksMined, ins.structuresBuilt);
	});

	// Count + despawn distant creatures
	let creatureCount = 0;
	world.query(CreatureTag, Position).updateEach(([pos], entity) => {
		const dx = px - pos.x;
		const dz = pz - pos.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist > DESPAWN_DISTANCE) {
			cleanupCreatureState(entity.id());
			effects?.onCreatureDied(entity.id());
			entity.destroy();
			return;
		}
		creatureCount++;
	});

	// Spawn — inscription level affects rates and creature thresholds
	spawnCreatures(world, px, pz, playerAlive, isDaytime, creatureCount, effects, timeOfDay, insLevel);

	// Update AI by archetype
	const ctx: CreatureUpdateContext = {
		playerX: px,
		playerY: py,
		playerZ: pz,
		playerYaw: pYaw,
		playerAlive,
		isDaytime,
		timeOfDay,
	};

	updateHostileAI(world, dt, ctx, effects);
	updatePassiveAI(world, dt, ctx, effects);
	updateNeutralAI(world, dt, ctx, effects);
}

/**
 * Damage a creature by entity ID. Called from combat system.
 */
export function damageCreature(
	world: World,
	entityId: number,
	damage: number,
	effects?: { spawnParticles: (x: number, y: number, z: number, color: string | number, count: number) => void },
) {
	world.query(CreatureTag, CreatureHealth, Position).updateEach(([hp, pos], entity) => {
		if (entity.id() === entityId) {
			hp.hp -= damage;
			effects?.spawnParticles(pos.x, pos.y, pos.z, 0xff0000, 5);
		}
	});
}

export type { CreatureEffects as EnemySideEffects };
// ─── Legacy aliases ───
export { creatureSystem as enemySystem, damageCreature as damageEnemy };
