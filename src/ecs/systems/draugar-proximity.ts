/**
 * Draugar proximity effects — pure math, no ECS/Three.js.
 * Computes screen-space dread effects based on distance to nearest Draugar:
 * - Chromatic aberration (visual distortion)
 * - Frost particle intensity
 * - Audio silence factor (ambient dims to nothing)
 * Consumed by UI overlays and side-effect callbacks.
 */

// ─── Constants ───

/** Range for chromatic aberration effect (blocks). */
export const DRAUGAR_ABERRATION_RANGE = 15;

/** Maximum aberration intensity (subtle post-process value). */
export const DRAUGAR_MAX_ABERRATION = 0.008;

/** Range for frost particle emission (blocks). */
export const DRAUGAR_FROST_RANGE = 10;

/** Range for audio silence effect (blocks). Starts dimming furthest out. */
export const DRAUGAR_SILENCE_RANGE = 20;

// ─── Types ───

export interface DraugarPos {
	x: number;
	z: number;
}

export interface ProximityEffects {
	/** Chromatic aberration intensity [0, DRAUGAR_MAX_ABERRATION]. */
	aberration: number;
	/** Frost particle intensity [0, 1]. */
	frostIntensity: number;
	/** Audio silence factor [0, 1]. 0 = normal audio, 1 = full silence. */
	silenceFactor: number;
}

// ─── Computation ───

/**
 * Compute proximity-based screen effects from nearest Draugar.
 *
 * @param playerX - Player position X
 * @param playerZ - Player position Z
 * @param draugarPositions - Array of active Draugar XZ positions
 * @returns Effect intensities for UI consumption
 */
export function computeDraugarProximity(
	playerX: number,
	playerZ: number,
	draugarPositions: DraugarPos[],
): ProximityEffects {
	if (draugarPositions.length === 0) {
		return { aberration: 0, frostIntensity: 0, silenceFactor: 0 };
	}

	// Find nearest Draugar distance
	let minDistSq = Number.POSITIVE_INFINITY;
	for (const d of draugarPositions) {
		const dx = playerX - d.x;
		const dz = playerZ - d.z;
		const distSq = dx * dx + dz * dz;
		if (distSq < minDistSq) minDistSq = distSq;
	}
	const dist = Math.sqrt(minDistSq);

	return {
		aberration: linearFalloff(dist, DRAUGAR_ABERRATION_RANGE) * DRAUGAR_MAX_ABERRATION,
		frostIntensity: linearFalloff(dist, DRAUGAR_FROST_RANGE),
		silenceFactor: linearFalloff(dist, DRAUGAR_SILENCE_RANGE),
	};
}

/** Linear falloff: 1 at distance 0, 0 at range. Clamped [0, 1]. */
function linearFalloff(dist: number, range: number): number {
	if (dist >= range) return 0;
	return 1 - dist / range;
}

// ─── Frame-level State ───

let lastEffects: ProximityEffects = { aberration: 0, frostIntensity: 0, silenceFactor: 0 };

/** Called each frame from creature system with collected Draugar positions. */
export function updateDraugarProximity(playerX: number, playerZ: number, positions: DraugarPos[]): void {
	lastEffects = computeDraugarProximity(playerX, playerZ, positions);
}

/** Get the current frame's proximity effects. */
export function getDraugarProximityEffects(): ProximityEffects {
	return lastEffects;
}

/** Reset state (for tests). */
export function resetDraugarProximityState(): void {
	lastEffects = { aberration: 0, frostIntensity: 0, silenceFactor: 0 };
}
