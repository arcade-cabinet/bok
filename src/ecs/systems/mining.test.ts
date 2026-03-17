import { describe, expect, it } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { BlockId } from "../../world/blocks.ts";
import { Hotbar, InscriptionLevel, Inventory, MiningState, PlayerTag, QuestProgress } from "../traits/index.ts";
import type { BlockHit, MiningSideEffects } from "./mining.ts";
import { miningSystem } from "./mining.ts";

/** Create no-op side-effect callbacks that track calls. */
function mockEffects() {
	const removed: [number, number, number][] = [];
	const particles: [number, number, number, string, number][] = [];
	const effects: MiningSideEffects = {
		removeBlock: (x, y, z) => removed.push([x, y, z]),
		spawnParticles: (x, y, z, c, n) => particles.push([x, y, z, c, n]),
	};
	return { effects, removed, particles };
}

/** Helper: activate mining through ECS query. */
function activateMining(world: ReturnType<typeof createTestWorld>) {
	world.query(PlayerTag, MiningState).updateEach(([m]) => {
		m.active = true;
	});
}

describe("miningSystem", () => {
	it("resets progress when mining is not active", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		world.query(PlayerTag, MiningState).updateEach(([m]) => {
			m.progress = 0.5;
		});
		const { effects } = mockEffects();
		const hit: BlockHit = { x: 0, y: 5, z: 0, id: BlockId.Dirt };

		miningSystem(world, 0.1, hit, effects);

		expect(entity.get(MiningState).progress).toBe(0);
	});

	it("resets progress when hit is null", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		activateMining(world);
		const { effects } = mockEffects();

		miningSystem(world, 0.1, null, effects);

		expect(entity.get(MiningState).progress).toBe(0);
	});

	it("advances mining progress based on dt and hardness", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		activateMining(world);
		const { effects } = mockEffects();
		// Dirt has hardness 0.6
		const hit: BlockHit = { x: 0, y: 5, z: 0, id: BlockId.Dirt };

		miningSystem(world, 0.3, hit, effects);

		// progress = dt / hardness = 0.3 / 0.6 = 0.5
		expect(entity.get(MiningState).progress).toBeCloseTo(0.5);
	});

	it("breaks a block when progress reaches 1.0", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		activateMining(world);
		const { effects, removed } = mockEffects();
		// Torch has hardness 0.1
		const hit: BlockHit = { x: 2, y: 3, z: 4, id: BlockId.Torch };

		miningSystem(world, 0.15, hit, effects);

		expect(removed).toEqual([[2, 3, 4]]);
		expect(entity.get(MiningState).active).toBe(false);
		expect(entity.get(MiningState).progress).toBe(0);
	});

	it("adds mined block to inventory", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		activateMining(world);
		const { effects } = mockEffects();
		const hit: BlockHit = { x: 0, y: 0, z: 0, id: BlockId.Torch };

		miningSystem(world, 1.0, hit, effects);

		expect(entity.get(Inventory).items[BlockId.Torch]).toBe(1);
	});

	it("increments inscription totalBlocksMined", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		activateMining(world);
		const { effects } = mockEffects();
		const hit: BlockHit = { x: 0, y: 0, z: 0, id: BlockId.Torch };

		miningSystem(world, 1.0, hit, effects);

		expect(entity.get(InscriptionLevel).totalBlocksMined).toBe(1);
	});

	it("advances quest step 0 when mining wood", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		activateMining(world);
		const { effects } = mockEffects();
		// Wood hardness=2.5; need dt large enough to finish
		const hit: BlockHit = { x: 0, y: 0, z: 0, id: BlockId.Wood };

		miningSystem(world, 3.0, hit, effects);

		expect(entity.get(QuestProgress).progress).toBe(1);
	});

	it("resets progress when target changes", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		activateMining(world);
		const { effects } = mockEffects();

		// Mine one block partially
		const hit1: BlockHit = { x: 0, y: 0, z: 0, id: BlockId.Stone };
		miningSystem(world, 1.0, hit1, effects);
		activateMining(world);

		// Switch to different block
		const hit2: BlockHit = { x: 1, y: 0, z: 0, id: BlockId.Stone };
		miningSystem(world, 0.1, hit2, effects);

		// Progress should have been reset when target changed
		expect(entity.get(MiningState).progress).toBeCloseTo(0.1 / 4.0);
	});

	it("spawns particles while mining and on block break", () => {
		const world = createTestWorld();
		spawnPlayer(world);
		activateMining(world);
		const { effects, particles } = mockEffects();
		// Torch hardness=0.1, dt=0.05 => progress=0.5 (not done yet)
		const hit: BlockHit = { x: 1, y: 2, z: 3, id: BlockId.Torch };

		miningSystem(world, 0.05, hit, effects);
		// Should have spawned hit particles (count=2)
		expect(particles.some((p) => p[4] === 2)).toBe(true);
	});

	it("applies tool speed multiplier when tool matches block", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		// Set active hotbar slot to Wood Axe (id=101, targets Wood, power=3)
		world.query(PlayerTag, Hotbar).updateEach(([hotbar]) => {
			hotbar.slots[0] = { id: 101, type: "item", durability: 50 };
			hotbar.activeSlot = 0;
		});
		activateMining(world);
		const { effects } = mockEffects();
		// Wood hardness=2.5, power=3 => mineTime = 2.5/3 ≈ 0.833
		const hit: BlockHit = { x: 0, y: 0, z: 0, id: BlockId.Wood };

		miningSystem(world, 0.5, hit, effects);

		// progress = dt / mineTime = 0.5 / (2.5/3) = 0.6
		expect(entity.get(MiningState).progress).toBeCloseTo(0.6);
	});
});
