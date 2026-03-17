/**
 * Season ECS system — computes current season from WorldTime.dayCount,
 * updates SeasonState trait, exposes module-level cache.
 *
 * Runs after timeSystem so dayCount is already updated for this frame.
 * Only recalculates when dayCount changes (edge detection).
 */

import type { World } from "koota";
import { SeasonState, WorldTime } from "../traits/index.ts";
import type { SeasonId } from "./season-data.ts";
import {
	computeSeason,
	hungerDrainMultiplier,
	isTranaMigrationSeason,
	morkerStrengthMultiplier,
	nightDurationMultiplier,
	seasonProgress,
} from "./season-data.ts";

// ─── Module-level cache ───

let cachedSeason: SeasonId = 0;
let cachedProgress = 0;
let lastDayCount = -1;

/** Read-only access to current season for other systems. */
export function getCurrentSeason(): SeasonId {
	return cachedSeason;
}

/** Read-only access to season progress for visual interpolation. */
export function getSeasonProgress(): number {
	return cachedProgress;
}

/** Reset state on game destroy. */
export function resetSeasonState(): void {
	cachedSeason = 0;
	cachedProgress = 0;
	lastDayCount = -1;
}

// ─── ECS System ───

export function seasonSystem(world: World, _dt: number): void {
	world.query(WorldTime, SeasonState).updateEach(([time, season]) => {
		// Only recompute when day changes
		if (time.dayCount === lastDayCount) return;
		lastDayCount = time.dayCount;

		const s = computeSeason(time.dayCount);
		const p = seasonProgress(time.dayCount);

		// Update trait
		season.current = s;
		season.progress = p;
		season.hungerMult = hungerDrainMultiplier(s);
		season.morkerMult = morkerStrengthMultiplier(s);
		season.nightMult = nightDurationMultiplier(s);
		season.tranaMigrating = isTranaMigrationSeason(s);

		// Update module cache
		cachedSeason = s;
		cachedProgress = p;
	});
}
