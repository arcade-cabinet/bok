import { describe, expect, it } from "vitest";
import { clampRenderDistance, DeviceTier, getPresetForTier, isValidTier, QUALITY_PRESETS } from "./quality-data.ts";

describe("quality-data", () => {
	describe("DeviceTier", () => {
		it("defines three tiers", () => {
			expect(DeviceTier.Low).toBe("low");
			expect(DeviceTier.Medium).toBe("medium");
			expect(DeviceTier.High).toBe("high");
		});
	});

	describe("QUALITY_PRESETS", () => {
		it("low tier has 512 shadow map and 100 particle budget", () => {
			const preset = QUALITY_PRESETS.low;
			expect(preset.shadowMapSize).toBe(512);
			expect(preset.particleBudget).toBe(100);
			expect(preset.ambientParticles).toBe(100);
			expect(preset.renderDistance).toBe(2);
		});

		it("medium tier has 1024 shadow map and 200 particle budget", () => {
			const preset = QUALITY_PRESETS.medium;
			expect(preset.shadowMapSize).toBe(1024);
			expect(preset.particleBudget).toBe(200);
			expect(preset.ambientParticles).toBe(200);
			expect(preset.renderDistance).toBe(3);
		});

		it("high tier has 1024 shadow map and 500 particle budget", () => {
			const preset = QUALITY_PRESETS.high;
			expect(preset.shadowMapSize).toBe(1024);
			expect(preset.particleBudget).toBe(500);
			expect(preset.ambientParticles).toBe(300);
			expect(preset.renderDistance).toBe(4);
		});

		it("particle budgets increase with tier: low < medium < high", () => {
			expect(QUALITY_PRESETS.low.particleBudget).toBeLessThan(QUALITY_PRESETS.medium.particleBudget);
			expect(QUALITY_PRESETS.medium.particleBudget).toBeLessThan(QUALITY_PRESETS.high.particleBudget);
		});

		it("shadow map is 512 on low tier, 1024 on medium/high", () => {
			expect(QUALITY_PRESETS.low.shadowMapSize).toBe(512);
			expect(QUALITY_PRESETS.medium.shadowMapSize).toBe(1024);
			expect(QUALITY_PRESETS.high.shadowMapSize).toBe(1024);
		});
	});

	describe("getPresetForTier", () => {
		it("returns correct preset for each tier", () => {
			expect(getPresetForTier("low").tier).toBe("low");
			expect(getPresetForTier("medium").tier).toBe("medium");
			expect(getPresetForTier("high").tier).toBe("high");
		});
	});

	describe("isValidTier", () => {
		it("accepts valid tiers", () => {
			expect(isValidTier("low")).toBe(true);
			expect(isValidTier("medium")).toBe(true);
			expect(isValidTier("high")).toBe(true);
		});

		it("rejects invalid strings", () => {
			expect(isValidTier("ultra")).toBe(false);
			expect(isValidTier("auto")).toBe(false);
			expect(isValidTier("")).toBe(false);
		});
	});

	describe("clampRenderDistance", () => {
		it("clamps to minimum of 2", () => {
			expect(clampRenderDistance(1, "high")).toBe(2);
			expect(clampRenderDistance(0, "low")).toBe(2);
		});

		it("clamps to tier maximum on low tier (3)", () => {
			expect(clampRenderDistance(5, "low")).toBe(3);
			expect(clampRenderDistance(3, "low")).toBe(3);
		});

		it("clamps to tier maximum on medium tier (4)", () => {
			expect(clampRenderDistance(5, "medium")).toBe(4);
			expect(clampRenderDistance(4, "medium")).toBe(4);
		});

		it("clamps to tier maximum on high tier (5)", () => {
			expect(clampRenderDistance(6, "high")).toBe(5);
			expect(clampRenderDistance(5, "high")).toBe(5);
		});

		it("passes through valid values", () => {
			expect(clampRenderDistance(2, "low")).toBe(2);
			expect(clampRenderDistance(3, "medium")).toBe(3);
			expect(clampRenderDistance(4, "high")).toBe(4);
		});
	});
});
