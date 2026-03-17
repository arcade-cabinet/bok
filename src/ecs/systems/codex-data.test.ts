import { describe, expect, it } from "vitest";
import { Species } from "../traits/index.ts";
import {
	CREATURE_ENTRIES,
	computeRevealStage,
	FULL_OBSERVE_DURATION,
	getCreatureEntry,
	getLoreEntry,
	getStageThreshold,
	LORE_ENTRIES,
	RevealStage,
} from "./codex-data.ts";

describe("codex-data", () => {
	// ─── Reveal Stages ───

	describe("computeRevealStage", () => {
		it("returns Hidden at 0 progress", () => {
			expect(computeRevealStage(0)).toBe(RevealStage.Hidden);
		});

		it("returns Hidden below silhouette threshold", () => {
			expect(computeRevealStage(0.24)).toBe(RevealStage.Hidden);
		});

		it("returns Silhouette at 25% progress", () => {
			expect(computeRevealStage(0.25)).toBe(RevealStage.Silhouette);
		});

		it("returns Basic at 60% progress", () => {
			expect(computeRevealStage(0.6)).toBe(RevealStage.Basic);
		});

		it("returns Full at 100% progress", () => {
			expect(computeRevealStage(1.0)).toBe(RevealStage.Full);
		});

		it("returns Basic between 60% and 99%", () => {
			expect(computeRevealStage(0.8)).toBe(RevealStage.Basic);
		});
	});

	describe("getStageThreshold", () => {
		it("returns 0 for Hidden", () => {
			expect(getStageThreshold(RevealStage.Hidden)).toBe(0);
		});

		it("returns 0.25 for Silhouette", () => {
			expect(getStageThreshold(RevealStage.Silhouette)).toBe(0.25);
		});

		it("returns 0.6 for Basic", () => {
			expect(getStageThreshold(RevealStage.Basic)).toBe(0.6);
		});

		it("returns 1.0 for Full", () => {
			expect(getStageThreshold(RevealStage.Full)).toBe(1.0);
		});
	});

	// ─── Creature Entries ───

	describe("creature entries", () => {
		it("has one entry per species", () => {
			const speciesIds = Object.values(Species);
			for (const sid of speciesIds) {
				expect(getCreatureEntry(sid)).toBeDefined();
			}
		});

		it("returns undefined for unknown species", () => {
			expect(getCreatureEntry("unknown" as never)).toBeUndefined();
		});

		it("entries have required fields", () => {
			for (const entry of CREATURE_ENTRIES) {
				expect(entry.name).toBeTruthy();
				expect(entry.description).toBeTruthy();
				expect(entry.weaknesses).toBeTruthy();
				expect(entry.drops).toBeTruthy();
				expect(entry.rune).toBeTruthy();
			}
		});
	});

	// ─── Lore Entries ───

	describe("lore entries", () => {
		it("has unique IDs", () => {
			const ids = LORE_ENTRIES.map((l) => l.id);
			expect(new Set(ids).size).toBe(ids.length);
		});

		it("getLoreEntry returns matching entry", () => {
			const entry = getLoreEntry("lore_rune_origin");
			expect(entry?.title).toBe("Origin of the Runes");
		});

		it("getLoreEntry returns undefined for unknown id", () => {
			expect(getLoreEntry("nonexistent")).toBeUndefined();
		});

		it("entries have valid source type", () => {
			for (const lore of LORE_ENTRIES) {
				expect(["runsten", "fornlamning"]).toContain(lore.source);
			}
		});
	});

	// ─── Constants ───

	describe("constants", () => {
		it("FULL_OBSERVE_DURATION is positive", () => {
			expect(FULL_OBSERVE_DURATION).toBeGreaterThan(0);
		});
	});
});
