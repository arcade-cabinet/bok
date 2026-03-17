/**
 * Tests for underground cave system: carving threshold, ore depth bands,
 * cluster determinism, water pools, and connectivity.
 */

import { describe, expect, it } from "vitest";
import { BlockId } from "./blocks.ts";
import {
	applyCaveToStone,
	CAVE_SURFACE_BUFFER,
	CAVE_THRESHOLD,
	CAVE_WATER_LEVEL,
	caveNoise,
	getOreBlock,
	isCave,
	isCaveWater,
	ORE_BANDS,
} from "./cave-generator.ts";
import { initNoise } from "./noise.ts";

// ─── 3D Cave Noise ───

describe("caveNoise", () => {
	it("returns values in approximately [-1, 1]", () => {
		initNoise("cave-noise-range");
		for (let i = 0; i < 200; i++) {
			const n = caveNoise(i * 7.3, i * 2.1, i * 11.9);
			expect(n).toBeGreaterThanOrEqual(-1.5);
			expect(n).toBeLessThanOrEqual(1.5);
		}
	});

	it("is deterministic (same coords → same result)", () => {
		initNoise("cave-determinism");
		const a = caveNoise(42, 8, 99);
		const b = caveNoise(42, 8, 99);
		expect(a).toBe(b);
	});

	it("varies across all three axes", () => {
		initNoise("cave-3d-variation");
		const base = caveNoise(10, 10, 10);
		expect(caveNoise(40, 10, 10)).not.toBe(base);
		expect(caveNoise(10, 40, 10)).not.toBe(base);
		expect(caveNoise(10, 10, 40)).not.toBe(base);
	});
});

// ─── Cave Carving ───

describe("isCave", () => {
	it("never carves at y=0 (bedrock layer)", () => {
		initNoise("cave-bedrock");
		for (let x = 0; x < 100; x++) {
			expect(isCave(x * 3, 0, x * 7, 20)).toBe(false);
		}
	});

	it("never carves within surface buffer", () => {
		initNoise("cave-surface-buffer");
		const surfaceY = 20;
		for (let y = surfaceY - CAVE_SURFACE_BUFFER; y <= surfaceY; y++) {
			for (let x = 0; x < 50; x++) {
				expect(isCave(x * 3, y, x * 5, surfaceY)).toBe(false);
			}
		}
	});

	it("carves some positions below surface buffer", () => {
		initNoise("cave-carves-underground");
		let found = false;
		for (let x = 0; x < 200 && !found; x++) {
			for (let y = 1; y < 17 && !found; y++) {
				if (isCave(x, y, x * 3, 20)) found = true;
			}
		}
		expect(found).toBe(true);
	});

	it("caves have neighboring cave voxels (connected, not isolated)", () => {
		initNoise("cave-connectivity");
		let tested = false;
		const surfaceY = 25;
		for (let gx = 0; gx < 100 && !tested; gx++) {
			for (let gz = 0; gz < 100 && !tested; gz++) {
				for (let y = 2; y < surfaceY - CAVE_SURFACE_BUFFER && !tested; y++) {
					if (!isCave(gx, y, gz, surfaceY)) continue;
					const hasNeighbor =
						isCave(gx + 1, y, gz, surfaceY) ||
						isCave(gx - 1, y, gz, surfaceY) ||
						isCave(gx, y + 1, gz, surfaceY) ||
						isCave(gx, y - 1, gz, surfaceY) ||
						isCave(gx, y, gz + 1, surfaceY) ||
						isCave(gx, y, gz - 1, surfaceY);
					expect(hasNeighbor).toBe(true);
					tested = true;
				}
			}
		}
		expect(tested).toBe(true);
	});

	it("threshold determines carving (noise > CAVE_THRESHOLD → cave)", () => {
		initNoise("cave-threshold-test");
		// Verify relationship: isCave returns true iff noise > threshold
		const surfaceY = 25;
		for (let x = 0; x < 50; x++) {
			const y = 5;
			const noise = caveNoise(x, y, x * 2);
			const carved = isCave(x, y, x * 2, surfaceY);
			expect(carved).toBe(noise > CAVE_THRESHOLD);
		}
	});
});

// ─── Ore Depth Bands ───

