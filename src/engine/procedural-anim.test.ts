import { describe, expect, it } from "vitest";
import { advanceBlend, blendAnimParams, getAnimConfig, getStateParams, oscillate } from "./procedural-anim.ts";

describe("oscillate", () => {
	it("returns 0 at time 0 with no phase", () => {
		expect(oscillate(0, 1, 1)).toBe(0);
	});

	it("amplitude scales the output", () => {
		const result = oscillate(Math.PI / 2, 1, 3);
		expect(result).toBeCloseTo(3);
	});

	it("output stays within [-amplitude, amplitude]", () => {
		for (let t = 0; t < 10; t += 0.1) {
			const val = oscillate(t, 2.5, 0.7);
			expect(Math.abs(val)).toBeLessThanOrEqual(0.7 + 0.001);
		}
	});

	it("frequency controls oscillation speed", () => {
		// At frequency 2, a full cycle completes in half the time
		const slow = oscillate(1, 1, 1);
		const fast = oscillate(0.5, 2, 1);
		expect(fast).toBeCloseTo(slow);
	});

	it("phase offsets the wave", () => {
		const withoutPhase = oscillate(0, 1, 1);
		const withPhase = oscillate(0, 1, 1, Math.PI / 2);
		expect(withoutPhase).toBeCloseTo(0);
		expect(withPhase).toBeCloseTo(1);
	});

	it("returns 0 for zero amplitude", () => {
		expect(oscillate(5, 3, 0)).toBe(0);
	});
});

describe("getAnimConfig", () => {
	it("returns Mörker config for morker species", () => {
		const config = getAnimConfig("morker");
		expect(config.breathAmp).toBe(0.04);
		expect(config.breathFreq).toBe(1.2);
	});

	it("returns Trana config for trana species", () => {
		const config = getAnimConfig("trana");
		expect(config.breathAmp).toBe(0.02);
	});

	it("returns Lindorm config with zero walkSwingAmp", () => {
		const config = getAnimConfig("lindorm");
		expect(config.walkSwingAmp).toBe(0);
	});

	it("falls back to default for unknown species", () => {
		const config = getAnimConfig("vittra");
		expect(config.breathAmp).toBe(0.03);
		expect(config.breathFreq).toBe(1.5);
	});

	it("returns lyktgubbe config for lyktgubbe", () => {
		const config = getAnimConfig("lyktgubbe");
		expect(config.breathAmp).toBe(0.06);
		expect(config.breathFreq).toBe(0.6);
		expect(config.walkSwingAmp).toBe(0);
	});

	it("all configs have positive breathAmp and breathFreq", () => {
		for (const species of ["morker", "trana", "lindorm", "lyktgubbe"] as const) {
			const config = getAnimConfig(species);
			expect(config.breathAmp).toBeGreaterThan(0);
			expect(config.breathFreq).toBeGreaterThan(0);
		}
	});
});

describe("getStateParams", () => {
	it("returns idle params", () => {
		const p = getStateParams("idle");
		expect(p.moveSpeed).toBe(0);
		expect(p.bodyBob).toBe(1.0);
	});

	it("returns chase params with higher body bob", () => {
		const idle = getStateParams("idle");
		const chase = getStateParams("chase");
		expect(chase.bodyBob).toBeGreaterThan(idle.bodyBob);
	});

	it("attack has highest arm swing", () => {
		const atk = getStateParams("attack");
		const idle = getStateParams("idle");
		const walk = getStateParams("walk");
		expect(atk.armSwing).toBeGreaterThan(idle.armSwing);
		expect(atk.armSwing).toBeGreaterThan(walk.armSwing);
	});

	it("all states have defined params", () => {
		for (const state of ["idle", "walk", "chase", "attack", "flee", "burn"] as const) {
			const p = getStateParams(state);
			expect(p).toBeDefined();
			expect(typeof p.bodyBob).toBe("number");
		}
	});
});

describe("blendAnimParams", () => {
	const idle = getStateParams("idle");
	const chase = getStateParams("chase");

	it("returns from-params at t=0", () => {
		const blended = blendAnimParams(idle, chase, 0);
		expect(blended.bodyBob).toBeCloseTo(idle.bodyBob);
		expect(blended.armSwing).toBeCloseTo(idle.armSwing);
	});

	it("returns to-params at t=1", () => {
		const blended = blendAnimParams(idle, chase, 1);
		expect(blended.bodyBob).toBeCloseTo(chase.bodyBob);
		expect(blended.armSwing).toBeCloseTo(chase.armSwing);
	});

	it("interpolates at t=0.5", () => {
		const blended = blendAnimParams(idle, chase, 0.5);
		const expected = (idle.bodyBob + chase.bodyBob) / 2;
		expect(blended.bodyBob).toBeCloseTo(expected);
	});

	it("clamps t below 0 to 0", () => {
		const blended = blendAnimParams(idle, chase, -1);
		expect(blended.bodyBob).toBeCloseTo(idle.bodyBob);
	});

	it("clamps t above 1 to 1", () => {
		const blended = blendAnimParams(idle, chase, 5);
		expect(blended.bodyBob).toBeCloseTo(chase.bodyBob);
	});

	it("blends all four parameters", () => {
		const blended = blendAnimParams(idle, chase, 0.25);
		for (const key of ["bodyBob", "headSway", "armSwing", "moveSpeed"] as const) {
			const expected = idle[key] + (chase[key] - idle[key]) * 0.25;
			expect(blended[key]).toBeCloseTo(expected);
		}
	});
});

describe("advanceBlend", () => {
	it("advances toward 1.0", () => {
		const result = advanceBlend(0, 0.1, 4);
		expect(result).toBeCloseTo(0.4);
	});

	it("clamps at 1.0", () => {
		expect(advanceBlend(0.9, 1.0, 4)).toBe(1.0);
	});

	it("stays at 1.0 if already complete", () => {
		expect(advanceBlend(1.0, 0.1, 4)).toBe(1.0);
	});

	it("uses default speed of 4.0", () => {
		const result = advanceBlend(0, 0.25);
		expect(result).toBeCloseTo(1.0);
	});

	it("faster speed completes transition sooner", () => {
		const slow = advanceBlend(0, 0.1, 2);
		const fast = advanceBlend(0, 0.1, 8);
		expect(fast).toBeGreaterThan(slow);
	});
});
