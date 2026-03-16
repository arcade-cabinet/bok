import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWorld, spawnPlayer, spawnWorldTime } from "../../test-utils.ts";
import { BlockId } from "../../world/blocks.ts";
import { SagaLog } from "../traits/index.ts";
import { ArchetypeId } from "./archetype-data.ts";
import { resetEmitterState } from "./emitter-system.ts";
import { Face, RuneId } from "./rune-data.ts";
import { getRuneIndex, resetRuneIndex } from "./rune-index.ts";
import { SettlementLevel } from "./settlement-data.ts";
import {
	getActiveSettlements,
	resetSettlementState,
	type SettlementEffects,
	settlementSystem,
} from "./settlement-system.ts";

// Mock archetype detection to control what archetypes are found
vi.mock("./archetype-detect.ts", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./archetype-detect.ts")>();
	return {
		...actual,
		detectAllArchetypes: vi.fn(() => []),
	};
});

import { detectAllArchetypes } from "./archetype-detect.ts";

const mockDetect = vi.mocked(detectAllArchetypes);

const SCAN_DT = 2.1;

function stoneWorld(): number {
	return BlockId.Stone;
}

function noopEffects(): SettlementEffects {
	return { spawnParticles: vi.fn() };
}

/** Place at least one rune in the index so collectAllRunes finds something. */
function seedRuneIndex() {
	const index = getRuneIndex();
	index.setRune(5, 10, 5, Face.PosX, RuneId.Kenaz);
	index.setRune(7, 10, 5, Face.PosX, RuneId.Jera);
	index.setRune(6, 10, 5, Face.PosX, RuneId.Algiz);
}

function foundingArchetypes() {
	return [
		{ type: ArchetypeId.Hearth, cx: 0, cz: 0, x: 5, y: 10, z: 5 },
		{ type: ArchetypeId.Workshop, cx: 0, cz: 0, x: 7, y: 10, z: 5 },
		{ type: ArchetypeId.Ward, cx: 0, cz: 0, x: 6, y: 10, z: 5 },
	];
}

beforeEach(() => {
	resetSettlementState();
	resetRuneIndex();
	resetEmitterState();
	mockDetect.mockReset();
	mockDetect.mockReturnValue([]);
});

afterEach(() => {
	resetSettlementState();
	resetRuneIndex();
	resetEmitterState();
});

