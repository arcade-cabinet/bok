/**
 * Pure data for mobile controls layout, haptic patterns, and gesture thresholds.
 * No React/Three.js/ECS dependencies.
 */

// ─── Button Layout ───

/** Minimum touch target size (CSS px) per WCAG/mobile guidelines. */
export const MIN_TOUCH_TARGET = 48;

/** All buttons anchored in the bottom 40% of the viewport. */
export const THUMB_ZONE_TOP_PERCENT = 60;

/** Button IDs for action buttons. */
export type MobileButtonId = "mine" | "place" | "jump" | "bok" | "inventory";

export interface ButtonLayout {
	id: MobileButtonId;
	/** Label text shown on the button. */
	label: string;
	/** Rune/icon character. */
	icon: string;
	/** Anchor side: "left" or "right". */
	side: "left" | "right";
	/** Bottom offset in CSS px from viewport bottom. */
	bottomPx: number;
	/** Horizontal offset from the anchor side edge in CSS px. */
	sidePx: number;
}

/**
 * Default button positions — all in the bottom 40% (below THUMB_ZONE_TOP_PERCENT).
 * Right side: mine/place/jump clustered for right thumb.
 * Left side: bok/inventory accessible but less frequent.
 */
export const BUTTON_LAYOUTS: readonly ButtonLayout[] = [
	{ id: "mine", label: "Mine", icon: "⛏", side: "right", bottomPx: 140, sidePx: 16 },
	{ id: "place", label: "Place", icon: "▪", side: "right", bottomPx: 80, sidePx: 80 },
	{ id: "jump", label: "Jump", icon: "▲", side: "right", bottomPx: 80, sidePx: 16 },
	{ id: "bok", label: "Bok", icon: "ᛒ", side: "left", bottomPx: 140, sidePx: 16 },
	{ id: "inventory", label: "Inv", icon: "⊞", side: "left", bottomPx: 80, sidePx: 16 },
] as const;

// ─── Joystick ───

/** Visual joystick nub radius (CSS px). */
export const JOYSTICK_NUB_RADIUS = 20;

/** Visual joystick base ring radius (CSS px). */
export const JOYSTICK_BASE_RADIUS = 50;

/** Joystick base opacity when idle vs active. */
export const JOYSTICK_IDLE_OPACITY = 0.25;
export const JOYSTICK_ACTIVE_OPACITY = 0.6;

// ─── Gesture Thresholds ───

/** Minimum Y distance (px) for swipe-down gesture to open Bok. */
export const SWIPE_DOWN_THRESHOLD = 80;

/** Maximum time (ms) for swipe to be recognized. */
export const SWIPE_MAX_DURATION_MS = 300;

/** Maximum time (ms) between taps for double-tap sprint detection. */
export const DOUBLE_TAP_MAX_INTERVAL_MS = 300;

/** Maximum movement (px) between taps to still count as a double-tap. */
export const DOUBLE_TAP_MAX_DRIFT = 30;

// ─── Haptic Patterns ───

export type HapticIntensity = "light" | "medium" | "heavy";

export interface HapticPattern {
	intensity: HapticIntensity;
	/** Duration in ms (for Capacitor Haptics.impact). */
	durationMs: number;
}

/** Map of game events to haptic feedback patterns. */
export const HAPTIC_PATTERNS: Record<string, HapticPattern> = {
	place: { intensity: "light", durationMs: 20 },
	mine: { intensity: "medium", durationMs: 40 },
	damage: { intensity: "heavy", durationMs: 80 },
	jump: { intensity: "light", durationMs: 15 },
} as const;

// ─── Auto-target ───

/** Max distance (blocks) for auto-targeting nearest enemy. */
export const AUTO_TARGET_RANGE = 8;

/** FOV half-angle (radians) for auto-target cone (~90° total). */
export const AUTO_TARGET_HALF_ANGLE = Math.PI / 4;

// ─── Layout Helpers ───

/** Check if a button position is within the thumb zone. */
export function isInThumbZone(bottomPx: number, viewportHeight: number): boolean {
	const topEdge = viewportHeight - bottomPx - MIN_TOUCH_TARGET;
	const thumbZoneTop = viewportHeight * (THUMB_ZONE_TOP_PERCENT / 100);
	return topEdge >= thumbZoneTop;
}

/** Scale button size by user preference while respecting minimum. */
export function scaledButtonSize(baseSize: number, scale: number): number {
	return Math.max(MIN_TOUCH_TARGET, Math.round(baseSize * scale));
}
