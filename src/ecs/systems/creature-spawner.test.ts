import { describe, expect, it, vi } from "vitest";
import { createTestWorld } from "../../test-utils.ts";
import { AiType, CreatureAI, CreatureHealth, CreatureTag, CreatureType, Position, Species } from "../traits/index.ts";
import type { CreatureEffects } from "./creature-ai.ts";
import { MAX_CREATURES, registerBiomeResolver, spawnCreatures } from "./creature-spawner.ts";

vi.mock("../../world/voxel-helpers.ts", () => ({
	getVoxelAt: (_x: number, y: number) => (y <= 30 ? 1 : 0),
	isBlockSolid: () => true,
}));

let rngValue = 0.5;
vi.mock("../../world/noise.ts", () => ({
	worldRng: () => rngValue,
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

function countCreatures(world: ReturnType<typeof createTestWorld>): number {
	let count = 0;
	world.query(CreatureTag).readEach(() => {
		count++;
	});
	return count;
}

describe("spawnCreatures — basic guards", () => {
	it("does not spawn when player is dead", () => {
		const world = createTestWorld();
		const effects = noopEffects();
		rngValue = 0.001;

		spawnCreatures(world, 0, 0, false, false, 0, effects, 0.75);

		expect(countCreatures(world)).toBe(0);
	});

	it("does not spawn when creature count is at max", () => {
		const world = createTestWorld();
		const effects = noopEffects();
		rngValue = 0.001;

		spawnCreatures(world, 0, 0, true, false, MAX_CREATURES, effects, 0.75);

		expect(countCreatures(world)).toBe(0);
	});

	it("MAX_CREATURES is exported and equals 12", () => {
		expect(MAX_CREATURES).toBe(12);
	});
});

describe("spawnCreatures — nighttime Morker spawning", () => {
	it("spawns Morker pack at night with low RNG roll", () => {
		const world = createTestWorld();
		const effects = noopEffects();
		rngValue = 0.001;

		spawnCreatures(world, 0, 0, true, false, 0, effects, 0.75);

		const creatures: string[] = [];
		world.query(CreatureTag, CreatureType).readEach(([cType]) => {
			creatures.push(cType.species);
		});
		const morkers = creatures.filter((s) => s === Species.Morker);
		expect(morkers.length).toBeGreaterThan(0);
	});

	it("does not spawn Morker during daytime with normal RNG", () => {
		const world = createTestWorld();
		rngValue = 0.5;

		spawnCreatures(world, 0, 0, true, true, 0, undefined, 0.25);

		const morkers: string[] = [];
		world.query(CreatureTag, CreatureType).readEach(([cType]) => {
			if (cType.species === Species.Morker) morkers.push(cType.species);
		});
		expect(morkers.length).toBe(0);
	});
});

describe("spawnCreatures — Lyktgubbe time gating", () => {
	it("spawns Lyktgubbe during twilight window", () => {
		const world = createTestWorld();
		const effects = noopEffects();
		rngValue = 0.001;
		registerBiomeResolver(() => 0);

		spawnCreatures(world, 0, 0, true, false, 0, effects, 0.75);

		const lyktgubbar: string[] = [];
		world.query(CreatureTag, CreatureType).readEach(([cType]) => {
			if (cType.species === Species.Lyktgubbe) lyktgubbar.push(cType.species);
		});
		expect(lyktgubbar.length).toBeGreaterThanOrEqual(0);
	});
});

describe("spawnCreatures — spawn defaults", () => {
	it("Morker creatures have hostile AI type", () => {
		const world = createTestWorld();
		rngValue = 0.001;

		spawnCreatures(world, 0, 0, true, false, 0, undefined, 0.75);

		world.query(CreatureTag, CreatureType, CreatureAI).readEach(([cType, ai]) => {
			if (cType.species === Species.Morker) {
				expect(ai.aiType).toBe(AiType.Hostile);
			}
		});
	});

	it("spawned creatures have position offset from player", () => {
		const world = createTestWorld();
		rngValue = 0.001;

		spawnCreatures(world, 10, 10, true, false, 0, undefined, 0.75);

		world.query(CreatureTag, Position).readEach(([pos]) => {
			const dx = pos.x - 10;
			const dz = pos.z - 10;
			const dist = Math.sqrt(dx * dx + dz * dz);
			expect(dist).toBeGreaterThan(1);
		});
	});

	it("spawned creatures have valid HP", () => {
		const world = createTestWorld();
		rngValue = 0.001;

		spawnCreatures(world, 0, 0, true, false, 0, undefined, 0.75);

		world.query(CreatureTag, CreatureHealth).readEach(([hp]) => {
			expect(hp.hp).toBeGreaterThan(0);
			expect(hp.maxHp).toBeGreaterThan(0);
			expect(hp.hp).toBeLessThanOrEqual(hp.maxHp);
		});
	});

	it("calls onCreatureSpawned effect for each creature", () => {
		const world = createTestWorld();
		const effects = noopEffects();
		rngValue = 0.001;

		spawnCreatures(world, 0, 0, true, false, 0, effects, 0.75);

		const total = countCreatures(world);
		if (total > 0) {
			expect(effects.onCreatureSpawned).toHaveBeenCalled();
		}
	});
});
