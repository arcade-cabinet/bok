import { describe, expect, it } from "vitest";
import { FULL_OBSERVE_DURATION } from "./codex-data.ts";
import { isCreatureInView, OBSERVE_MAX_RANGE, tickObservation } from "./observation.ts";

describe("observation", () => {
	// ─── isCreatureInView ───

	describe("isCreatureInView", () => {
		it("returns true when creature is directly ahead", () => {
			// Player at origin looking along +Z (yaw=0)
			expect(isCreatureInView(0, 0, 0, 0, 10)).toBe(true);
		});

		it("returns false when creature is behind player", () => {
			// Player looking along +Z, creature at -Z
			expect(isCreatureInView(0, 0, 0, 0, -10)).toBe(false);
		});

		it("returns true when creature is within view cone", () => {
			// Player looking along +Z, creature slightly to the side
			expect(isCreatureInView(0, 0, 0, 3, 10)).toBe(true);
		});

		it("returns false when creature is outside view cone", () => {
			// Player looking along +Z, creature far to the side
			expect(isCreatureInView(0, 0, 0, 20, 1)).toBe(false);
		});

		it("returns false when creature is out of range", () => {
			const far = OBSERVE_MAX_RANGE + 5;
			expect(isCreatureInView(0, 0, 0, 0, far)).toBe(false);
		});

		it("returns true when creature is at max range", () => {
			// Just within range, directly ahead
			expect(isCreatureInView(0, 0, 0, 0, OBSERVE_MAX_RANGE - 1)).toBe(true);
		});

		it("returns true when creature is very close", () => {
			expect(isCreatureInView(0, 0, 0, 0, 0.005)).toBe(true);
		});

		it("respects player yaw rotation", () => {
			// Player looking along +X (yaw = PI/2)
			const yaw = Math.PI / 2;
			expect(isCreatureInView(0, 0, yaw, 10, 0)).toBe(true);
			expect(isCreatureInView(0, 0, yaw, -10, 0)).toBe(false);
		});

		it("creature just inside threshold is visible", () => {
			// Place creature at a position where dot product is clearly above threshold
			// At (3, 10), dot = cos(atan2(3, 10)) ≈ 0.96 > 0.3
			expect(isCreatureInView(0, 0, 0, 3, 10)).toBe(true);
		});
	});

	// ─── tickObservation ───

	describe("tickObservation", () => {
		it("does not increment when not viewing", () => {
			expect(tickObservation(0.5, 1.0, false)).toBe(0.5);
		});

		it("increments based on dt and FULL_OBSERVE_DURATION", () => {
			const result = tickObservation(0, 1.0, true);
			expect(result).toBeCloseTo(1.0 / FULL_OBSERVE_DURATION, 5);
		});

		it("clamps to 1.0", () => {
			expect(tickObservation(0.99, 100, true)).toBe(1.0);
		});

		it("does not exceed 1.0", () => {
			expect(tickObservation(1.0, 1.0, true)).toBe(1.0);
		});

		it("accumulates over multiple ticks", () => {
			let progress = 0;
			for (let i = 0; i < FULL_OBSERVE_DURATION; i++) {
				progress = tickObservation(progress, 1.0, true);
			}
			expect(progress).toBeCloseTo(1.0, 5);
		});

		it("preserves current progress when not viewing", () => {
			const progress = tickObservation(0.42, 1.0, false);
			expect(progress).toBe(0.42);
		});
	});
});
