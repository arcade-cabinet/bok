import { describe, expect, it } from "vitest";
import { createTestWorld, spawnPlayer, spawnWorldTime } from "../../test-utils.ts";
import { SagaLog, ShelterState, WorldTime } from "../traits/index.ts";
import { recordBossDefeat, recordCreatureKill, resetSagaState, sagaSystem } from "./saga.ts";
import { MilestoneId } from "./saga-data.ts";

/** Tick saga system past the 1s throttle interval. */
function tickSaga(world: ReturnType<typeof createTestWorld>, dt = 1.1) {
	resetSagaState();
	sagaSystem(world, dt);
}

describe("sagaSystem", () => {
	it("detects first shelter milestone when player is sheltered", () => {
		const world = createTestWorld();
		spawnPlayer(world, { shelter: { inShelter: true } });
		spawnWorldTime(world, { dayCount: 1 });

		tickSaga(world);

		let achieved = new Set<string>();
		world.query(SagaLog).readEach(([saga]) => {
			achieved = saga.achieved;
		});
		expect(achieved.has(MilestoneId.FirstShelter)).toBe(true);
	});

	it("generates saga entry with correct day", () => {
		const world = createTestWorld();
		spawnPlayer(world, { shelter: { inShelter: true } });
		spawnWorldTime(world, { dayCount: 5 });

		tickSaga(world);

		let entries: Array<{ milestoneId: string; day: number; text: string }> = [];
		world.query(SagaLog).readEach(([saga]) => {
			entries = saga.entries;
		});
		const shelterEntry = entries.find((e) => e.milestoneId === MilestoneId.FirstShelter);
		expect(shelterEntry).toBeDefined();
		expect(shelterEntry!.day).toBe(5);
	});

	it("does not re-trigger achieved milestones", () => {
		const world = createTestWorld();
		spawnPlayer(world, { shelter: { inShelter: true } });
		spawnWorldTime(world, { dayCount: 1 });

		tickSaga(world);

		// Tick again
		resetSagaState();
		sagaSystem(world, 1.1);

		let entryCount = 0;
		world.query(SagaLog).readEach(([saga]) => {
			entryCount = saga.entries.length;
		});
		// FirstShelter should only appear once
		expect(entryCount).toBe(1);
	});

	it("detects day threshold milestones", () => {
		const world = createTestWorld();
		spawnPlayer(world);
		spawnWorldTime(world, { dayCount: 7 });

		tickSaga(world);

		let achieved = new Set<string>();
		world.query(SagaLog).readEach(([saga]) => {
			achieved = saga.achieved;
		});
		expect(achieved.has(MilestoneId.Day3)).toBe(true);
		expect(achieved.has(MilestoneId.Day7)).toBe(true);
	});

	it("detects creature kill milestone via recordCreatureKill", () => {
		const world = createTestWorld();
		spawnPlayer(world);
		spawnWorldTime(world, { dayCount: 1 });

		recordCreatureKill(world);
		tickSaga(world);

		let achieved = new Set<string>();
		world.query(SagaLog).readEach(([saga]) => {
			achieved = saga.achieved;
		});
		expect(achieved.has(MilestoneId.FirstCreatureKill)).toBe(true);
	});

	it("detects boss defeat milestone via recordBossDefeat", () => {
		const world = createTestWorld();
		spawnPlayer(world);
		spawnWorldTime(world, { dayCount: 1 });

		recordBossDefeat(world);
		tickSaga(world);

		let achieved = new Set<string>();
		world.query(SagaLog).readEach(([saga]) => {
			achieved = saga.achieved;
		});
		expect(achieved.has(MilestoneId.BossDefeated)).toBe(true);
	});

	it("respects throttle interval — no updates before 1s", () => {
		const world = createTestWorld();
		spawnPlayer(world, { shelter: { inShelter: true } });
		spawnWorldTime(world, { dayCount: 1 });

		resetSagaState();
		sagaSystem(world, 0.5);

		let achieved = new Set<string>();
		world.query(SagaLog).readEach(([saga]) => {
			achieved = saga.achieved;
		});
		expect(achieved.size).toBe(0);
	});

	it("detects block inscription milestones", () => {
		const world = createTestWorld();
		spawnPlayer(world, { inscription: { totalBlocksPlaced: 60, totalBlocksMined: 50 } });
		spawnWorldTime(world, { dayCount: 1 });

		tickSaga(world);

		let achieved = new Set<string>();
		world.query(SagaLog).readEach(([saga]) => {
			achieved = saga.achieved;
		});
		expect(achieved.has(MilestoneId.Blocks100)).toBe(true);
	});
});
