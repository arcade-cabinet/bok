import { describe, expect, it, vi } from "vitest";
import { createTestWorld, spawnCreature, spawnPlayer } from "../../test-utils.ts";
import {
	AiType,
	AnimState,
	BehaviorState,
	CreatureAI,
	CreatureAnimation,
	CreatureHealth,
	CreatureTag,
	Health,
	PlayerState,
	Position,
	Species,
} from "../traits/index.ts";
import {
	behaviorToAnim,
	type CreatureEffects,
	type CreatureUpdateContext,
	updateHostileAI,
	updatePassiveAI,
} from "./creature-ai.ts";

vi.mock("../../world/voxel-helpers.ts", () => ({
	getVoxelAt: () => 0,
	isBlockSolid: () => false,
}));

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

function nightCtx(px = 0, py = 0, pz = 0): CreatureUpdateContext {
	return {
		playerX: px,
		playerY: py,
		playerZ: pz,
		playerYaw: 0,
		playerAlive: true,
		isDaytime: false,
		timeOfDay: 0.75,
	};
}

function dayCtx(px = 0, py = 0, pz = 0): CreatureUpdateContext {
	return {
		playerX: px,
		playerY: py,
		playerZ: pz,
		playerYaw: 0,
		playerAlive: true,
		isDaytime: true,
		timeOfDay: 0.25,
	};
}

describe("behaviorToAnim", () => {
	it("maps Idle to Idle", () => {
		expect(behaviorToAnim(BehaviorState.Idle)).toBe(AnimState.Idle);
	});

	it("maps Chase to Chase", () => {
		expect(behaviorToAnim(BehaviorState.Chase)).toBe(AnimState.Chase);
	});

	it("maps Attack to Attack", () => {
		expect(behaviorToAnim(BehaviorState.Attack)).toBe(AnimState.Attack);
	});

	it("maps Flee to Flee", () => {
		expect(behaviorToAnim(BehaviorState.Flee)).toBe(AnimState.Flee);
	});

	it("defaults unknown states to Idle", () => {
		expect(behaviorToAnim(99 as never)).toBe(AnimState.Idle);
	});
});

describe("updateHostileAI — Morker movement", () => {
	it("moves creature toward player when chasing", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 10, y: 0, z: 0 } });
		const creature = spawnCreature(world, {
			position: { x: 0, y: 0, z: 0 },
			aggroRange: 15,
		});

		updateHostileAI(world, 0.5, nightCtx(10, 0, 0));

		const pos = creature.get(Position);
		expect(pos.x).toBeGreaterThan(0);
	});

	it("reduces Morker HP in daylight (burn)", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 50, y: 0, z: 0 } });
		const creature = spawnCreature(world, { hp: 6 });

		updateHostileAI(world, 1.0, dayCtx(50, 0, 0));

		expect(creature.get(CreatureHealth).hp).toBeLessThan(6);
		expect(creature.get(CreatureAnimation).animState).toBe(AnimState.Burn);
	});

	it("destroys creature and fires effects at 0 HP", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 50, y: 0, z: 0 } });
		spawnCreature(world, { hp: 1 });
		const effects = noopEffects();

		updateHostileAI(world, 1.0, dayCtx(50, 0, 0), effects);

		let count = 0;
		world.query(CreatureTag).readEach(() => {
			count++;
		});
		expect(count).toBe(0);
		expect(effects.onCreatureDied).toHaveBeenCalled();
		expect(effects.spawnParticles).toHaveBeenCalled();
	});
});

describe("updatePassiveAI — Lyktgubbe", () => {
	it("destroys Lyktgubbe outside spawn time window", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 50, y: 0, z: 0 } });
		spawnCreature(world, {
			species: Species.Lyktgubbe,
			aiType: AiType.Passive,
		});
		const effects = noopEffects();

		// timeOfDay 0.5 is outside Lyktgubbe window (needs 0.7-0.85 or 0.15-0.3)
		updatePassiveAI(
			world,
			0.016,
			{
				playerX: 50,
				playerY: 0,
				playerZ: 0,
				playerYaw: 0,
				playerAlive: true,
				isDaytime: true,
				timeOfDay: 0.5,
			},
			effects,
		);

		let count = 0;
		world.query(CreatureTag).readEach(() => {
			count++;
		});
		expect(count).toBe(0);
		expect(effects.onCreatureDied).toHaveBeenCalled();
	});

	it("Lyktgubbe scatters when player is close", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 3, y: 0, z: 0 } });
		const creature = spawnCreature(world, {
			species: Species.Lyktgubbe,
			aiType: AiType.Passive,
			position: { x: 0, y: 5, z: 0 },
		});

		// timeOfDay 0.75 is within Lyktgubbe window (0.7-0.85)
		updatePassiveAI(world, 0.1, {
			playerX: 3,
			playerY: 0,
			playerZ: 0,
			playerYaw: 0,
			playerAlive: true,
			isDaytime: false,
			timeOfDay: 0.75,
		});

		expect(creature.get(CreatureAI).behaviorState).toBe(BehaviorState.Flee);
		expect(creature.get(Position).x).toBeLessThan(0);
	});
});
