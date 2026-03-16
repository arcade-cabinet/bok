import { describe, expect, it } from "vitest";
import { Biome } from "../../world/biomes.ts";
import {
	COLOR_AMBER,
	COLOR_BLUE,
	createScatterState,
	DAWN_END,
	DAWN_START,
	DEEP_WATER_LEVEL,
	DRIFT_AMP,
	driftOffset,
	isLyktgubbeBiome,
	isLyktgubbeTime,
	lyktgubbeColor,
	REFORM_THRESHOLD,
	SCATTER_RANGE,
	SCATTER_SPEED,
	TWILIGHT_END,
	TWILIGHT_START,
	triggerScatter,
	updateScatter,
	WATER_LEVEL,
} from "./lyktgubbe-drift.ts";

describe("isLyktgubbeTime", () => {
	it("returns true during twilight (skymning)", () => {
		expect(isLyktgubbeTime(0.75)).toBe(true);
		expect(isLyktgubbeTime(TWILIGHT_START)).toBe(true);
		expect(isLyktgubbeTime(TWILIGHT_END)).toBe(true);
	});

	it("returns true during dawn (morgon)", () => {
		expect(isLyktgubbeTime(0.2)).toBe(true);
		expect(isLyktgubbeTime(DAWN_START)).toBe(true);
		expect(isLyktgubbeTime(DAWN_END)).toBe(true);
	});

	it("returns false during daytime", () => {
		expect(isLyktgubbeTime(0.5)).toBe(false);
		expect(isLyktgubbeTime(0.35)).toBe(false);
	});

	it("returns false during deep night", () => {
		expect(isLyktgubbeTime(0.0)).toBe(false);
		expect(isLyktgubbeTime(0.1)).toBe(false);
	});

	it("returns false just outside windows", () => {
		expect(isLyktgubbeTime(TWILIGHT_START - 0.01)).toBe(false);
		expect(isLyktgubbeTime(TWILIGHT_END + 0.01)).toBe(false);
		expect(isLyktgubbeTime(DAWN_START - 0.01)).toBe(false);
		expect(isLyktgubbeTime(DAWN_END + 0.01)).toBe(false);
	});
});

describe("isLyktgubbeBiome", () => {
	it("returns true for Angen, Bokskogen, Myren", () => {
		expect(isLyktgubbeBiome(Biome.Angen)).toBe(true);
		expect(isLyktgubbeBiome(Biome.Bokskogen)).toBe(true);
		expect(isLyktgubbeBiome(Biome.Myren)).toBe(true);
	});

	it("returns false for other biomes", () => {
		expect(isLyktgubbeBiome(Biome.Fjallen)).toBe(false);
		expect(isLyktgubbeBiome(Biome.Skargarden)).toBe(false);
		expect(isLyktgubbeBiome(Biome.Blothogen)).toBe(false);
	});
});

describe("driftOffset", () => {
	it("produces bounded offsets within drift amplitude", () => {
		for (let t = 0; t < 100; t += 0.5) {
			const { dx, dy, dz } = driftOffset(t, 0);
			expect(Math.abs(dx)).toBeLessThanOrEqual(DRIFT_AMP + 0.01);
			expect(Math.abs(dz)).toBeLessThanOrEqual(DRIFT_AMP + 0.01);
			expect(Math.abs(dy)).toBeLessThan(1); // vertical bob is smaller
		}
	});

	it("different phases produce different offsets at the same time", () => {
		const a = driftOffset(5.0, 0);
		const b = driftOffset(5.0, 1.5);
		// Very unlikely to be identical with different phases
		expect(a.dx).not.toBeCloseTo(b.dx, 2);
	});

	it("returns zero offset at time=0 phase=0", () => {
		const { dx, dy, dz } = driftOffset(0, 0);
		expect(dx).toBeCloseTo(0, 5);
		expect(dy).toBeCloseTo(0, 5);
		expect(dz).toBeCloseTo(0, 5);
	});
});

