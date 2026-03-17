import { describe, expect, it, vi } from "vitest";
import { createTestWorld, spawnCreature, spawnPlayer, spawnWorldTime } from "../../test-utils.ts";
import {
	AiType,
	AnimState,
	BehaviorState,
	CreatureAI,
	CreatureAnimation,
	CreatureHealth,
	CreatureTag,
	CreatureType,
	Health,
	PlayerState,
	Species,
} from "../traits/index.ts";
import { creatureSystem, damageCreature } from "./creature.ts";
import type { CreatureEffects } from "./creature-ai.ts";
import { updateHostileAI } from "./creature-ai.ts";

// Mock voxel helpers — creatures need ground collision
vi.mock("../../world/voxel-helpers.ts", () => ({
	getVoxelAt: () => 0,
	isBlockSolid: () => false,
}));

// Mock noise — worldRng is used by spawner
vi.mock("../../world/noise.ts", () => ({
	worldRng: () => 0.5,
	cosmeticRng: () => 0.5,
	initNoise: vi.fn(),
}));

function noopEffects(): CreatureEffects {
	return {
		spawnParticles: vi.fn(),
		onCreatureSpawned: vi.fn(),
		onCreatureDied: vi.fn(),
	};
}

describe("creature traits", () => {
	it("spawns creature with all required traits", () => {
		const world = createTestWorld();
		const entity = spawnCreature(world);

		expect(entity.has(CreatureTag)).toBe(true);
		expect(entity.get(CreatureType).species).toBe(Species.Morker);
		expect(entity.get(CreatureAI).aiType).toBe(AiType.Hostile);
		expect(entity.get(CreatureAnimation).animState).toBe(AnimState.Idle);
		expect(entity.get(CreatureHealth).hp).toBe(6);
	});

	it("supports different species via overrides", () => {
		const world = createTestWorld();
		const entity = spawnCreature(world, {
			species: Species.Lyktgubbe,
			aiType: AiType.Passive,
		});

		expect(entity.get(CreatureType).species).toBe(Species.Lyktgubbe);
		expect(entity.get(CreatureAI).aiType).toBe(AiType.Passive);
	});
});

describe("hostile AI", () => {
	it("transitions to chase when player is within aggro range", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 10, y: 0, z: 0 } });
		const creature = spawnCreature(world, {
			position: { x: 0, y: 0, z: 0 },
			aggroRange: 15,
		});

		updateHostileAI(world, 0.016, {
			playerX: 10,
			playerY: 0,
			playerZ: 0,
			playerAlive: true,
			isDaytime: false,
			timeOfDay: 0.75,
		});

		expect(creature.get(CreatureAI).behaviorState).toBe(BehaviorState.Chase);
		expect(creature.get(CreatureAnimation).animState).toBe(AnimState.Chase);
	});

	it("transitions to attack when player is within attack range", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 1, y: 0, z: 0 } });
		const creature = spawnCreature(world, {
			position: { x: 0, y: 0, z: 0 },
			attackRange: 1.5,
		});

		updateHostileAI(world, 0.016, {
			playerX: 1,
			playerY: 0,
			playerZ: 0,
			playerAlive: true,
			isDaytime: false,
			timeOfDay: 0.75,
		});

		expect(creature.get(CreatureAI).behaviorState).toBe(BehaviorState.Attack);
		expect(creature.get(CreatureAnimation).animState).toBe(AnimState.Attack);
	});

	it("stays idle when player is beyond aggro range", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 50, y: 0, z: 0 } });
		const creature = spawnCreature(world, {
			position: { x: 0, y: 0, z: 0 },
			aggroRange: 15,
		});

		updateHostileAI(world, 0.016, {
			playerX: 50,
			playerY: 0,
			playerZ: 0,
			playerAlive: true,
			isDaytime: false,
			timeOfDay: 0.75,
		});

		expect(creature.get(CreatureAI).behaviorState).toBe(BehaviorState.Idle);
	});

	it("deals damage to player on attack", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world, {
			position: { x: 0.5, y: 0, z: 0 },
			health: { current: 100 },
		});
		spawnCreature(world, {
			position: { x: 0, y: 0, z: 0 },
			attackRange: 1.5,
			attackDamage: 15,
		});

		updateHostileAI(world, 0.016, {
			playerX: 0.5,
			playerY: 0,
			playerZ: 0,
			playerAlive: true,
			isDaytime: false,
			timeOfDay: 0.75,
		});

		expect(player.get(Health).current).toBe(85);
		expect(player.get(PlayerState).damageFlash).toBe(1.0);
	});

	it("burns in daylight", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 50, y: 0, z: 0 } });
		const creature = spawnCreature(world, {
			position: { x: 0, y: 0, z: 0 },
			hp: 6,
		});

		updateHostileAI(world, 1.0, {
			playerX: 50,
			playerY: 0,
			playerZ: 0,
			playerAlive: true,
			isDaytime: true,
			timeOfDay: 0.25,
		});

		expect(creature.get(CreatureHealth).hp).toBe(4);
		expect(creature.get(CreatureAnimation).animState).toBe(AnimState.Burn);
	});

	it("dies and calls effects when hp reaches zero", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 50, y: 0, z: 0 } });
		spawnCreature(world, {
			position: { x: 0, y: 0, z: 0 },
			hp: 1,
		});

		const effects = noopEffects();

		updateHostileAI(
			world,
			1.0,
			{
				playerX: 50,
				playerY: 0,
				playerZ: 0,
				playerAlive: true,
				isDaytime: true,
				timeOfDay: 0.25,
			},
			effects,
		);

		// Creature should be destroyed
		let count = 0;
		world.query(CreatureTag).readEach(() => {
			count++;
		});
		expect(count).toBe(0);
		expect(effects.onCreatureDied).toHaveBeenCalled();
		expect(effects.spawnParticles).toHaveBeenCalled();
	});

	it("does not attack dead player", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world, {
			position: { x: 0.5, y: 0, z: 0 },
			health: { current: 100 },
			playerState: { isDead: true },
		});
		spawnCreature(world, {
			position: { x: 0, y: 0, z: 0 },
			attackRange: 1.5,
		});

		updateHostileAI(world, 0.016, {
			playerX: 0.5,
			playerY: 0,
			playerZ: 0,
			playerAlive: false,
			isDaytime: false,
			timeOfDay: 0.75,
		});

		expect(player.get(Health).current).toBe(100);
	});
});

describe("creatureSystem integration", () => {
	it("despawns creatures beyond despawn distance", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 0, y: 0, z: 0 } });
		spawnWorldTime(world, { timeOfDay: 0.75 });
		spawnCreature(world, {
			position: { x: 100, y: 0, z: 0 },
		});

		const effects = noopEffects();
		creatureSystem(world, 0.016, effects);

		let count = 0;
		world.query(CreatureTag).readEach(() => {
			count++;
		});
		expect(count).toBe(0);
		expect(effects.onCreatureDied).toHaveBeenCalled();
	});
});

describe("damageCreature", () => {
	it("reduces creature HP and spawns particles", () => {
		const world = createTestWorld();
		const creature = spawnCreature(world, { hp: 6 });
		const spawnParticles = vi.fn();

		damageCreature(world, creature.id(), 2, { spawnParticles });

		expect(creature.get(CreatureHealth).hp).toBe(4);
		expect(spawnParticles).toHaveBeenCalled();
	});
});
