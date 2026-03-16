/**
 * Haptic feedback wrapper — uses Web Vibration API on mobile browsers.
 * Falls back to no-op when vibration is unavailable (desktop, iOS Safari).
 * No external dependencies.
 */

import type { HapticIntensity } from "./mobile-controls-data.ts";
import { HAPTIC_PATTERNS } from "./mobile-controls-data.ts";

/** Duration in ms for each haptic intensity level. */
const INTENSITY_DURATION: Record<HapticIntensity, number> = {
	light: 15,
	medium: 40,
	heavy: 80,
};

/** Trigger haptic feedback at the given intensity. */
export function triggerHaptic(intensity: HapticIntensity): void {
	if (typeof navigator === "undefined") return;
	if (!("vibrate" in navigator)) return;

	try {
		navigator.vibrate(INTENSITY_DURATION[intensity]);
	} catch {
		// Vibration API not supported or permission denied — silent fail
	}
}

/** Trigger haptic feedback for a named game event. */
export function triggerGameHaptic(event: string): void {
	const pattern = HAPTIC_PATTERNS[event];
	if (!pattern) return;
	triggerHaptic(pattern.intensity);
}
