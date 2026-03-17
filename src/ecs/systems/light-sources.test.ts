import { describe, expect, it } from "vitest";
import { BlockId } from "../../world/blocks.ts";
import {
	BLOCK_LIGHT_RADIUS,
	getBlockLightRadius,
	getItemLightRadius,
	ITEM_LIGHT_RADIUS,
	isInLight,
	LIGHT_DPS,
	type LightSource,
	lightDamageToMorker,
	lightIntensityAt,
	maxLightIntensity,
} from "./light-sources.ts";

describe("light-sources", () => {
	// ─── Light Radii Constants ───

	describe("block light radii", () => {
		it("torch has radius 4", () => {
			expect(BLOCK_LIGHT_RADIUS[BlockId.Torch]).toBe(4);
		});

		it("forge has radius 4", () => {
			expect(BLOCK_LIGHT_RADIUS[BlockId.Forge]).toBe(4);
		});

		it("crystal has radius 6", () => {
			expect(BLOCK_LIGHT_RADIUS[BlockId.Crystal]).toBe(6);
		});
	});

	describe("item light radii", () => {
		it("lantern (108) has radius 8", () => {
			expect(ITEM_LIGHT_RADIUS[108]).toBe(8);
		});

		it("ember lantern (109) has radius 12", () => {
			expect(ITEM_LIGHT_RADIUS[109]).toBe(12);
		});
	});

	// ─── Light Intensity ───

	describe("lightIntensityAt", () => {
		it("returns 0 outside radius", () => {
			expect(lightIntensityAt(0, 0, 0, 4, 5, 0, 0)).toBe(0);
		});

		it("returns 1 at source center", () => {
			expect(lightIntensityAt(5, 5, 5, 4, 5, 5, 5)).toBe(1);
		});

		it("returns linear falloff at half radius", () => {
			const intensity = lightIntensityAt(0, 0, 0, 4, 2, 0, 0);
			expect(intensity).toBeCloseTo(0.5, 5);
		});

		it("returns 0 at exactly the radius boundary", () => {
			expect(lightIntensityAt(0, 0, 0, 4, 4, 0, 0)).toBe(0);
		});

		it("considers Y distance", () => {
			// distance = sqrt(0 + 9 + 0) = 3; radius 4 → intensity 0.25
			const intensity = lightIntensityAt(0, 0, 0, 4, 0, 3, 0);
			expect(intensity).toBeCloseTo(0.25, 5);
		});
	});

	// ─── Max Light Intensity ───

	describe("maxLightIntensity", () => {
		it("returns 0 for empty source list", () => {
			expect(maxLightIntensity([], 0, 0, 0)).toBe(0);
		});

		it("returns the maximum from multiple sources", () => {
			const sources: LightSource[] = [
				{ x: 0, y: 0, z: 0, radius: 4 }, // at (2,0,0): intensity 0.5
				{ x: 3, y: 0, z: 0, radius: 4 }, // at (2,0,0): dist=1, intensity 0.75
			];
			const intensity = maxLightIntensity(sources, 2, 0, 0);
			expect(intensity).toBeCloseTo(0.75, 5);
		});
	});

	// ─── isInLight ───

	describe("isInLight", () => {
		const sources: LightSource[] = [{ x: 10, y: 5, z: 10, radius: 4 }];

		it("returns true inside radius", () => {
			expect(isInLight(sources, 10, 5, 12)).toBe(true);
		});

		it("returns false outside radius", () => {
			expect(isInLight(sources, 10, 5, 20)).toBe(false);
		});

		it("returns false for empty sources", () => {
			expect(isInLight([], 0, 0, 0)).toBe(false);
		});
	});

	// ─── Light Damage ───

	describe("lightDamageToMorker", () => {
		it("returns 0 when intensity is 0", () => {
			expect(lightDamageToMorker(0, 1)).toBe(0);
		});

		it("returns full DPS at intensity 1.0 over 1 second", () => {
			expect(lightDamageToMorker(1.0, 1.0)).toBe(LIGHT_DPS);
		});

		it("scales linearly with intensity", () => {
			const dmg = lightDamageToMorker(0.5, 1.0);
			expect(dmg).toBeCloseTo(LIGHT_DPS * 0.5, 5);
		});

		it("scales linearly with dt", () => {
			const dmg = lightDamageToMorker(1.0, 0.016);
			expect(dmg).toBeCloseTo(LIGHT_DPS * 0.016, 5);
		});
	});

	// ─── Lookup Helpers ───

	describe("getBlockLightRadius", () => {
		it("returns radius for torch", () => {
			expect(getBlockLightRadius(BlockId.Torch)).toBe(4);
		});

		it("returns 0 for non-light block", () => {
			expect(getBlockLightRadius(BlockId.Stone)).toBe(0);
		});
	});

	describe("getItemLightRadius", () => {
		it("returns radius for lantern", () => {
			expect(getItemLightRadius(108)).toBe(8);
		});

		it("returns radius for ember lantern", () => {
			expect(getItemLightRadius(109)).toBe(12);
		});

		it("returns 0 for non-light item", () => {
			expect(getItemLightRadius(101)).toBe(0);
		});
	});
});
