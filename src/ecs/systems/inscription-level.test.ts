import { describe, expect, it } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { InscriptionLevel } from "../traits/index.ts";
import {
	computeInscriptionLevel,
	getSpawnRateMultiplier,
	INSCRIPTION_TIERS,
	isThresholdReached,
} from "./inscription-level.ts";

// ─── Pure formula tests ───

describe("computeInscriptionLevel", () => {
	it("returns 0 for no activity", () => {
		expect(computeInscriptionLevel(0, 0, 0)).toBe(0);
	});

	it("weights blocks placed at 1x", () => {
		expect(computeInscriptionLevel(100, 0, 0)).toBe(100);
	});

	it("weights blocks mined at 0.5x", () => {
		expect(computeInscriptionLevel(0, 200, 0)).toBe(100);
	});

	it("weights structures built at 10x", () => {
		expect(computeInscriptionLevel(0, 0, 5)).toBe(50);
	});

	it("combines all sources", () => {
		// 50 * 1 + 100 * 0.5 + 3 * 10 = 50 + 50 + 30 = 130
		expect(computeInscriptionLevel(50, 100, 3)).toBe(130);
	});
});

// ─── Spawn rate scaling tests ───

describe("getSpawnRateMultiplier", () => {
	it("returns 1.0 for level 0", () => {
		expect(getSpawnRateMultiplier(0)).toBe(1.0);
	});

	it("returns 1.2 for level 50", () => {
		expect(getSpawnRateMultiplier(50)).toBe(1.2);
	});

	it("returns 1.5 for level 200", () => {
		expect(getSpawnRateMultiplier(200)).toBe(1.5);
	});

	it("returns 2.0 for level 500+", () => {
		expect(getSpawnRateMultiplier(500)).toBe(2.0);
		expect(getSpawnRateMultiplier(1000)).toBe(2.0);
	});

	it("returns 1.0 for levels below 50", () => {
		expect(getSpawnRateMultiplier(10)).toBe(1.0);
		expect(getSpawnRateMultiplier(49)).toBe(1.0);
	});
});

// ─── Threshold tests ───

describe("isThresholdReached", () => {
	it("returns false below threshold", () => {
		expect(isThresholdReached(99, INSCRIPTION_TIERS.RUNVAKTARE_WAKE)).toBe(false);
	});

	it("returns true at exact threshold", () => {
		expect(isThresholdReached(100, INSCRIPTION_TIERS.RUNVAKTARE_WAKE)).toBe(true);
	});

	it("returns true above threshold", () => {
		expect(isThresholdReached(101, INSCRIPTION_TIERS.RUNVAKTARE_WAKE)).toBe(true);
	});

	it("gates Runvaktare at 100", () => {
		expect(isThresholdReached(99, INSCRIPTION_TIERS.RUNVAKTARE_WAKE)).toBe(false);
		expect(isThresholdReached(100, INSCRIPTION_TIERS.RUNVAKTARE_WAKE)).toBe(true);
	});

	it("gates Lindorm at 300", () => {
		expect(isThresholdReached(299, INSCRIPTION_TIERS.LINDORM_ATTRACT)).toBe(false);
		expect(isThresholdReached(300, INSCRIPTION_TIERS.LINDORM_ATTRACT)).toBe(true);
	});

	it("gates Jatten at 1000", () => {
		expect(isThresholdReached(999, INSCRIPTION_TIERS.JATTEN_WAKE)).toBe(false);
		expect(isThresholdReached(1000, INSCRIPTION_TIERS.JATTEN_WAKE)).toBe(true);
	});
});

// ─── ECS trait persistence round-trip ───

describe("InscriptionLevel trait", () => {
	it("starts at zero", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world);
		const ins = entity.get(InscriptionLevel);
		expect(ins?.totalBlocksPlaced).toBe(0);
		expect(ins?.totalBlocksMined).toBe(0);
		expect(ins?.structuresBuilt).toBe(0);
	});

	it("accepts overrides", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			inscription: { totalBlocksPlaced: 50, totalBlocksMined: 100, structuresBuilt: 3 },
		});
		const ins = entity.get(InscriptionLevel);
		expect(ins?.totalBlocksPlaced).toBe(50);
		expect(ins?.totalBlocksMined).toBe(100);
		expect(ins?.structuresBuilt).toBe(3);
	});

	it("round-trips through updateEach", () => {
		const world = createTestWorld();
		spawnPlayer(world);

		// Simulate mining 10 blocks and placing 5
		world.query(InscriptionLevel).updateEach(([ins]) => {
			ins.totalBlocksMined = 10;
			ins.totalBlocksPlaced = 5;
		});

		world.query(InscriptionLevel).readEach(([ins]) => {
			expect(ins.totalBlocksMined).toBe(10);
			expect(ins.totalBlocksPlaced).toBe(5);
			expect(computeInscriptionLevel(ins.totalBlocksPlaced, ins.totalBlocksMined, ins.structuresBuilt)).toBe(10);
		});
	});
});
