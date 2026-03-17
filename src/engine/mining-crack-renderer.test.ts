import { describe, expect, test } from "vitest";
import {
	computeCrackStage,
	computeChipCount,
	computeShatterParticles,
	CRACK_STAGES,
} from "./mining-crack-renderer.ts";

describe("mining-crack-renderer", () => {
	describe("computeCrackStage", () => {
		test("zero progress = stage 0 (no cracks)", () => {
			expect(computeCrackStage(0)).toBe(0);
		});

		test("progress 0.1 = stage 0", () => {
			expect(computeCrackStage(0.1)).toBe(0);
		});

		test("progress 0.25 = stage 1", () => {
			expect(computeCrackStage(0.25)).toBe(1);
		});

		test("progress 0.5 = stage 2", () => {
			expect(computeCrackStage(0.5)).toBe(2);
		});

		test("progress 0.75 = stage 3", () => {
			expect(computeCrackStage(0.75)).toBe(3);
		});

		test("progress just below threshold stays in previous stage", () => {
			expect(computeCrackStage(0.24)).toBe(0);
			expect(computeCrackStage(0.49)).toBe(1);
			expect(computeCrackStage(0.74)).toBe(2);
		});

		test("progress >= 1.0 clamps to stage 3", () => {
			expect(computeCrackStage(1.0)).toBe(3);
			expect(computeCrackStage(1.5)).toBe(3);
		});

		test("negative progress clamps to stage 0", () => {
			expect(computeCrackStage(-0.5)).toBe(0);
		});
	});

	describe("CRACK_STAGES", () => {
		test("has 4 stages", () => {
			expect(CRACK_STAGES).toHaveLength(4);
		});

		test("each stage has opacity and line count", () => {
			for (const stage of CRACK_STAGES) {
				expect(stage.opacity).toBeGreaterThanOrEqual(0);
				expect(stage.opacity).toBeLessThanOrEqual(1);
				expect(stage.lineCount).toBeGreaterThanOrEqual(0);
			}
		});

		test("opacity increases with stage", () => {
			for (let i = 1; i < CRACK_STAGES.length; i++) {
				expect(CRACK_STAGES[i].opacity).toBeGreaterThan(
					CRACK_STAGES[i - 1].opacity,
				);
			}
		});
	});

	describe("computeChipCount", () => {
		test("stage 0 spawns no chips", () => {
			expect(computeChipCount(0)).toBe(0);
		});

		test("stage 1 spawns 1 chip", () => {
			expect(computeChipCount(1)).toBe(1);
		});

		test("stage 2 spawns 2 chips", () => {
			expect(computeChipCount(2)).toBe(2);
		});

		test("stage 3 spawns 3 chips", () => {
			expect(computeChipCount(3)).toBe(3);
		});
	});

	describe("computeShatterParticles", () => {
		test("returns shatter data when progress >= 1.0", () => {
			const result = computeShatterParticles(1.0);
			expect(result).not.toBeNull();
			expect(result!.count).toBe(15);
			expect(result!.burstSpeed).toBeGreaterThan(0);
		});

		test("returns null when progress < 1.0", () => {
			expect(computeShatterParticles(0.5)).toBeNull();
			expect(computeShatterParticles(0.99)).toBeNull();
		});

		test("shatter still triggers above 1.0", () => {
			expect(computeShatterParticles(1.5)).not.toBeNull();
		});
	});
});
