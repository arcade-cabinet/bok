/**
 * Pure helper functions for input processing — extracted from InputBehavior
 * for testability. No JP/Koota/Three.js dependencies.
 */

/** Clamp pitch to just under ±PI/2 to prevent camera flipping. */
export function clampPitch(pitch: number): number {
	const limit = Math.PI / 2 - 0.1;
	return Math.max(-limit, Math.min(limit, pitch));
}

/** Generic numeric clamp. */
export function clamp(v: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, v));
}

/** Compute mouse look deltas for rotation and sway. */
export function computeMouseLook(
	deltaX: number,
	deltaY: number,
	sensitivity: number,
	swayFactor: number,
): { yawDelta: number; pitchDelta: number; swayX: number; swayY: number } {
	return {
		yawDelta: -deltaX * sensitivity,
		pitchDelta: -deltaY * sensitivity,
		swayX: clamp(-deltaY * swayFactor, -0.1, 0.1),
		swayY: clamp(-deltaX * swayFactor, -0.1, 0.1),
	};
}

/**
 * Compute analog joystick values from touch position relative to start.
 * Returns normalized [-1, 1] per axis with dead zone removal and ramp curve.
 * Also returns clamped pixel offsets for visual nub positioning.
 */
export function computeJoystickAnalog(
	touchX: number,
	touchY: number,
	startX: number,
	startY: number,
	radius: number,
	deadZone: number,
): { nx: number; ny: number; clampedDx: number; clampedDy: number } {
	let dx = touchX - startX;
	let dy = touchY - startY;
	const dist = Math.sqrt(dx * dx + dy * dy);
	if (dist > radius) {
		dx = (dx / dist) * radius;
		dy = (dy / dist) * radius;
	}
	const rawX = dx / radius;
	const rawY = dy / radius;

	// Per-axis dead zone removal + quadratic ramp curve
	const nx = applyAxisRamp(rawX, deadZone);
	const ny = applyAxisRamp(rawY, deadZone);

	return { nx, ny, clampedDx: dx, clampedDy: dy };
}

/** Apply dead zone removal + quadratic ramp to a single axis value [-1, 1]. */
function applyAxisRamp(raw: number, deadZone: number): number {
	const abs = Math.abs(raw);
	if (abs <= deadZone) return 0;
	const remapped = (abs - deadZone) / (1 - deadZone);
	const curved = remapped * remapped; // quadratic ramp
	return raw < 0 ? -curved : curved;
}

/** Compute joystick movement from touch position relative to start. */
export function computeJoystickMove(
	touchX: number,
	touchY: number,
	startX: number,
	startY: number,
	radius: number,
	deadZone: number,
): { forward: boolean; backward: boolean; left: boolean; right: boolean } {
	const { nx, ny } = computeJoystickAnalog(touchX, touchY, startX, startY, radius, deadZone);
	return {
		forward: ny < 0,
		backward: ny > 0,
		left: nx < 0,
		right: nx > 0,
	};
}
