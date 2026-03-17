import { describe, expect, it } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { ITEM_WOOD_AXE_ID } from "../../world/blocks.ts";
import { Hotbar, PlayerTag, QuestProgress } from "../traits/index.ts";
import { getQuestText, questSystem } from "./quest.ts";

describe("questSystem", () => {
	it("advances from step 0 to step 1 when progress reaches 5", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		world.query(PlayerTag, QuestProgress).updateEach(([q]) => {
			q.step = 0;
			q.progress = 5;
		});

		questSystem(world, 0);

		expect(entity.get(QuestProgress).step).toBe(1);
		expect(entity.get(QuestProgress).progress).toBe(0);
	});

	it("stays on step 0 when progress is below 5", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		world.query(PlayerTag, QuestProgress).updateEach(([q]) => {
			q.step = 0;
			q.progress = 4;
		});

		questSystem(world, 0);

		expect(entity.get(QuestProgress).step).toBe(0);
		expect(entity.get(QuestProgress).progress).toBe(4);
	});

	it("advances from step 1 to step 2 when player has wood axe", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		world.query(PlayerTag, QuestProgress).updateEach(([q]) => {
			q.step = 1;
		});
		world.query(PlayerTag, Hotbar).updateEach(([hotbar]) => {
			hotbar.slots[0] = { id: ITEM_WOOD_AXE_ID, type: "item" };
		});

		questSystem(world, 0);

		expect(entity.get(QuestProgress).step).toBe(2);
		expect(entity.get(QuestProgress).progress).toBe(0);
	});

	it("stays on step 1 when player has no wood axe", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		world.query(PlayerTag, QuestProgress).updateEach(([q]) => {
			q.step = 1;
		});

		questSystem(world, 0);

		expect(entity.get(QuestProgress).step).toBe(1);
	});

	it("advances from step 2 to step 3 when progress reaches 10", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		world.query(PlayerTag, QuestProgress).updateEach(([q]) => {
			q.step = 2;
			q.progress = 10;
		});

		questSystem(world, 0);

		expect(entity.get(QuestProgress).step).toBe(3);
		expect(entity.get(QuestProgress).progress).toBe(0);
	});

	it("stays on step 2 when progress is below 10", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		world.query(PlayerTag, QuestProgress).updateEach(([q]) => {
			q.step = 2;
			q.progress = 9;
		});

		questSystem(world, 0);

		expect(entity.get(QuestProgress).step).toBe(2);
	});

	it("does nothing on step 3 (final)", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		world.query(PlayerTag, QuestProgress).updateEach(([q]) => {
			q.step = 3;
			q.progress = 100;
		});

		questSystem(world, 0);

		expect(entity.get(QuestProgress).step).toBe(3);
		expect(entity.get(QuestProgress).progress).toBe(100);
	});
});

describe("getQuestText", () => {
	it("shows wood gathering progress for step 0", () => {
		expect(getQuestText(0, 3)).toBe("Gather Wood: 3/5");
	});

	it("shows crafting prompt for step 1", () => {
		expect(getQuestText(1, 0)).toBe("Craft a Wooden Axe [E]");
	});

	it("shows stone mining progress for step 2", () => {
		expect(getQuestText(2, 7)).toBe("Mine Stone: 7/10");
	});

	it("shows survival text for step 3+", () => {
		expect(getQuestText(3, 0)).toBe("Build & Survive");
		expect(getQuestText(99, 0)).toBe("Build & Survive");
	});
});
