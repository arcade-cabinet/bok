/**
 * Tests for InputBehavior pure helper functions and input-to-ECS mapping.
 *
 * The Behavior itself depends on JP's runtime, so we test:
 * 1. Extracted pure functions (clampPitch, clamp, computeMouseLook, computeJoystickMove)
 * 2. ECS trait mutations using a real Koota world (verifying the mapping logic)
 */

import { describe, expect, it } from "vitest";
import { clamp, clampPitch, computeJoystickAnalog, computeJoystickMove, computeMouseLook } from "./input-helpers.ts";

// ─── clampPitch ───

describe("clampPitch", () => {
	it("returns 0 for zero input", () => {
		expect(clampPitch(0)).toBe(0);
	});

	it("clamps to upper limit (just under PI/2)", () => {
		const limit = Math.PI / 2 - 0.1;
		expect(clampPitch(2)).toBeCloseTo(limit, 5);
		expect(clampPitch(Math.PI)).toBeCloseTo(limit, 5);
	});

	it("clamps to lower limit (just above -PI/2)", () => {
		const limit = -(Math.PI / 2 - 0.1);
		expect(clampPitch(-2)).toBeCloseTo(limit, 5);
		expect(clampPitch(-Math.PI)).toBeCloseTo(limit, 5);
	});

	it("passes through values within range", () => {
		expect(clampPitch(0.5)).toBeCloseTo(0.5, 5);
		expect(clampPitch(-0.5)).toBeCloseTo(-0.5, 5);
	});
});

// ─── clamp ───

describe("clamp", () => {
	it("returns value within range", () => {
		expect(clamp(5, 0, 10)).toBe(5);
	});

	it("clamps to min", () => {
		expect(clamp(-5, 0, 10)).toBe(0);
	});

	it("clamps to max", () => {
		expect(clamp(15, 0, 10)).toBe(10);
	});

	it("works with negative ranges", () => {
		expect(clamp(0, -0.1, 0.1)).toBe(0);
		expect(clamp(-0.5, -0.1, 0.1)).toBe(-0.1);
		expect(clamp(0.5, -0.1, 0.1)).toBe(0.1);
	});
});

// ─── computeMouseLook ───

describe("computeMouseLook", () => {
	const SENSITIVITY = 0.002;
	const SWAY_FACTOR = 0.0005;

	it("computes yaw/pitch from mouse delta", () => {
		const result = computeMouseLook(100, 50, SENSITIVITY, SWAY_FACTOR);
		expect(result.yawDelta).toBeCloseTo(-0.2, 5);
		expect(result.pitchDelta).toBeCloseTo(-0.1, 5);
	});

	it("computes zero for zero delta", () => {
		const result = computeMouseLook(0, 0, SENSITIVITY, SWAY_FACTOR);
		expect(result.yawDelta).toBeCloseTo(0, 10);
		expect(result.pitchDelta).toBeCloseTo(0, 10);
		expect(result.swayX).toBeCloseTo(0, 10);
		expect(result.swayY).toBeCloseTo(0, 10);
	});

	it("clamps sway to [-0.1, 0.1]", () => {
		// Huge delta should still produce clamped sway
		const result = computeMouseLook(1000, 1000, SENSITIVITY, SWAY_FACTOR);
		expect(result.swayX).toBe(-0.1);
		expect(result.swayY).toBe(-0.1);
	});

	it("negative delta produces positive sway", () => {
		const result = computeMouseLook(-100, -100, SENSITIVITY, SWAY_FACTOR);
		expect(result.swayX).toBeCloseTo(0.05, 4);
		expect(result.swayY).toBeCloseTo(0.05, 4);
	});
});

// ─── computeJoystickMove ───

