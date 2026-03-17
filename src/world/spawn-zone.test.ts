import { describe, expect, test } from "vitest";
import { Biome } from "./biomes.ts";
import { clampSpawnHeight, forceSpawnBiome, forEachSpawnChunk, isInSpawnZone, isTreeSuppressed } from "./spawn-zone.ts";

describe("spawn-zone", () => {
	describe("isInSpawnZone", () => {
		test("origin chunk is in spawn zone", () => {
			expect(isInSpawnZone(0, 0)).toBe(true);
		});

		test("adjacent chunks are in spawn zone", () => {
			expect(isInSpawnZone(-1, -1)).toBe(true);
			expect(isInSpawnZone(1, 1)).toBe(true);
			expect(isInSpawnZone(-1, 1)).toBe(true);
			expect(isInSpawnZone(1, -1)).toBe(true);
		});

		test("chunks beyond 3x3 are NOT in spawn zone", () => {
			expect(isInSpawnZone(2, 0)).toBe(false);
			expect(isInSpawnZone(0, -2)).toBe(false);
			expect(isInSpawnZone(5, 5)).toBe(false);
		});
	});

	describe("forceSpawnBiome", () => {
		test("returns Ängen for positions in spawn zone", () => {
			expect(forceSpawnBiome(8, 8)).toBe(Biome.Angen);
			expect(forceSpawnBiome(0, 0)).toBe(Biome.Angen);
			expect(forceSpawnBiome(-16, -16)).toBe(Biome.Angen);
			expect(forceSpawnBiome(31, 31)).toBe(Biome.Angen);
		});

		test("returns null outside spawn zone", () => {
			expect(forceSpawnBiome(32, 0)).toBe(null);
			expect(forceSpawnBiome(100, 100)).toBe(null);
			expect(forceSpawnBiome(-32, -32)).toBe(null);
		});
	});

	describe("isTreeSuppressed", () => {
		test("suppressed at shrine center", () => {
			expect(isTreeSuppressed(8, 8)).toBe(true);
		});

		test("suppressed within 8-block radius", () => {
			expect(isTreeSuppressed(12, 8)).toBe(true);
			expect(isTreeSuppressed(0, 8)).toBe(true);
		});

		test("NOT suppressed far from shrine", () => {
			expect(isTreeSuppressed(20, 20)).toBe(false);
			expect(isTreeSuppressed(-10, -10)).toBe(false);
		});
	});

	describe("clampSpawnHeight", () => {
		const TARGET = 12;

		test("at shrine center, height matches target", () => {
			expect(clampSpawnHeight(8, 8, 20, TARGET)).toBe(TARGET);
		});

		test("at flatten edge, allows full variation", () => {
			// At distance 14 (FLATTEN_RADIUS), height is unclamped
			const h = clampSpawnHeight(8 + 14, 8, 20, TARGET);
			expect(h).toBeGreaterThanOrEqual(TARGET);
		});

		test("outside flatten radius, returns raw height", () => {
			expect(clampSpawnHeight(100, 100, 25, TARGET)).toBe(25);
		});

		test("smoothly transitions between flat and natural", () => {
			const center = clampSpawnHeight(8, 8, 20, TARGET);
			const mid = clampSpawnHeight(8 + 7, 8, 20, TARGET);
			const edge = clampSpawnHeight(8 + 13, 8, 20, TARGET);
			// Center should be flattest, edge should allow more variation
			expect(Math.abs(center - TARGET)).toBeLessThanOrEqual(Math.abs(mid - TARGET));
			expect(Math.abs(mid - TARGET)).toBeLessThanOrEqual(Math.abs(edge - TARGET));
		});
	});

	describe("forEachSpawnChunk", () => {
		test("iterates exactly 9 chunks", () => {
			const chunks: [number, number][] = [];
			forEachSpawnChunk((cx, cz) => chunks.push([cx, cz]));
			expect(chunks).toHaveLength(9);
		});

		test("includes all expected chunks", () => {
			const keys = new Set<string>();
			forEachSpawnChunk((cx, cz) => keys.add(`${cx},${cz}`));
			expect(keys.has("0,0")).toBe(true);
			expect(keys.has("-1,-1")).toBe(true);
			expect(keys.has("1,1")).toBe(true);
			expect(keys.has("-1,1")).toBe(true);
			expect(keys.has("1,-1")).toBe(true);
		});
	});
});
