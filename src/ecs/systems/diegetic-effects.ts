/**
 * Diegetic effect calculations — maps player vitals to screen-space meta effects.
 * Pure math, no ECS/Three.js/React.
 */

/** Health below this ratio triggers the persistent vignette. */
const VIGNETTE_START = 0.8;

/** Health below this ratio triggers the critical pulse animation. */
const CRITICAL_THRESHOLD = 0.2;

/**
 * Compute vignette opacity from current health.
 * Returns 0 at ≥80% health, scales linearly to 0.6 at 0 health.
 */
export function computeVignetteIntensity(health: number, maxHealth: number): number {
	if (maxHealth <= 0) return 0;
	const ratio = Math.max(0, Math.min(1, health / maxHealth));
	if (ratio >= VIGNETTE_START) return 0;
	// Linear ramp: 0 at VIGNETTE_START, 0.6 at 0
	return (1 - ratio / VIGNETTE_START) * 0.6;
}

/**
 * Whether health is critically low (triggers pulsing vignette).
 */
export function isHealthCritical(health: number, maxHealth: number): boolean {
	if (maxHealth <= 0) return false;
	return health > 0 && health / maxHealth < CRITICAL_THRESHOLD;
}

/** Hunger below this ratio starts desaturation. */
const DESAT_START = 0.5;

/**
 * Compute screen desaturation from hunger level.
 * Returns 1.0 (full color) at ≥50% hunger, scales to 0.3 (very desaturated) at 0.
 */
export function computeDesaturation(hunger: number, maxHunger: number): number {
	if (maxHunger <= 0) return 1;
	const ratio = Math.max(0, Math.min(1, hunger / maxHunger));
	if (ratio >= DESAT_START) return 1;
	// Linear ramp: 1.0 at DESAT_START, 0.3 at 0
	return 0.3 + (ratio / DESAT_START) * 0.7;
}
