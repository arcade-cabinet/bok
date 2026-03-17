import { describe, expect, it } from "vitest";
import { generateResumeContext } from "./session-resume.ts";

describe("session-resume", () => {
	describe("generateResumeContext", () => {
		it("generates context with day count and time phrase", () => {
			const ctx = generateResumeContext(5, 0.35, 100, 100, false, [], null);
			expect(ctx.text).toContain("Day 5");
			expect(ctx.text).toContain("in the morning light");
			expect(ctx.text).toContain("in the wilds");
		});

		it("includes shelter location when sheltered", () => {
			const ctx = generateResumeContext(3, 0.5, 100, 100, true, [], null);
			expect(ctx.text).toContain("within your shelter");
		});

		it("includes health condition when low", () => {
			const ctx = generateResumeContext(1, 0.25, 20, 100, false, [], null);
			expect(ctx.text).toContain("badly wounded");
		});

		it("includes hunger condition when low", () => {
			const ctx = generateResumeContext(1, 0.25, 100, 15, false, [], null);
			expect(ctx.text).toContain("starving");
		});

		it("combines health and hunger conditions", () => {
			const ctx = generateResumeContext(1, 0.25, 40, 30, false, [], null);
			expect(ctx.text).toContain("hurt");
			expect(ctx.text).toContain("hungry");
		});

		it("includes last saga entry", () => {
			const entries = [{ text: "The wanderer built walls." }];
			const ctx = generateResumeContext(7, 0.5, 100, 100, false, entries, null);
			expect(ctx.text).toContain("The wanderer built walls.");
		});

		it("returns objective hint when provided", () => {
			const ctx = generateResumeContext(1, 0.25, 100, 100, false, [], "Build a shelter");
			expect(ctx.objectiveHint).toBe("Build a shelter");
		});

		it("returns null objective hint when not provided", () => {
			const ctx = generateResumeContext(1, 0.25, 100, 100, false, [], null);
			expect(ctx.objectiveHint).toBeNull();
		});

		it("uses night time phrase for late timeOfDay", () => {
			const ctx = generateResumeContext(1, 0.1, 100, 100, false, [], null);
			expect(ctx.text).toContain("deep of night");
		});

		it("uses dusk time phrase for evening", () => {
			const ctx = generateResumeContext(1, 0.75, 100, 100, false, [], null);
			expect(ctx.text).toContain("dusk");
		});

		it("uses dawn time phrase for early morning", () => {
			const ctx = generateResumeContext(1, 0.25, 100, 100, false, [], null);
			expect(ctx.text).toContain("dawn");
		});

		it("uses stars phrase for deep night", () => {
			const ctx = generateResumeContext(1, 0.9, 100, 100, false, [], null);
			expect(ctx.text).toContain("beneath the stars");
		});

		it("no condition clause when health and hunger are full", () => {
			const ctx = generateResumeContext(1, 0.25, 100, 100, false, [], null);
			// Should not contain condition markers
			expect(ctx.text).not.toContain("wounded");
			expect(ctx.text).not.toContain("hurt");
			expect(ctx.text).not.toContain("starving");
			expect(ctx.text).not.toContain("hungry");
		});

		it("uses last entry when multiple saga entries exist", () => {
			const entries = [{ text: "First entry." }, { text: "Second entry." }, { text: "Last entry." }];
			const ctx = generateResumeContext(10, 0.5, 100, 100, false, entries, null);
			expect(ctx.text).toContain("Last entry.");
			expect(ctx.text).not.toContain("First entry.");
		});
	});
});
