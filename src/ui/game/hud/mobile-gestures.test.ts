import { describe, expect, it } from "vitest";
import {
	applyDeadZone,
	checkDoubleTap,
	createDoubleTapState,
	createSwipeState,
	endSwipe,
	isSwipeDown,
	joystickRamp,
	processJoystickMagnitude,
	startSwipe,
} from "./mobile-gestures.ts";

// ─── joystickRamp ───

describe("joystickRamp", () => {
	it("returns 0 for zero input", () => {
		expect(joystickRamp(0)).toBe(0);
	});

	it("returns 1 for max input", () => {
		expect(joystickRamp(1)).toBe(1);
	});

	it("applies quadratic curve (0.5 → 0.25)", () => {
		expect(joystickRamp(0.5)).toBeCloseTo(0.25, 5);
	});

	it("clamps negative to 0", () => {
		expect(joystickRamp(-0.5)).toBe(0);
	});

	it("clamps over 1 to 1", () => {
		expect(joystickRamp(1.5)).toBe(1);
	});

	it("ramp is monotonically increasing", () => {
		const values = [0.1, 0.3, 0.5, 0.7, 0.9].map(joystickRamp);
		for (let i = 1; i < values.length; i++) {
			expect(values[i]).toBeGreaterThan(values[i - 1]);
		}
	});
});

// ─── applyDeadZone ───

describe("applyDeadZone", () => {
	it("returns 0 within dead zone", () => {
		expect(applyDeadZone(0.1, 0.15)).toBe(0);
		expect(applyDeadZone(0.15, 0.15)).toBe(0);
	});

	it("returns 1 at max magnitude", () => {
		expect(applyDeadZone(1.0, 0.15)).toBe(1);
	});

	it("remaps dead zone edge to 0", () => {
		expect(applyDeadZone(0.16, 0.15)).toBeCloseTo(0.0118, 2);
	});

	it("remaps midpoint correctly", () => {
		// deadZone=0.2, magnitude=0.6 → (0.6-0.2)/(1-0.2) = 0.5
		expect(applyDeadZone(0.6, 0.2)).toBeCloseTo(0.5, 5);
	});
});

// ─── processJoystickMagnitude ───

describe("processJoystickMagnitude", () => {
	it("returns 0 within dead zone", () => {
		expect(processJoystickMagnitude(0.1, 0.15)).toBe(0);
	});

	it("returns 1 at full deflection", () => {
		expect(processJoystickMagnitude(1.0, 0.15)).toBe(1);
	});

	it("applies ramp after dead zone removal", () => {
		// deadZone=0.2, magnitude=0.6 → remapped=0.5 → ramp=0.25
		expect(processJoystickMagnitude(0.6, 0.2)).toBeCloseTo(0.25, 5);
	});
});

// ─── Swipe detection ───

describe("swipe detection", () => {
	it("detects swipe down within time", () => {
		const state = createSwipeState();
		startSwipe(state, 100, 100, 0);
		expect(isSwipeDown(state, 200, 200)).toBe(true);
	});

	it("rejects swipe down that is too slow", () => {
		const state = createSwipeState();
		startSwipe(state, 100, 100, 0);
		expect(isSwipeDown(state, 200, 500)).toBe(false);
	});

	it("rejects insufficient distance", () => {
		const state = createSwipeState();
		startSwipe(state, 100, 100, 0);
		expect(isSwipeDown(state, 150, 100)).toBe(false);
	});

	it("rejects when not active", () => {
		const state = createSwipeState();
		expect(isSwipeDown(state, 200, 0)).toBe(false);
	});

	it("endSwipe deactivates", () => {
		const state = createSwipeState();
		startSwipe(state, 100, 100, 0);
		endSwipe(state);
		expect(isSwipeDown(state, 200, 100)).toBe(false);
	});

	it("allows custom thresholds", () => {
		const state = createSwipeState();
		startSwipe(state, 100, 100, 0);
		// 50px swipe with 40px threshold and 500ms max
		expect(isSwipeDown(state, 150, 100, 40, 500)).toBe(true);
	});
});

// ─── Double-tap detection ───

describe("double-tap detection", () => {
	it("detects double tap within interval", () => {
		const state = createDoubleTapState();
		// First tap
		expect(checkDoubleTap(state, 100, 100, 0)).toBe(false);
		// Second tap 200ms later, same position
		expect(checkDoubleTap(state, 100, 100, 200)).toBe(true);
	});

	it("rejects tap after interval expires", () => {
		const state = createDoubleTapState();
		checkDoubleTap(state, 100, 100, 0);
		expect(checkDoubleTap(state, 100, 100, 500)).toBe(false);
	});

	it("rejects tap with too much drift", () => {
		const state = createDoubleTapState();
		checkDoubleTap(state, 100, 100, 0);
		// 50px drift exceeds 30px max
		expect(checkDoubleTap(state, 150, 100, 200)).toBe(false);
	});

	it("resets after successful double tap", () => {
		const state = createDoubleTapState();
		checkDoubleTap(state, 100, 100, 0);
		checkDoubleTap(state, 100, 100, 200); // double tap
		// Third tap — should be a new "first tap"
		expect(checkDoubleTap(state, 100, 100, 250)).toBe(true);
	});

	it("allows custom thresholds", () => {
		const state = createDoubleTapState();
		checkDoubleTap(state, 100, 100, 0);
		// 400ms interval with 500ms max, 50px drift with 60px max
		expect(checkDoubleTap(state, 150, 100, 400, 500, 60)).toBe(true);
	});
});
