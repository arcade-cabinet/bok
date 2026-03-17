/**
 * Side-effect wiring for ECS systems that need visual callbacks.
 * Each function creates the effects object and runs the system.
 * Extracted from GameBridge to keep game.ts focused on init/lifecycle.
 */

import type { World } from "koota";
import type { ComputationalRuneEffects } from "../ecs/systems/computational-rune-system.ts";
import { computationalRuneSystem } from "../ecs/systems/computational-rune-system.ts";
import { damageCreature } from "../ecs/systems/creature.ts";
import type { EmitterEffects } from "../ecs/systems/emitter-system.ts";
import { emitterSystem } from "../ecs/systems/emitter-system.ts";
import type { InteractionRuneEffects } from "../ecs/systems/interaction-rune-system.ts";
import { interactionRuneSystem } from "../ecs/systems/interaction-rune-system.ts";
import type { NetworkRuneEffects } from "../ecs/systems/network-rune-system.ts";
import { networkRuneSystem } from "../ecs/systems/network-rune-system.ts";
import type { ProtectionRuneEffects } from "../ecs/systems/protection-rune-system.ts";
import { protectionRuneSystem } from "../ecs/systems/protection-rune-system.ts";
import type { RaidoEffects } from "../ecs/systems/raido-system.ts";
import { raidoSystem } from "../ecs/systems/raido-system.ts";
import type { CombatRuneEffects } from "../ecs/systems/rune-combat-effects.ts";
import { runeCombatEffectsSystem } from "../ecs/systems/rune-combat-effects.ts";
import type { RuneDiscoveryEffects } from "../ecs/systems/rune-discovery-system.ts";
import { runeDiscoverySystem } from "../ecs/systems/rune-discovery-system.ts";
import { getRuneIndex } from "../ecs/systems/rune-index.ts";
import type { SensorEffects } from "../ecs/systems/rune-sensor.ts";
import { runeSensorSystem } from "../ecs/systems/rune-sensor.ts";
import type { SelfModifyEffects } from "../ecs/systems/self-modify-system.ts";
import { selfModifySystem } from "../ecs/systems/self-modify-system.ts";
import type { SettlementEffects } from "../ecs/systems/settlement-system.ts";
import { settlementSystem } from "../ecs/systems/settlement-system.ts";
import type { TerritoryEffects } from "../ecs/systems/territory.ts";
import { territorySystem } from "../ecs/systems/territory.ts";
import type { WorldEventEffects } from "../ecs/systems/world-event.ts";
import { worldEventSystem } from "../ecs/systems/world-event.ts";
import { CreatureHealth, CreatureTag, PlayerTag, Position, SagaLog } from "../ecs/traits/index.ts";
import { cosmeticRng } from "../world/noise.ts";
import { getVoxelAt, setVoxelAt } from "../world/voxel-helpers.ts";
import type { SignalField } from "./runes/wavefront.ts";

/** Shared particle spawner type (some systems pass string colors). */
type SpawnFn = (x: number, y: number, z: number, color: number | string, count: number) => void;

export function runEmitterSystem(world: World, dt: number, spawn: SpawnFn) {
	const effects: EmitterEffects = { spawnParticles: spawn };
	emitterSystem(world, dt, (x, y, z) => getVoxelAt(x, y, z), effects);
}

export function runInteractionRuneSystem(world: World, dt: number, spawn: SpawnFn) {
	const effects: InteractionRuneEffects = {
		spawnItemDrop: () => {},
		collectNearbyItem: () => false,
		spawnParticles: spawn,
		damageCreature: (entityId, damage) => {
			damageCreature(world, entityId, damage, { spawnParticles: spawn });
		},
		getItemDropsNear: () => [],
		moveItemDrop: () => {},
	};
	interactionRuneSystem(world, dt, effects);
}

export function runProtectionRuneSystem(world: World, dt: number, spawn: SpawnFn) {
	const effects: ProtectionRuneEffects = { spawnParticles: spawn };
	protectionRuneSystem(world, dt, effects);
}