describe("triggerScatter", () => {
	it("produces velocity away from the player", () => {
		const result = triggerScatter(10, 10, 5, 10);
		// Player is at x=5, creature at x=10: should scatter in +x direction
		expect(result.velX).toBeGreaterThan(0);
		expect(result.scattered).toBe(true);
	});

	it("scatter velocity magnitude equals SCATTER_SPEED", () => {
		const result = triggerScatter(10, 10, 5, 5);
		const speed = Math.sqrt(result.velX ** 2 + result.velZ ** 2);
		expect(speed).toBeCloseTo(SCATTER_SPEED, 1);
	});

	it("handles zero distance gracefully", () => {
		const result = triggerScatter(5, 5, 5, 5);
		expect(result.scattered).toBe(true);
		expect(result.velX).toBe(0);
		expect(result.velZ).toBe(0);
	});
});

describe("updateScatter", () => {
	it("applies velocity and drag when scattered", () => {
		const state = {
			scattered: true,
			velX: SCATTER_SPEED,
			velZ: 0,
			offsetX: 0,
			offsetZ: 0,
		};

		const updated = updateScatter(state, 0.016);
		expect(updated.offsetX).toBeGreaterThan(0);
		expect(Math.abs(updated.velX)).toBeLessThan(SCATTER_SPEED);
	});

	it("transitions from scattered to reform when velocity dies", () => {
		let state = {
			scattered: true,
			velX: 0.05,
			velZ: 0.05,
			offsetX: 3,
			offsetZ: 3,
		};

		state = updateScatter(state, 1.0); // large dt to kill velocity
		expect(state.scattered).toBe(false);
	});

	it("reforms toward anchor (offset approaches zero)", () => {
		let state = {
			scattered: false,
			velX: 0,
			velZ: 0,
			offsetX: 5,
			offsetZ: 0,
		};

		const initial = state.offsetX;
		state = updateScatter(state, 0.1);
		expect(Math.abs(state.offsetX)).toBeLessThan(initial);
	});

	it("snaps to zero when within reform threshold", () => {
		const state = {
			scattered: false,
			velX: 0,
			velZ: 0,
			offsetX: REFORM_THRESHOLD * 0.5,
			offsetZ: 0,
		};

		const updated = updateScatter(state, 0.1);
		expect(updated.offsetX).toBe(0);
		expect(updated.offsetZ).toBe(0);
	});

	it("createScatterState returns non-scattered initial state", () => {
		const state = createScatterState();
		expect(state.scattered).toBe(false);
		expect(state.offsetX).toBe(0);
		expect(state.offsetZ).toBe(0);
	});
});

describe("lyktgubbeColor", () => {
	it("returns amber at or above water level", () => {
		expect(lyktgubbeColor(WATER_LEVEL)).toBe(COLOR_AMBER);
		expect(lyktgubbeColor(WATER_LEVEL + 5)).toBe(COLOR_AMBER);
	});

	it("returns blue at or below deep water level", () => {
		expect(lyktgubbeColor(DEEP_WATER_LEVEL)).toBe(COLOR_BLUE);
		expect(lyktgubbeColor(DEEP_WATER_LEVEL - 3)).toBe(COLOR_BLUE);
	});

	it("interpolates between amber and blue in transition zone", () => {
		const midY = (WATER_LEVEL + DEEP_WATER_LEVEL) / 2;
		const color = lyktgubbeColor(midY);
		// Should be between amber and blue — not equal to either
		expect(color).not.toBe(COLOR_AMBER);
		expect(color).not.toBe(COLOR_BLUE);

		// Red channel should be between amber-red and blue-red
		const r = (color >> 16) & 0xff;
		const amberR = (COLOR_AMBER >> 16) & 0xff;
		const blueR = (COLOR_BLUE >> 16) & 0xff;
		expect(r).toBeGreaterThanOrEqual(blueR);
		expect(r).toBeLessThanOrEqual(amberR);
	});

	it("SCATTER_RANGE is positive", () => {
		expect(SCATTER_RANGE).toBeGreaterThan(0);
	});
});
