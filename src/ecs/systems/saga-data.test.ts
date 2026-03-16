import { describe, expect, it } from "vitest";
import {
	computeActiveObjective,
	computeSagaStats,
	createSagaEntry,
	detectNewMilestones,
	MilestoneId,
} from "./saga-data.ts";

describe("createSagaEntry", () => {
	it("generates entry with correct milestone and day", () => {
		const entry = createSagaEntry(MilestoneId.FirstShelter, 2);
		expect(entry.milestoneId).toBe("first_shelter");
		expect(entry.day).toBe(2);
		expect(entry.text).toContain("walls against the dark");
	});

	it("generates prose for all milestones", () => {
		for (const id of Object.values(MilestoneId)) {
			const entry = createSagaEntry(id, 1);
			expect(entry.text.length).toBeGreaterThan(10);
		}
	});
});

describe("detectNewMilestones", () => {
	const empty = new Set<string>();

	it("detects first shelter milestone", () => {
		const result = detectNewMilestones(empty, 1, 0, 0, true, 0, 1, false, 0, 0);
		expect(result).toContain(MilestoneId.FirstShelter);
	});

	it("detects first creature kill", () => {
		const result = detectNewMilestones(empty, 1, 0, 0, false, 1, 1, false, 0, 0);
		expect(result).toContain(MilestoneId.FirstCreatureKill);
	});

	it("detects first biome at 2+ biomes", () => {
		const result = detectNewMilestones(empty, 1, 0, 0, false, 0, 2, false, 0, 0);
		expect(result).toContain(MilestoneId.FirstBiome);
	});

	it("does not trigger first biome at 1 biome", () => {
		const result = detectNewMilestones(empty, 1, 0, 0, false, 0, 1, false, 0, 0);
		expect(result).not.toContain(MilestoneId.FirstBiome);
	});

	it("detects day thresholds", () => {
		expect(detectNewMilestones(empty, 3, 0, 0, false, 0, 1, false, 0, 0)).toContain(MilestoneId.Day3);
		expect(detectNewMilestones(empty, 7, 0, 0, false, 0, 1, false, 0, 0)).toContain(MilestoneId.Day7);
		expect(detectNewMilestones(empty, 14, 0, 0, false, 0, 1, false, 0, 0)).toContain(MilestoneId.Day14);
		expect(detectNewMilestones(empty, 30, 0, 0, false, 0, 1, false, 0, 0)).toContain(MilestoneId.Day30);
	});

	it("detects block milestones from combined placed+mined", () => {
		const result = detectNewMilestones(empty, 1, 60, 40, false, 0, 1, false, 0, 0);
		expect(result).toContain(MilestoneId.Blocks100);
	});

	it("detects boss defeated", () => {
		const result = detectNewMilestones(empty, 1, 0, 0, false, 0, 1, true, 0, 0);
		expect(result).toContain(MilestoneId.BossDefeated);
	});

	it("detects first observation", () => {
		const result = detectNewMilestones(empty, 1, 0, 0, false, 0, 1, false, 1, 0);
		expect(result).toContain(MilestoneId.FirstObservation);
	});

	it("detects first lore", () => {
		const result = detectNewMilestones(empty, 1, 0, 0, false, 0, 1, false, 0, 1);
		expect(result).toContain(MilestoneId.FirstLore);
	});

	it("does not re-trigger achieved milestones", () => {
		const achieved = new Set([MilestoneId.FirstShelter]);
		const result = detectNewMilestones(achieved, 1, 0, 0, true, 0, 1, false, 0, 0);
		expect(result).not.toContain(MilestoneId.FirstShelter);
	});

	it("triggers multiple milestones at once", () => {
		const result = detectNewMilestones(empty, 7, 0, 0, true, 1, 2, false, 0, 0);
		expect(result).toContain(MilestoneId.FirstShelter);
		expect(result).toContain(MilestoneId.FirstCreatureKill);
		expect(result).toContain(MilestoneId.FirstBiome);
		expect(result).toContain(MilestoneId.Day3);
		expect(result).toContain(MilestoneId.Day7);
	});
});

describe("computeActiveObjective", () => {
	const empty = new Set<string>();

	it("returns shelter objective first", () => {
		const obj = computeActiveObjective(1, false, false, empty);
		expect(obj).not.toBeNull();
		expect(obj!.text).toContain("shelter");
	});

	it("returns creature kill after shelter achieved", () => {
		const achieved = new Set([MilestoneId.FirstShelter]);
		const obj = computeActiveObjective(1, true, false, achieved);
		expect(obj).not.toBeNull();
		expect(obj!.text).toContain("creature");
	});

	it("returns day survival after kill achieved", () => {
		const achieved = new Set([MilestoneId.FirstShelter, MilestoneId.FirstCreatureKill]);
		const obj = computeActiveObjective(1, true, true, achieved);
		expect(obj).not.toBeNull();
		expect(obj!.text).toContain("Survive 3 days");
		expect(obj!.progress).toBe(1);
		expect(obj!.target).toBe(3);
	});

	it("progresses to next day threshold", () => {
		const achieved = new Set([MilestoneId.FirstShelter, MilestoneId.FirstCreatureKill, MilestoneId.Day3]);
		const obj = computeActiveObjective(5, true, true, achieved);
		expect(obj).not.toBeNull();
		expect(obj!.text).toContain("Survive 7 days");
		expect(obj!.progress).toBe(5);
		expect(obj!.target).toBe(7);
	});

	it("returns boss objective after all day milestones", () => {
		const achieved = new Set([
			MilestoneId.FirstShelter,
			MilestoneId.FirstCreatureKill,
			MilestoneId.Day3,
			MilestoneId.Day7,
			MilestoneId.Day14,
			MilestoneId.Day30,
		]);
		const obj = computeActiveObjective(35, true, true, achieved);
		expect(obj).not.toBeNull();
		expect(obj!.text).toContain("Jätten");
	});

	it("returns null when all objectives complete", () => {
		const achieved = new Set([
			MilestoneId.FirstShelter,
			MilestoneId.FirstCreatureKill,
			MilestoneId.Day3,
			MilestoneId.Day7,
			MilestoneId.Day14,
			MilestoneId.Day30,
			MilestoneId.BossDefeated,
		]);
		const obj = computeActiveObjective(35, true, true, achieved);
		expect(obj).toBeNull();
	});
});

describe("computeSagaStats", () => {
	it("counts observed creatures with progress > 0", () => {
		const stats = computeSagaStats(5, 10, 20, { morker: 0.5, lyktgubbe: 0.1, trana: 0 });
		expect(stats.creaturesObserved).toBe(2);
	});

	it("returns correct day/block counts", () => {
		const stats = computeSagaStats(12, 300, 150, {});
		expect(stats.daysSurvived).toBe(12);
		expect(stats.blocksPlaced).toBe(300);
		expect(stats.blocksMined).toBe(150);
		expect(stats.creaturesObserved).toBe(0);
	});
});
