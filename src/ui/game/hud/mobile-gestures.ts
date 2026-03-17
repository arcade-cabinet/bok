/**
 * Pure math for mobile gesture detection and joystick ramp curve.
 * No React/Three.js/ECS dependencies.
 */

import {
	DOUBLE_TAP_MAX_DRIFT,
	DOUBLE_TAP_MAX_INTERVAL_MS,
	SWIPE_DOWN_THRESHOLD,
	SWIPE_MAX_DURATION_MS,
} from "./mobile-controls-data.ts";

// ─── Joystick Ramp Curve ───

/**
 * Apply a non-linear ramp curve to joystick displacement.
 * Maps raw normalized [0,1] displacement (after dead zone) to output [0,1]
 * using a quadratic curve for smooth acceleration.
 *
 * @param raw — Normalized displacement magnitude [0,1] after dead zone removal
 * @returns Curved output [0,1]
 */
export function joystickRamp(raw: number): number {
	if (raw <= 0) return 0;
	if (raw >= 1) return 1;
	// Quadratic ramp: gentle start, strong finish
	return raw * raw;
}

/**
 * Remove dead zone from raw joystick magnitude and remap [deadZone, 1] → [0, 1].
 * Values below dead zone return 0.
 */
export function applyDeadZone(magnitude: number, deadZone: number): number {
	if (magnitude <= deadZone) return 0;
	if (magnitude >= 1) return 1;
	return (magnitude - deadZone) / (1 - deadZone);
}

/**
 * Full joystick processing: dead zone → remap → ramp curve.
 * Returns the final normalized magnitude [0,1].
 */
export function processJoystickMagnitude(rawMagnitude: number, deadZone: number): number {
	return joystickRamp(applyDeadZone(rawMagnitude, deadZone));
}

// ─── Swipe Detection ───

export interface SwipeState {
	startX: number;
	startY: number;
	startTime: number;
	active: boolean;
}

export function createSwipeState(): SwipeState {
	return { startX: 0, startY: 0, startTime: 0, active: false };
}

export function startSwipe(state: SwipeState, x: number, y: number, time: number): void {
	state.startX = x;
	state.startY = y;
	state.startTime = time;
	state.active = true;
}

/**
 * Check if current touch position completes a swipe-down gesture.
 * Returns true if swipe distance and timing meet thresholds.
 */
export function isSwipeDown(
	state: SwipeState,
	currentY: number,
	currentTime: number,
	threshold = SWIPE_DOWN_THRESHOLD,
	maxDuration = SWIPE_MAX_DURATION_MS,
): boolean {
	if (!state.active) return false;
	const dy = currentY - state.startY;
	const elapsed = currentTime - state.startTime;
	return dy >= threshold && elapsed <= maxDuration;
}

export function endSwipe(state: SwipeState): void {
	state.active = false;
}

// ─── Double-Tap Detection ───

export interface DoubleTapState {
	lastTapTime: number;
	lastTapX: number;
	lastTapY: number;
}

export function createDoubleTapState(): DoubleTapState {
	return { lastTapTime: 0, lastTapX: 0, lastTapY: 0 };
}

/**
 * Check if a tap at (x, y) at the given time constitutes a double-tap.
 * Always updates the state for the next check.
 * Returns true if this is the second tap within the interval + drift.
 */
export function checkDoubleTap(
	state: DoubleTapState,
	x: number,
	y: number,
	time: number,
	maxInterval = DOUBLE_TAP_MAX_INTERVAL_MS,
	maxDrift = DOUBLE_TAP_MAX_DRIFT,
): boolean {
	const elapsed = time - state.lastTapTime;
	const dx = x - state.lastTapX;
	const dy = y - state.lastTapY;
	const drift = Math.sqrt(dx * dx + dy * dy);

	const isDouble = elapsed <= maxInterval && drift <= maxDrift;

	// Update state for next check
	state.lastTapTime = time;
	state.lastTapX = x;
	state.lastTapY = y;

	return isDouble;
}
