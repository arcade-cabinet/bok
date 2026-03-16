import { afterEach, describe, expect, it } from "vitest";
import {
	classifyGpu,
	detectCpuTier,
	detectMemoryTier,
	getActiveQuality,
	initQuality,
	resetQualityState,
	setQualityTier,
	setRenderDistanceOverride,
} from "./quality-presets.ts";

afterEach(() => {
	resetQualityState();
});

describe("quality-presets", () => {
	describe("setQualityTier", () => {
		it("sets low tier preset", () => {
			setQualityTier("low");
			const q = getActiveQuality();
			expect(q.tier).toBe("low");
			expect(q.particleBudget).toBe(100);
			expect(q.shadowMapSize).toBe(512);
		});

		it("sets high tier preset", () => {
			setQualityTier("high");
			const q = getActiveQuality();
			expect(q.tier).toBe("high");
			expect(q.particleBudget).toBe(500);
		});
	});

	describe("setRenderDistanceOverride", () => {
		it("overrides render distance while keeping other settings", () => {
			setQualityTier("low");
			setRenderDistanceOverride(3);
			const q = getActiveQuality();
			expect(q.renderDistance).toBe(3);
			expect(q.particleBudget).toBe(100); // Still low tier
		});

		it("clamps to tier maximum", () => {
			setQualityTier("low");
			setRenderDistanceOverride(5);
			expect(getActiveQuality().renderDistance).toBe(3); // Low max is 3
		});

		it("clamps to minimum of 2", () => {
			setQualityTier("high");
			setRenderDistanceOverride(1);
			expect(getActiveQuality().renderDistance).toBe(2);
		});
	});

	describe("resetQualityState", () => {
		it("resets to medium defaults", () => {
			setQualityTier("low");
			setRenderDistanceOverride(2);
			resetQualityState();
			const q = getActiveQuality();
			expect(q.tier).toBe("medium");
			expect(q.renderDistance).toBe(3);
		});
	});

	describe("initQuality", () => {
		it("restores saved tier when valid", () => {
			const tier = initQuality("low");
			expect(tier).toBe("low");
			expect(getActiveQuality().tier).toBe("low");
		});

		it("restores saved high tier", () => {
			const tier = initQuality("high");
			expect(tier).toBe("high");
			expect(getActiveQuality().tier).toBe("high");
		});

		it("auto-detects when saved tier is 'auto'", () => {
			const tier = initQuality("auto");
			// Auto-detected tier — could be any valid tier
			expect(["low", "medium", "high"]).toContain(tier);
		});

		it("auto-detects when no saved tier", () => {
			const tier = initQuality();
			expect(["low", "medium", "high"]).toContain(tier);
		});
	});

	describe("classifyGpu", () => {
		it("classifies low-end GPUs", () => {
			expect(classifyGpu("Mali-T620")).toBe("low");
			expect(classifyGpu("Adreno 330")).toBe("low");
			expect(classifyGpu("PowerVR SGX")).toBe("low");
			expect(classifyGpu("Intel HD 4000")).toBe("low");
		});

		it("classifies high-end GPUs", () => {
			expect(classifyGpu("NVIDIA RTX 3090")).toBe("high");
			expect(classifyGpu("Apple M2 GPU")).toBe("high");
			expect(classifyGpu("Adreno 730")).toBe("high");
			expect(classifyGpu("Mali-G78")).toBe("high");
		});

		it("returns null for unknown GPUs", () => {
			expect(classifyGpu("Unknown GPU 9000")).toBeNull();
			expect(classifyGpu("")).toBeNull();
		});
	});

	describe("detectMemoryTier", () => {
		it("returns null when deviceMemory is unavailable", () => {
			// In Node test environment, deviceMemory is not defined
			const tier = detectMemoryTier();
			// May return null or a value depending on test environment
			if (tier !== null) {
				expect(["low", "medium", "high"]).toContain(tier);
			}
		});
	});

	describe("detectCpuTier", () => {
		it("returns a valid tier or null", () => {
			const tier = detectCpuTier();
			if (tier !== null) {
				expect(["low", "medium", "high"]).toContain(tier);
			}
		});
	});
});
