/**
 * Season cycle data — pure constants and formulas.
 * No ECS, no Three.js. Consumed by season.ts and other systems.
 *
 * Swedish season names:
 *   Vår (spring), Sommar (summer), Höst (autumn), Vinter (winter)
 *
 * Cycle: every SEASON_LENGTH game-days, the season advances.
 * Total cycle = SEASON_LENGTH × 4 game-days.
 */

// ─── Season Enum ───

export const Season = {
	Var: 0,
	Sommar: 1,
	Host: 2,
	Vinter: 3,
} as const;

export type SeasonId = (typeof Season)[keyof typeof Season];

export const SEASON_COUNT = 4;

/** Human-readable Swedish names. */
export const SEASON_NAMES: Record<SeasonId, string> = {
	[Season.Var]: "Vår",
	[Season.Sommar]: "Sommar",
	[Season.Host]: "Höst",
	[Season.Vinter]: "Vinter",
};

/** Game-days per season. Total year = SEASON_LENGTH × 4. */
export const SEASON_LENGTH = 8;

// ─── Season Computation ───

/** Compute the current season from the day count. Day 1 starts in Vår. */
export function computeSeason(dayCount: number): SeasonId {
	const day = Math.max(0, dayCount - 1);
	const yearDay = day % (SEASON_LENGTH * SEASON_COUNT);
	return Math.floor(yearDay / SEASON_LENGTH) as SeasonId;
}

/** Compute progress [0,1) through the current season. */
export function seasonProgress(dayCount: number): number {
	const day = Math.max(0, dayCount - 1);
	const yearDay = day % (SEASON_LENGTH * SEASON_COUNT);
	return (yearDay % SEASON_LENGTH) / SEASON_LENGTH;
}

// ─── Night Duration ───

/**
 * Night duration multiplier per season.
 * Affects the fraction of the day cycle spent in darkness.
 * Sommar has short nights (Scandinavian midnight sun effect).
 * Vinter has long nights (polar darkness effect).
 */
export const NIGHT_DURATION_MULT: Record<SeasonId, number> = {
	[Season.Var]: 1.0,
	[Season.Sommar]: 0.6,
	[Season.Host]: 1.2,
	[Season.Vinter]: 1.6,
};

/**
 * Compute the effective day duration given a base duration and season.
 * Shorter day duration = time passes faster = nights feel longer.
 * We adjust only the night portion: longer nights in vinter, shorter in sommar.
 */
export function nightDurationMultiplier(season: SeasonId): number {
	return NIGHT_DURATION_MULT[season] ?? 1.0;
}

// ─── Hunger Drain ───

/** Hunger drain rate multiplier per season. Vinter is harsh. */
export const HUNGER_DRAIN_MULT: Record<SeasonId, number> = {
	[Season.Var]: 1.0,
	[Season.Sommar]: 0.85,
	[Season.Host]: 1.1,
	[Season.Vinter]: 1.4,
};

export function hungerDrainMultiplier(season: SeasonId): number {
	return HUNGER_DRAIN_MULT[season] ?? 1.0;
}

// ─── Creature Behavior ───

/** Mörker spawn/strength multiplier per season. */
export const MORKER_STRENGTH_MULT: Record<SeasonId, number> = {
	[Season.Var]: 1.0,
	[Season.Sommar]: 0.7,
	[Season.Host]: 1.2,
	[Season.Vinter]: 1.5,
};

export function morkerStrengthMultiplier(season: SeasonId): number {
	return MORKER_STRENGTH_MULT[season] ?? 1.0;
}

/** Whether Tranor (cranes) migrate in the given season. Höst = migrate south. */
export function isTranaMigrationSeason(season: SeasonId): boolean {
	return season === Season.Host || season === Season.Vinter;
}

// ─── Visual: Leaf Colors ───

/**
 * Leaf color tint per season as hex RGB values.
 * Used by tileset/rendering to shift foliage appearance.
 */
export const LEAF_TINT: Record<SeasonId, number> = {
	[Season.Var]: 0x66cc66,
	[Season.Sommar]: 0x228b22,
	[Season.Host]: 0xdaa520,
	[Season.Vinter]: 0x8b7355,
};

/** Grass color warmth per season (shifts surface block appearance). */
export const GRASS_TINT: Record<SeasonId, number> = {
	[Season.Var]: 0x7ec850,
	[Season.Sommar]: 0x5ea030,
	[Season.Host]: 0xa08830,
	[Season.Vinter]: 0xc0c0c0,
};

/** Whether snow should accumulate on surfaces (vinter only). */
export function isSnowSeason(season: SeasonId): boolean {
	return season === Season.Vinter;
}
