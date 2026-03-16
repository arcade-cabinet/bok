import type { World } from "koota";
import { describe, expect, it, vi } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { BlockId } from "../../world/blocks.ts";
import { Hotbar, MiningState, PlayerTag } from "../traits/index.ts";
import type { BlockHit, MiningSideEffects } from "./mining.ts";
import { miningSystem } from "./mining.ts";

function makeMockEffects(): MiningSideEffects {
	return {
		removeBlock: vi.fn(),
		spawnParticles: vi.fn(),
	};
}

function makeHit(blockId = BlockId.Wood): BlockHit {
	return { x: 5, y: 10, z: 5, id: blockId };
}

/** Set mining state via updateEach (writable reference). */
function beginMining(world: World, targetKey: string) {
	world.query(PlayerTag, MiningState).updateEach(([mining]) => {
		mining.active = true;
		mining.targetKey = targetKey;
	});
}

describe("mining durability drain", () => {
	it("drains 1 durability when a block is broken with a tool", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);

		// Set up hotbar with a tool
		const hotbar = entity.get(Hotbar);
		hotbar.slots[0] = { id: 101, type: "item", durability: 50 }; // Wood Axe
		hotbar.activeSlot = 0;

		beginMining(world, "5,10,5");

		const hit = makeHit(BlockId.Wood);
		const effects = makeMockEffects();

		// Wood hardness = 2.5, axe power = 3, mineTime = 2.5/3 ≈ 0.833
		// dt = 1.0 → progress = 1.2 → block breaks
		miningSystem(world, 1.0, hit, effects);

		expect(effects.removeBlock).toHaveBeenCalledOnce();
		const slot = hotbar.slots[0];
		expect(slot).not.toBeNull();
		expect(slot?.type).toBe("item");
		if (slot?.type === "item") {
			expect(slot.durability).toBe(49);
		}
	});

	it("removes tool from hotbar when durability reaches 0", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);

		const hotbar = entity.get(Hotbar);
		hotbar.slots[0] = { id: 101, type: "item", durability: 1 }; // Last use
		hotbar.activeSlot = 0;

		beginMining(world, "5,10,5");

		const hit = makeHit(BlockId.Wood);
		const effects = makeMockEffects();

		miningSystem(world, 1.0, hit, effects);

		expect(effects.removeBlock).toHaveBeenCalledOnce();
		expect(hotbar.slots[0]).toBeNull();
	});

	it("spawns break particles when tool breaks", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);

		const hotbar = entity.get(Hotbar);
		hotbar.slots[0] = { id: 101, type: "item", durability: 1 };
		hotbar.activeSlot = 0;

		beginMining(world, "5,10,5");

		const hit = makeHit(BlockId.Wood);
		const effects = makeMockEffects();

		miningSystem(world, 1.0, hit, effects);

		// Should have block break particles + tool break particles
		expect(effects.spawnParticles).toHaveBeenCalledWith(5, 10.5, 5, "#aaaaaa", 20);
	});

	it("does not drain durability for block slots", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);

		const hotbar = entity.get(Hotbar);
		hotbar.slots[0] = { id: BlockId.Wood, type: "block" };
		hotbar.activeSlot = 0;

		beginMining(world, "5,10,5");

		const hit = makeHit(BlockId.Dirt); // Dirt hardness = 0.6, no tool → mineTime = 0.6
		const effects = makeMockEffects();

		miningSystem(world, 1.0, hit, effects);

		expect(effects.removeBlock).toHaveBeenCalledOnce();
		expect(hotbar.slots[0]).toEqual({ id: BlockId.Wood, type: "block" });
	});

	it("does not drain durability for tools without durability field", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);

		const hotbar = entity.get(Hotbar);
		hotbar.slots[0] = { id: 101, type: "item" }; // Legacy: no durability
		hotbar.activeSlot = 0;

		beginMining(world, "5,10,5");

		const hit = makeHit(BlockId.Wood);
		const effects = makeMockEffects();

		miningSystem(world, 1.0, hit, effects);

		expect(effects.removeBlock).toHaveBeenCalledOnce();
		expect(hotbar.slots[0]).not.toBeNull();
	});

	it("does not drain durability when bare-handed (null slot)", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);

		const hotbar = entity.get(Hotbar);
		hotbar.slots[0] = null;
		hotbar.activeSlot = 0;

		beginMining(world, "5,10,5");

		const hit = makeHit(BlockId.Dirt); // Easy block, bare-handed
		const effects = makeMockEffects();

		miningSystem(world, 1.0, hit, effects);

		expect(effects.removeBlock).toHaveBeenCalledOnce();
		expect(hotbar.slots[0]).toBeNull();
	});
});
