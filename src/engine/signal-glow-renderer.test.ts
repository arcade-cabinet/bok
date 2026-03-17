import { describe, expect, test } from "vitest";
import { RuneId } from "../ecs/systems/rune-data.ts";
import {
	computeGlowIntensity,
	computePulsePhase,
	isEmitterGlow,
} from "./signal-glow-renderer.ts";

describe("signal-glow-renderer", () => {
	describe("computeGlowIntensity", () => {
		test("zero signal = zero glow", () => {
			expect(computeGlowIntensity(0)).toBe(0);
		});

		test("full signal = full glow", () => {
			expect(computeGlowIntensity(10)).toBeCloseTo(1, 1);
		});

		test("partial signal = partial glow", () => {
			const glow = computeGlowIntensity(5);
			expect(glow).toBeGreaterThan(0);
			expect(glow).toBeLessThan(1);
		});

		test("glow is clamped to [0, 1]", () => {
			expect(computeGlowIntensity(-5)).toBe(0);
			expect(computeGlowIntensity(100)).toBe(1);
		});
	});

	describe("computePulsePhase", () => {
		test("returns value in [0, 1] for any time", () => {
			for (let t = 0; t < 10; t += 0.3) {
				const phase = computePulsePhase(t);
				expect(phase).toBeGreaterThanOrEqual(0);
				expect(phase).toBeLessThanOrEqual(1);
			}
		});

		test("varies over time (not constant)", () => {
			const a = computePulsePhase(0);
			const b = computePulsePhase(0.5);
			expect(a).not.toBeCloseTo(b, 1);
		});
	});

	describe("isEmitterGlow", () => {
		test("Kenaz is an emitter", () => {
			expect(isEmitterGlow(RuneId.Kenaz)).toBe(true);
		});

		test("Sowilo is an emitter", () => {
			expect(isEmitterGlow(RuneId.Sowilo)).toBe(true);
		});

		test("Fehu is not an emitter", () => {
			expect(isEmitterGlow(RuneId.Fehu)).toBe(false);
		});

		test("RuneId.None is not an emitter", () => {
			expect(isEmitterGlow(0)).toBe(false);
		});
	});
});
