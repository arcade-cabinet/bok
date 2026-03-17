import { describe, expect, it } from "vitest";
import {
	AURORA_COLORS,
	auroraColor,
	auroraTintIntensity,
	COLOR_CYCLE_PERIOD,
	EVENT_DURATION,
	generateResourcePositions,
	isNightTime,
	packColor,
	RESOURCE_COUNT,
	RESOURCE_MIN_RADIUS,
	RESOURCE_RADIUS,
	shouldTrigger,
	TRIGGER_CHANCE,
} from "./norrsken-event.ts";

// ─── Night Detection ───

describe("isNightTime", () => {
	it("returns true at midnight (0.0)", () => {
		expect(isNightTime(0)).toBe(true);
	});

	it("returns true during night (0.75)", () => {
		expect(isNightTime(0.75)).toBe(true);
	});

	it("returns true at dusk boundary (0.5)", () => {
		expect(isNightTime(0.5)).toBe(true);
	});

	it("returns false at morning (0.25)", () => {
		expect(isNightTime(0.25)).toBe(false);
	});

	it("returns false at noon (0.4)", () => {
		expect(isNightTime(0.4)).toBe(false);
	});
});

// ─── Trigger Probability ───

describe("shouldTrigger", () => {
	it("triggers when rng is below threshold", () => {
		expect(shouldTrigger(0.01)).toBe(true);
	});

	it("triggers at exactly 0", () => {
		expect(shouldTrigger(0)).toBe(true);
	});

	it("does not trigger when rng equals threshold", () => {
		expect(shouldTrigger(TRIGGER_CHANCE)).toBe(false);
	});

	it("does not trigger when rng is above threshold", () => {
		expect(shouldTrigger(0.5)).toBe(false);
	});

	it("has a 5% chance", () => {
		expect(TRIGGER_CHANCE).toBe(0.05);
	});
});

// ─── Aurora Color Cycling ───

describe("auroraColor", () => {
	it("starts with green at t=0", () => {
		const color = auroraColor(0);
		expect(color.r).toBeCloseTo(0x88);
		expect(color.g).toBeCloseTo(0xff);
		expect(color.b).toBeCloseTo(0x88);
	});

	it("is pure purple at 1/3 cycle", () => {
		const t = COLOR_CYCLE_PERIOD / 3;
		const color = auroraColor(t);
		expect(color.r).toBeCloseTo(0xaa);
		expect(color.g).toBeCloseTo(0x66);
		expect(color.b).toBeCloseTo(0xcc);
	});

	it("is pure blue at 2/3 cycle", () => {
		const t = (COLOR_CYCLE_PERIOD * 2) / 3;
		const color = auroraColor(t);
		expect(color.r).toBeCloseTo(0x66);
		expect(color.g).toBeCloseTo(0xaa);
		expect(color.b).toBeCloseTo(0xff);
	});

	it("returns to green after full cycle", () => {
		const color = auroraColor(COLOR_CYCLE_PERIOD);
		expect(color.r).toBeCloseTo(0x88, 0);
		expect(color.g).toBeCloseTo(0xff, 0);
		expect(color.b).toBeCloseTo(0x88, 0);
	});

	it("interpolates between colors mid-transition", () => {
		const t = COLOR_CYCLE_PERIOD / 6; // Halfway between green and purple
		const color = auroraColor(t);
		// Should be midpoint of green(0x88ff88) and purple(0xaa66cc)
		expect(color.r).toBeCloseTo((0x88 + 0xaa) / 2, 0);
		expect(color.g).toBeCloseTo((0xff + 0x66) / 2, 0);
		expect(color.b).toBeCloseTo((0x88 + 0xcc) / 2, 0);
	});
});

describe("packColor", () => {
	it("packs RGB into hex", () => {
		expect(packColor(0x88, 0xff, 0x88)).toBe(0x88ff88);
	});

	it("packs black", () => {
		expect(packColor(0, 0, 0)).toBe(0x000000);
	});

	it("packs white", () => {
		expect(packColor(255, 255, 255)).toBe(0xffffff);
	});
});

describe("AURORA_COLORS", () => {
	it("contains exactly 3 colors (green, purple, blue)", () => {
		expect(AURORA_COLORS).toHaveLength(3);
		expect(AURORA_COLORS[0]).toBe(0x88ff88);
		expect(AURORA_COLORS[1]).toBe(0xaa66cc);
		expect(AURORA_COLORS[2]).toBe(0x66aaff);
	});
});

// ─── Resource Surfacing ───

describe("generateResourcePositions", () => {
	it("generates the requested number of positions", () => {
		const positions = generateResourcePositions(100, 100, 42, RESOURCE_COUNT);
		expect(positions).toHaveLength(RESOURCE_COUNT);
	});

	it("positions are within radius range", () => {
		const px = 50;
		const pz = 50;
		const positions = generateResourcePositions(px, pz, 123, 10);
		for (const pos of positions) {
			const dist = Math.sqrt((pos.x - px) ** 2 + (pos.z - pz) ** 2);
			// Floor can shift position by up to sqrt(2) ≈ 1.41
			expect(dist).toBeLessThanOrEqual(RESOURCE_RADIUS + 2);
			expect(dist).toBeGreaterThanOrEqual(RESOURCE_MIN_RADIUS - 2);
		}
	});

	it("returns integer positions", () => {
		const positions = generateResourcePositions(10.5, 20.7, 1, RESOURCE_COUNT);
		for (const pos of positions) {
			expect(Number.isInteger(pos.x)).toBe(true);
			expect(Number.isInteger(pos.z)).toBe(true);
		}
	});

	it("different seeds produce different positions", () => {
		const a = generateResourcePositions(0, 0, 1, 3);
		const b = generateResourcePositions(0, 0, 2, 3);
		const same = a.every((p, i) => p.x === b[i].x && p.z === b[i].z);
		expect(same).toBe(false);
	});

	it("same seed produces same positions", () => {
		const a = generateResourcePositions(0, 0, 42, 3);
		const b = generateResourcePositions(0, 0, 42, 3);
		expect(a).toEqual(b);
	});
});

// ─── Event Duration ───

describe("event constants", () => {
	it("event lasts 60 seconds", () => {
		expect(EVENT_DURATION).toBe(60);
	});

	it("trigger chance is 5%", () => {
		expect(TRIGGER_CHANCE).toBe(0.05);
	});
});

// ─── Aurora Tint Intensity ───

describe("auroraTintIntensity", () => {
	it("is 0 when timer equals event duration (just started, elapsed=0)", () => {
		expect(auroraTintIntensity(EVENT_DURATION)).toBeCloseTo(0);
	});

	it("fades in over 3 seconds", () => {
		const at1s = auroraTintIntensity(EVENT_DURATION - 1);
		const at3s = auroraTintIntensity(EVENT_DURATION - 3);
		expect(at1s).toBeCloseTo(1 / 3, 1);
		expect(at3s).toBeCloseTo(1, 1);
	});

	it("fades out in last 3 seconds", () => {
		const at3s = auroraTintIntensity(3);
		const at1s = auroraTintIntensity(1);
		expect(at3s).toBeCloseTo(1);
		expect(at1s).toBeCloseTo(1 / 3, 1);
	});

	it("is 0 when timer is 0 (event over)", () => {
		expect(auroraTintIntensity(0)).toBeCloseTo(0);
	});

	it("is ~1 at mid-event", () => {
		expect(auroraTintIntensity(EVENT_DURATION / 2)).toBeCloseTo(1, 1);
	});
});
