import { describe, expect, it } from "vitest";
import {
	computeSeason,
	GRASS_TINT,
	hungerDrainMultiplier,
	isSnowSeason,
	isTranaMigrationSeason,
	LEAF_TINT,
	morkerStrengthMultiplier,
	nightDurationMultiplier,
	SEASON_LENGTH,
	Season,
	seasonProgress,
} from "./season-data.ts";

describe("computeSeason", () => {
	it("day 1 is Vår (spring)", () => {
		expect(computeSeason(1)).toBe(Season.Var);
	});

	it("cycles through all four seasons", () => {
		expect(computeSeason(1)).toBe(Season.Var);
		expect(computeSeason(SEASON_LENGTH + 1)).toBe(Season.Sommar);
		expect(computeSeason(SEASON_LENGTH * 2 + 1)).toBe(Season.Host);
		expect(computeSeason(SEASON_LENGTH * 3 + 1)).toBe(Season.Vinter);
	});

	it("wraps back to Vår after full year", () => {
		const yearLength = SEASON_LENGTH * 4;
		expect(computeSeason(yearLength + 1)).toBe(Season.Var);
		expect(computeSeason(yearLength * 2 + 1)).toBe(Season.Var);
	});

	it("last day of each season is still that season", () => {
		expect(computeSeason(SEASON_LENGTH)).toBe(Season.Var);
		expect(computeSeason(SEASON_LENGTH * 2)).toBe(Season.Sommar);
		expect(computeSeason(SEASON_LENGTH * 3)).toBe(Season.Host);
		expect(computeSeason(SEASON_LENGTH * 4)).toBe(Season.Vinter);
	});

	it("handles day 0 gracefully", () => {
		expect(computeSeason(0)).toBe(Season.Var);
	});
});

describe("seasonProgress", () => {
	it("returns 0 at start of season", () => {
		expect(seasonProgress(1)).toBe(0);
	});

	it("returns midpoint at middle of season", () => {
		const mid = 1 + Math.floor(SEASON_LENGTH / 2);
		expect(seasonProgress(mid)).toBeCloseTo(0.5, 1);
	});

	it("approaches 1 at end of season", () => {
		const p = seasonProgress(SEASON_LENGTH);
		expect(p).toBeGreaterThan(0.5);
		expect(p).toBeLessThan(1);
	});
});

describe("nightDurationMultiplier", () => {
	it("Vår has neutral night duration", () => {
		expect(nightDurationMultiplier(Season.Var)).toBe(1.0);
	});

	it("Sommar has shorter nights", () => {
		expect(nightDurationMultiplier(Season.Sommar)).toBeLessThan(1.0);
	});

	it("Vinter has longer nights", () => {
		expect(nightDurationMultiplier(Season.Vinter)).toBeGreaterThan(1.0);
	});

	it("Höst has slightly longer nights", () => {
		const host = nightDurationMultiplier(Season.Host);
		expect(host).toBeGreaterThan(1.0);
		expect(host).toBeLessThan(nightDurationMultiplier(Season.Vinter));
	});
});

describe("hungerDrainMultiplier", () => {
	it("Vinter has highest hunger drain", () => {
		const vinter = hungerDrainMultiplier(Season.Vinter);
		expect(vinter).toBeGreaterThan(hungerDrainMultiplier(Season.Var));
		expect(vinter).toBeGreaterThan(hungerDrainMultiplier(Season.Sommar));
		expect(vinter).toBeGreaterThan(hungerDrainMultiplier(Season.Host));
	});

	it("Sommar has lowest hunger drain", () => {
		expect(hungerDrainMultiplier(Season.Sommar)).toBeLessThan(1.0);
	});
});

describe("morkerStrengthMultiplier", () => {
	it("Vinter makes Mörker strongest", () => {
		expect(morkerStrengthMultiplier(Season.Vinter)).toBe(1.5);
	});

	it("Sommar weakens Mörker", () => {
		expect(morkerStrengthMultiplier(Season.Sommar)).toBeLessThan(1.0);
	});
});

describe("isTranaMigrationSeason", () => {
	it("Tranor migrate in Höst", () => {
		expect(isTranaMigrationSeason(Season.Host)).toBe(true);
	});

	it("Tranor migrate in Vinter", () => {
		expect(isTranaMigrationSeason(Season.Vinter)).toBe(true);
	});

	it("Tranor do not migrate in Vår", () => {
		expect(isTranaMigrationSeason(Season.Var)).toBe(false);
	});

	it("Tranor do not migrate in Sommar", () => {
		expect(isTranaMigrationSeason(Season.Sommar)).toBe(false);
	});
});

describe("visual tints", () => {
	it("each season has a unique leaf tint", () => {
		const tints = new Set(Object.values(LEAF_TINT));
		expect(tints.size).toBe(4);
	});

	it("each season has a unique grass tint", () => {
		const tints = new Set(Object.values(GRASS_TINT));
		expect(tints.size).toBe(4);
	});
});

describe("isSnowSeason", () => {
	it("only Vinter has snow", () => {
		expect(isSnowSeason(Season.Vinter)).toBe(true);
		expect(isSnowSeason(Season.Var)).toBe(false);
		expect(isSnowSeason(Season.Sommar)).toBe(false);
		expect(isSnowSeason(Season.Host)).toBe(false);
	});
});
