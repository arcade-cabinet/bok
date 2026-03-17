import { describe, expect, test } from "vitest";
import { RuneId } from "../../ecs/systems/rune-data.ts";
import type { PredictionContext } from "./rune-predictor.ts";
import { predictRunes, topPredictions } from "./rune-predictor.ts";

/** Minimal context with just discovered runes. */
function ctx(overrides: Partial<PredictionContext> = {}): PredictionContext {
	return {
		discovered: [RuneId.Kenaz, RuneId.Fehu, RuneId.Isa],
		recentPlacements: [],
		adjacentRunes: [],
		placementCounts: {},
		...overrides,
	};
}

describe("predictRunes", () => {
	test("returns all discovered runes", () => {
		const result = predictRunes(ctx());
		expect(result.length).toBe(3);
		const ids = result.map((p) => p.runeId);
		expect(ids).toContain(RuneId.Kenaz);
		expect(ids).toContain(RuneId.Fehu);
		expect(ids).toContain(RuneId.Isa);
	});

	test("returns empty for no discovered runes", () => {
		const result = predictRunes(ctx({ discovered: [] }));
		expect(result.length).toBe(0);
	});

	test("recently placed rune ranks higher", () => {
		const result = predictRunes(ctx({ recentPlacements: [RuneId.Isa] }));
		// Isa should be first due to recency boost
		expect(result[0].runeId).toBe(RuneId.Isa);
	});

	test("most recent placement outranks older ones", () => {
		const result = predictRunes(ctx({ recentPlacements: [RuneId.Fehu, RuneId.Kenaz] }));
		// Fehu is most recent (index 0), should rank highest
		expect(result[0].runeId).toBe(RuneId.Fehu);
	});

	test("adjacent rune gets a boost", () => {
		const result = predictRunes(ctx({ adjacentRunes: [RuneId.Kenaz] }));
		// Kenaz should rank high due to adjacency
		expect(result[0].runeId).toBe(RuneId.Kenaz);
	});

	test("frequently placed rune gets slight boost", () => {
		const result = predictRunes(
			ctx({
				placementCounts: { [RuneId.Isa]: 50, [RuneId.Kenaz]: 1, [RuneId.Fehu]: 0 },
			}),
		);
		// Isa has most placements, should rank highest from frequency alone
		expect(result[0].runeId).toBe(RuneId.Isa);
	});

	test("recency outweighs frequency", () => {
		const result = predictRunes(
			ctx({
				recentPlacements: [RuneId.Fehu],
				placementCounts: { [RuneId.Isa]: 100, [RuneId.Fehu]: 1 },
			}),
		);
		// Fehu was just placed (recency weight 4) vs Isa frequency (weight 1)
		expect(result[0].runeId).toBe(RuneId.Fehu);
	});

	test("all scores are non-negative", () => {
		const result = predictRunes(ctx());
		for (const p of result) {
			expect(p.score).toBeGreaterThanOrEqual(0);
		}
	});
});

describe("topPredictions", () => {
	test("returns top N rune IDs", () => {
		const top = topPredictions(ctx(), 2);
		expect(top.length).toBe(2);
	});

	test("returns all if N exceeds discovered count", () => {
		const top = topPredictions(ctx(), 10);
		expect(top.length).toBe(3);
	});

	test("default N is 5", () => {
		const discovered = [RuneId.Kenaz, RuneId.Fehu, RuneId.Isa, RuneId.Berkanan, RuneId.Algiz, RuneId.Sowilo];
		const top = topPredictions(ctx({ discovered }));
		expect(top.length).toBe(5);
	});
});