describe("getOreBlock", () => {
	it("iron ore only appears at y 5–15", () => {
		initNoise("ore-iron-band");
		for (let x = 0; x < 200; x++) {
			for (let y = 0; y < 32; y++) {
				const ore = getOreBlock(x * 5, y, x * 3);
				if (ore === BlockId.IronOre) {
					expect(y).toBeGreaterThanOrEqual(5);
					expect(y).toBeLessThanOrEqual(15);
				}
			}
		}
	});

	it("copper ore only appears at y 10–20", () => {
		initNoise("ore-copper-band");
		for (let x = 0; x < 200; x++) {
			for (let y = 0; y < 32; y++) {
				const ore = getOreBlock(x * 5, y, x * 3);
				if (ore === BlockId.CopperOre) {
					expect(y).toBeGreaterThanOrEqual(10);
					expect(y).toBeLessThanOrEqual(20);
				}
			}
		}
	});

	it("crystal only appears at y 20+", () => {
		initNoise("ore-crystal-band");
		for (let x = 0; x < 200; x++) {
			for (let y = 0; y < 32; y++) {
				const ore = getOreBlock(x * 5, y, x * 3);
				if (ore === BlockId.Crystal) {
					expect(y).toBeGreaterThanOrEqual(20);
				}
			}
		}
	});

	it("ore placement is deterministic", () => {
		initNoise("ore-determinism");
		for (let i = 0; i < 50; i++) {
			const a = getOreBlock(i * 7, 10, i * 11);
			const b = getOreBlock(i * 7, 10, i * 11);
			expect(a).toBe(b);
		}
	});

	it("some positions have ore (clusters exist)", () => {
		initNoise("ore-clusters-exist");
		let found = false;
		for (let x = 0; x < 200 && !found; x++) {
			if (getOreBlock(x, 10, x * 3) !== null) found = true;
		}
		expect(found).toBe(true);
	});

	it("ore bands are correctly configured per AC", () => {
		expect(ORE_BANDS).toEqual([
			{ blockId: BlockId.IronOre, minY: 5, maxY: 15, offset: 0 },
			{ blockId: BlockId.CopperOre, minY: 10, maxY: 20, offset: 500 },
			{ blockId: BlockId.Crystal, minY: 20, maxY: 32, offset: 1000 },
		]);
	});
});

// ─── Cave Water Pools ───

describe("isCaveWater", () => {
	it("never places water above CAVE_WATER_LEVEL", () => {
		initNoise("water-level-cap");
		for (let x = 0; x < 100; x++) {
			for (let y = CAVE_WATER_LEVEL + 1; y < 25; y++) {
				expect(isCaveWater(x, y, x * 3)).toBe(false);
			}
		}
	});

	it("places water in some deep cave positions", () => {
		initNoise("water-deep-caves");
		let found = false;
		for (let x = 0; x < 200 && !found; x++) {
			for (let y = 1; y <= CAVE_WATER_LEVEL && !found; y++) {
				if (isCaveWater(x, y, x * 3)) found = true;
			}
		}
		expect(found).toBe(true);
	});
});

// ─── Integration ───

describe("applyCaveToStone", () => {
	it("returns air (0) for cave positions", () => {
		initNoise("apply-cave-air");
		let foundAir = false;
		for (let x = 0; x < 200 && !foundAir; x++) {
			const result = applyCaveToStone(x, 5, x * 3, 20);
			if (result === 0) foundAir = true;
		}
		expect(foundAir).toBe(true);
	});

	it("returns ore for some non-cave positions in valid bands", () => {
		initNoise("apply-ore-placement");
		let foundOre = false;
		for (let x = 0; x < 200 && !foundOre; x++) {
			const result = applyCaveToStone(x, 10, x * 3, 20);
			if (result === BlockId.IronOre || result === BlockId.CopperOre) foundOre = true;
		}
		expect(foundOre).toBe(true);
	});

	it("returns stone for positions with no cave or ore", () => {
		initNoise("apply-default-stone");
		// At y=0, surface buffer applies but ore check still runs
		// At y outside all ore bands with no cave, should be stone
		let foundStone = false;
		for (let x = 0; x < 200 && !foundStone; x++) {
			const result = applyCaveToStone(x, 2, x * 3, 20);
			if (result === BlockId.Stone) foundStone = true;
		}
		expect(foundStone).toBe(true);
	});

	it("returns water for deep cave intersections", () => {
		initNoise("apply-water-pool");
		let foundWater = false;
		for (let x = 0; x < 300 && !foundWater; x++) {
			const result = applyCaveToStone(x, 4, x * 3, 20);
			if (result === BlockId.Water) foundWater = true;
		}
		expect(foundWater).toBe(true);
	});
});
