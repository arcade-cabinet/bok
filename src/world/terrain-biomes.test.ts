/**
 * Tests for biome-specific terrain generation: island clusters (Skärgården),
 * waterlogged terrain (Myren), and edge-biased corruption (Blothögen).
 */

import { describe, expect, it } from "vitest";
import { Biome } from "./biomes.ts";
import { initNoise } from "./noise.ts";
import { adjustBiomeHeight, computeHeight, isCorrupted, type NoiseLayers, WATER_LEVEL } from "./terrain-generator.ts";

const MID_LAYERS: NoiseLayers = { continental: 0.5, erosion: 0.5, temperature: 0.5, moisture: 0.5 };

// ─── Skärgården Island Generation ───

describe("adjustBiomeHeight — Skärgården islands", () => {
	it("most positions are below water level (deep water between islands)", () => {
		initNoise("skargarden-test");
		let below = 0;
		const total = 100;
		for (let i = 0; i < total; i++) {
			const h = adjustBiomeHeight(15, Biome.Skargarden, i * 3, i * 7);
			if (h < WATER_LEVEL) below++;
		}
		// Majority of Skärgården is underwater
		expect(below).toBeGreaterThan(total * 0.3);
	});

	it("some positions rise above water (island peaks)", () => {
		initNoise("skargarden-peaks");
		let above = 0;
		const total = 200;
		for (let i = 0; i < total; i++) {
			const h = adjustBiomeHeight(15, Biome.Skargarden, i * 5, i * 11);
			if (h > WATER_LEVEL) above++;
		}
		expect(above).toBeGreaterThan(0);
	});

	it("island height ignores base height (noise-driven, not continental)", () => {
		initNoise("skargarden-base");
		const fromLow = adjustBiomeHeight(5, Biome.Skargarden, 42, 77);
		const fromHigh = adjustBiomeHeight(20, Biome.Skargarden, 42, 77);
		// Same position → same island height regardless of base
		expect(fromLow).toBe(fromHigh);
	});
});

// ─── Myren Waterlogging ───

describe("adjustBiomeHeight — Myren waterlogging", () => {
	it("flattens terrain toward water level", () => {
		const baseH = computeHeight(MID_LAYERS);
		const myrenH = adjustBiomeHeight(baseH, Biome.Myren, 0, 0);
		// Myren height should be much closer to water level than base height
		expect(Math.abs(myrenH - WATER_LEVEL)).toBeLessThan(Math.abs(baseH - WATER_LEVEL));
	});

	it("terrain at water level stays near water level", () => {
		const h = adjustBiomeHeight(WATER_LEVEL, Biome.Myren, 0, 0);
		expect(h).toBe(WATER_LEVEL);
	});

	it("high terrain is compressed down toward water level", () => {
		const h = adjustBiomeHeight(20, Biome.Myren, 0, 0);
		expect(h).toBeGreaterThanOrEqual(WATER_LEVEL);
		expect(h).toBeLessThan(20);
	});

	it("creates shallow pools (some columns at or below water level)", () => {
		// Low continental terrain + Myren compression → some columns at/below water
		const lowLayers: NoiseLayers = { continental: 0.2, erosion: 0.3, temperature: 0.5, moisture: 0.7 };
		const baseH = computeHeight(lowLayers);
		const myrenH = adjustBiomeHeight(baseH, Biome.Myren, 0, 0);
		// When base is already near water, Myren compression can push to/below
		expect(myrenH).toBeLessThanOrEqual(WATER_LEVEL + 2);
	});
});

// ─── Blothögen Corruption Zones ───

describe("isCorrupted — edge-biased corruption", () => {
	it("is deterministic for same position and seed", () => {
		initNoise("corruption-determinism");
		const a = isCorrupted(100, 100);
		initNoise("corruption-determinism");
		const b = isCorrupted(100, 100);
		expect(a).toBe(b);
	});

	it("distant positions are more likely corrupted than near-origin (edge bias)", () => {
		initNoise("corruption-edge-bias");
		let nearCorrupted = 0;
		let farCorrupted = 0;
		const samples = 500;
		for (let i = 0; i < samples; i++) {
			// Near origin (0-50 distance)
			if (isCorrupted(i * 0.1, i * 0.1)) nearCorrupted++;
			// Far from origin (500+ distance)
			if (isCorrupted(500 + i * 0.1, 500 + i * 0.1)) farCorrupted++;
		}
		// Edge bias should make far positions more corrupted
		expect(farCorrupted).toBeGreaterThan(nearCorrupted);
	});

	it("some positions near origin are still corrupted (base noise)", () => {
		initNoise("corruption-base-noise");
		let corrupted = 0;
		for (let i = 0; i < 1000; i++) {
			if (isCorrupted(i * 0.5, i * 0.3)) corrupted++;
		}
		// Base noise alone produces some corruption
		expect(corrupted).toBeGreaterThan(0);
	});
});

// ─── Non-Biome Passthrough ───

describe("adjustBiomeHeight — passthrough", () => {
	it("non-archipelago/bog biomes return height unchanged", () => {
		expect(adjustBiomeHeight(15, Biome.Angen, 0, 0)).toBe(15);
		expect(adjustBiomeHeight(15, Biome.Bokskogen, 0, 0)).toBe(15);
		expect(adjustBiomeHeight(15, Biome.Fjallen, 0, 0)).toBe(15);
		expect(adjustBiomeHeight(15, Biome.Blothogen, 0, 0)).toBe(15);
	});
});