export function runNetworkRuneSystem(world: World, dt: number, spawn: SpawnFn) {
	const effects: NetworkRuneEffects = {
		spawnParticles: spawn,
		pushCreature: (entityId, vx, vy, vz) => {
			world.query(CreatureTag, Position, CreatureHealth).updateEach(([pos], entity) => {
				if (entity.id() === entityId) {
					pos.x += vx * 0.25;
					pos.y += vy * 0.25;
					pos.z += vz * 0.25;
				}
			});
		},
	};
	networkRuneSystem(world, dt, effects);
}

export function runComputationalRuneSystem(world: World, dt: number, spawn: SpawnFn) {
	const effects: ComputationalRuneEffects = { spawnParticles: spawn };
	computationalRuneSystem(world, dt, (x, y, z) => getVoxelAt(x, y, z), effects);
}

export function runSelfModifySystem(world: World, dt: number, spawn: SpawnFn) {
	const effects: SelfModifyEffects = {
		placeBlock: (x, y, z, blockId) => setVoxelAt("Ground", x, y, z, blockId),
		removeBlock: (x, y, z) => {
			setVoxelAt("Ground", x, y, z, 0);
			getRuneIndex().removeBlock(x, y, z);
		},
		spawnParticles: spawn,
		getBlock: (x, y, z) => getVoxelAt(x, y, z),
	};
	selfModifySystem(world, dt, effects);
}

export function runSettlementSystem(world: World, dt: number, spawn: SpawnFn) {
	const effects: SettlementEffects = { spawnParticles: spawn };
	settlementSystem(world, dt, (x, y, z) => getVoxelAt(x, y, z), effects);
}

export function runTerritorySystem(world: World, dt: number, spawn: SpawnFn) {
	const effects: TerritoryEffects = {
		placeBlock: (x, y, z, blockId) => setVoxelAt("Ground", x, y, z, blockId),
		spawnParticles: spawn,
	};
	territorySystem(world, dt, (x, y, z) => getVoxelAt(x, y, z), effects);
}

export function runRaidoSystem(world: World, dt: number, spawn: SpawnFn) {
	const effects: RaidoEffects = { spawnParticles: spawn };
	raidoSystem(world, dt, (x, y, z) => getVoxelAt(x, y, z), effects);
}

export function runRuneDiscoverySystem(world: World, dt: number, spawn: SpawnFn) {
	const effects: RuneDiscoveryEffects = {
		addSagaEntry: (text) => {
			world.query(PlayerTag, SagaLog).updateEach(([saga]) => {
				saga.entries.push({ milestoneId: "rune_discovery", day: 0, text });
			});
		},
		spawnParticles: spawn,
	};
	runeDiscoverySystem(world, dt, effects);
}

export function runWorldEventSystem(
	world: World,
	dt: number,
	spawn: SpawnFn,
	ambientLight: { color: { set(c: number): void }; intensity: number } | null,
) {
	const effects: WorldEventEffects = {
		spawnParticles: spawn,
		setAmbientTint: (color, intensity) => {
			if (ambientLight && intensity > 0) {
				ambientLight.color.set(color);
				ambientLight.intensity = 0.05 + intensity;
			}
		},
	};
	worldEventSystem(world, dt, cosmeticRng, effects);
}

export function runRuneSensorSystem(world: World, dt: number, spawn: SpawnFn) {
	const effects: SensorEffects = { spawnParticles: spawn };
	runeSensorSystem(world, dt, effects);
}

export function runRuneCombatEffectsSystem(world: World, dt: number, spawn: SpawnFn, field: SignalField) {
	const effects: CombatRuneEffects = {
		spawnParticles: spawn,
		damageCreature: (entityId, damage) => {
			damageCreature(world, entityId, damage, { spawnParticles: spawn });
		},
	};
	runeCombatEffectsSystem(world, dt, field, effects);
}