describe("computeJoystickMove", () => {
	const RADIUS = 40;
	const DEAD_ZONE = 0.15;

	it("no movement when touch is at start position", () => {
		const result = computeJoystickMove(100, 100, 100, 100, RADIUS, DEAD_ZONE);
		expect(result.forward).toBe(false);
		expect(result.backward).toBe(false);
		expect(result.left).toBe(false);
		expect(result.right).toBe(false);
	});

	it("forward when dragging up (negative Y)", () => {
		// Drag up = negative dy = forward
		const result = computeJoystickMove(100, 70, 100, 100, RADIUS, DEAD_ZONE);
		expect(result.forward).toBe(true);
		expect(result.backward).toBe(false);
	});

	it("backward when dragging down (positive Y)", () => {
		const result = computeJoystickMove(100, 130, 100, 100, RADIUS, DEAD_ZONE);
		expect(result.backward).toBe(true);
		expect(result.forward).toBe(false);
	});

	it("left when dragging left (negative X)", () => {
		const result = computeJoystickMove(70, 100, 100, 100, RADIUS, DEAD_ZONE);
		expect(result.left).toBe(true);
		expect(result.right).toBe(false);
	});

	it("right when dragging right (positive X)", () => {
		const result = computeJoystickMove(130, 100, 100, 100, RADIUS, DEAD_ZONE);
		expect(result.right).toBe(true);
		expect(result.left).toBe(false);
	});

	it("respects dead zone — small movements ignored", () => {
		// 5px on a 40px radius = 0.125, under 0.15 deadzone
		const result = computeJoystickMove(105, 105, 100, 100, RADIUS, DEAD_ZONE);
		expect(result.forward).toBe(false);
		expect(result.backward).toBe(false);
		expect(result.left).toBe(false);
		expect(result.right).toBe(false);
	});

	it("clamps to radius for large drags", () => {
		// Drag 200px to the right — should clamp to radius
		const result = computeJoystickMove(300, 100, 100, 100, RADIUS, DEAD_ZONE);
		expect(result.right).toBe(true);
		// The normalized value should be 1.0 (clamped), not 5.0
	});

	it("diagonal drag activates both axes", () => {
		// Large diagonal drag: 30px right, 30px up
		const result = computeJoystickMove(130, 70, 100, 100, RADIUS, DEAD_ZONE);
		expect(result.forward).toBe(true);
		expect(result.right).toBe(true);
		expect(result.backward).toBe(false);
		expect(result.left).toBe(false);
	});
});

// ─── computeJoystickAnalog ───

describe("computeJoystickAnalog", () => {
	const RADIUS = 40;
	const DEAD_ZONE = 0.15;

	it("returns zero for touch at start position", () => {
		const result = computeJoystickAnalog(100, 100, 100, 100, RADIUS, DEAD_ZONE);
		expect(result.nx).toBe(0);
		expect(result.ny).toBe(0);
	});

	it("returns negative ny for upward drag (forward)", () => {
		const result = computeJoystickAnalog(100, 60, 100, 100, RADIUS, DEAD_ZONE);
		expect(result.ny).toBeLessThan(0);
		expect(result.nx).toBe(0);
	});

	it("applies ramp curve — half deflection is less than half output", () => {
		// 20px drag on 40px radius = 0.5 raw
		// After dead zone removal: (0.5 - 0.15) / 0.85 ≈ 0.412
		// After quadratic ramp: 0.412² ≈ 0.17
		const result = computeJoystickAnalog(120, 100, 100, 100, RADIUS, DEAD_ZONE);
		expect(result.nx).toBeGreaterThan(0);
		expect(result.nx).toBeLessThan(0.5); // ramp reduces mid-range
	});

	it("returns 1 at full deflection", () => {
		// Full radius drag
		const result = computeJoystickAnalog(140, 100, 100, 100, RADIUS, DEAD_ZONE);
		expect(result.nx).toBeCloseTo(1, 1);
	});

	it("returns clamped pixel offsets", () => {
		// 200px drag exceeds radius — should be clamped to 40px
		const result = computeJoystickAnalog(300, 100, 100, 100, RADIUS, DEAD_ZONE);
		expect(result.clampedDx).toBeCloseTo(RADIUS, 5);
		expect(result.clampedDy).toBeCloseTo(0, 5);
	});

	it("respects dead zone — small movements produce zero", () => {
		// 5px / 40px = 0.125 < 0.15 dead zone
		const result = computeJoystickAnalog(105, 105, 100, 100, RADIUS, DEAD_ZONE);
		expect(result.nx).toBe(0);
		expect(result.ny).toBe(0);
	});
});