describe("settlementSystem", () => {
	it("does not scan before interval elapses", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		spawnWorldTime(world, { dayCount: 1 });
		seedRuneIndex();
		mockDetect.mockReturnValue(foundingArchetypes());

		settlementSystem(world, 0.5, stoneWorld, noopEffects());
		expect(getActiveSettlements()).toHaveLength(0);
	});

	it("returns early when no player exists", () => {
		const world = createTestWorld();
		spawnWorldTime(world, { dayCount: 1 });
		seedRuneIndex();

		settlementSystem(world, SCAN_DT, stoneWorld, noopEffects());
		expect(getActiveSettlements()).toHaveLength(0);
	});

	it("returns empty when no runes are inscribed", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		spawnWorldTime(world, { dayCount: 1 });
		// No runes seeded, no archetypes

		settlementSystem(world, SCAN_DT, stoneWorld, noopEffects());
		expect(getActiveSettlements()).toHaveLength(0);
	});

	it("detects a hamlet with Hearth+Workshop+Ward", () => {
		const world = createTestWorld();
		spawnPlayer(world, {
			position: { x: 5, y: 10, z: 5 },
			shelter: { inShelter: true },
		});
		spawnWorldTime(world, { dayCount: 1 });
		seedRuneIndex();
		mockDetect.mockReturnValue(foundingArchetypes());

		settlementSystem(world, SCAN_DT, stoneWorld, noopEffects());

		const settlements = getActiveSettlements();
		expect(settlements).toHaveLength(1);
		expect(settlements[0].level).toBe(SettlementLevel.Hamlet);
		expect(settlements[0].name.length).toBeGreaterThan(0);
	});

	it("generates a saga entry when settlement is founded", () => {
		const world = createTestWorld();
		spawnPlayer(world, {
			position: { x: 5, y: 10, z: 5 },
			shelter: { inShelter: true },
		});
		spawnWorldTime(world, { dayCount: 5 });
		seedRuneIndex();
		mockDetect.mockReturnValue(foundingArchetypes());

		settlementSystem(world, SCAN_DT, stoneWorld, noopEffects());

		let sagaEntries: Array<{ milestoneId: string; day: number; text: string }> = [];
		world.query(SagaLog).readEach(([saga]) => {
			sagaEntries = [...saga.entries];
		});

		expect(sagaEntries.length).toBeGreaterThan(0);
		expect(sagaEntries[0].milestoneId).toContain("settlement_founded");
		expect(sagaEntries[0].day).toBe(5);
		expect(sagaEntries[0].text).toContain("founded");
	});

	it("spawns celebration particles on founding", () => {
		const world = createTestWorld();
		spawnPlayer(world, {
			position: { x: 5, y: 10, z: 5 },
			shelter: { inShelter: true },
		});
		spawnWorldTime(world, { dayCount: 1 });
		seedRuneIndex();
		mockDetect.mockReturnValue(foundingArchetypes());

		const fx = { spawnParticles: vi.fn() };
		settlementSystem(world, SCAN_DT, stoneWorld, fx);

		expect(fx.spawnParticles).toHaveBeenCalledWith(
			expect.any(Number),
			expect.any(Number),
			expect.any(Number),
			0xffd700,
			20,
		);
	});

	it("detects village level with 4+ archetypes", () => {
		const world = createTestWorld();
		spawnPlayer(world, {
			position: { x: 5, y: 10, z: 5 },
			shelter: { inShelter: true },
		});
		spawnWorldTime(world, { dayCount: 1 });
		seedRuneIndex();
		mockDetect.mockReturnValue([...foundingArchetypes(), { type: ArchetypeId.Farm, cx: 0, cz: 0, x: 10, y: 10, z: 5 }]);

		settlementSystem(world, SCAN_DT, stoneWorld, noopEffects());

		const settlements = getActiveSettlements();
		expect(settlements).toHaveLength(1);
		expect(settlements[0].level).toBe(SettlementLevel.Village);
	});

	it("records saga entry when settlement grows", () => {
		const world = createTestWorld();
		spawnPlayer(world, {
			position: { x: 5, y: 10, z: 5 },
			shelter: { inShelter: true },
		});
		spawnWorldTime(world, { dayCount: 10 });
		seedRuneIndex();

		// Tick 1: founded as hamlet
		mockDetect.mockReturnValue(foundingArchetypes());
		settlementSystem(world, SCAN_DT, stoneWorld, noopEffects());

		// Tick 2: grew to village
		mockDetect.mockReturnValue([...foundingArchetypes(), { type: ArchetypeId.Farm, cx: 0, cz: 0, x: 10, y: 10, z: 5 }]);
		settlementSystem(world, 2.0, stoneWorld, noopEffects());

		let sagaEntries: Array<{ milestoneId: string; text: string }> = [];
		world.query(SagaLog).readEach(([saga]) => {
			sagaEntries = [...saga.entries];
		});

		const grewEntry = sagaEntries.find((e) => e.milestoneId.includes("settlement_grew"));
		expect(grewEntry).toBeDefined();
		expect(grewEntry?.text).toContain("village");
	});

	it("does not re-trigger founding on subsequent scans", () => {
		const world = createTestWorld();
		spawnPlayer(world, {
			position: { x: 5, y: 10, z: 5 },
			shelter: { inShelter: true },
		});
		spawnWorldTime(world, { dayCount: 1 });
		seedRuneIndex();
		mockDetect.mockReturnValue(foundingArchetypes());

		settlementSystem(world, SCAN_DT, stoneWorld, noopEffects());
		let firstCount = 0;
		world.query(SagaLog).readEach(([saga]) => {
			firstCount = saga.entries.length;
		});

		settlementSystem(world, 2.0, stoneWorld, noopEffects());
		let secondCount = 0;
		world.query(SagaLog).readEach(([saga]) => {
			secondCount = saga.entries.length;
		});

		expect(secondCount).toBe(firstCount);
	});

	it("resetSettlementState clears cached settlements", () => {
		const world = createTestWorld();
		spawnPlayer(world, {
			position: { x: 5, y: 10, z: 5 },
			shelter: { inShelter: true },
		});
		spawnWorldTime(world, { dayCount: 1 });
		seedRuneIndex();
		mockDetect.mockReturnValue(foundingArchetypes());

		settlementSystem(world, SCAN_DT, stoneWorld, noopEffects());
		expect(getActiveSettlements().length).toBeGreaterThan(0);

		resetSettlementState();
		expect(getActiveSettlements()).toHaveLength(0);
	});
});
