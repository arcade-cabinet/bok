/**
 * Seasonal gameplay effects — per-species spawn multipliers, resource yield,
 * and utility flags for mushrooms / growth seasons.
 *
 * Pure data + a lightweight ECS system that caches values each day-change.
 * Runs after seasonSystem so SeasonState.current is up-to-date.
 */

import type { World } from "koota";
import type { SpeciesId } from "../traits/index.ts";
import { SeasonState, Species } from "../traits/index.ts";
import type { SeasonId } from "./season-data.ts";
import { Season } from "./season-data.ts";

// ─── Per-species spawn multipliers ───

/**
 * Creature spawn rate multiplier by season × species.
 *
 * Sommar: abundant passive life, fewer threats.
 * Höst:   Vittra active (creature prep), Trana migrated, mushroom bonus.
 * Vinter: harsh — hostiles up, passives scarce.
 * Vår:    new growth, returning creatures.
 */
const CREATURE_SPAWN_MULT: Record<SeasonId, Partial<Record<SpeciesId, number>>> = {
	[Season.Var]: {
		[Species.Morker]: 1.0,
		[Species.Lyktgubbe]: 1.0,
		[Species.Skogssnigle]: 1.2,
		[Species.Trana]: 1.3,
		[Species.Vittra]: 1.0,
		[Species.Nacken]: 1.0,
		[Species.Lindorm]: 1.0,
		[Species.Draug]: 1.0,
		[Species.Jatten]: 1.0,
	},
	[Season.Sommar]: {
		[Species.Morker]: 0.7,
		[Species.Lyktgubbe]: 1.3,
		[Species.Skogssnigle]: 1.5,
		[Species.Trana]: 1.2,
		[Species.Vittra]: 0.8,
		[Species.Nacken]: 1.2,
		[Species.Lindorm]: 0.8,
		[Species.Draug]: 0.6,
		[Species.Jatten]: 0.8,
	},
	[Season.Host]: {
		[Species.Morker]: 1.2,
		[Species.Lyktgubbe]: 1.0,
		[Species.Skogssnigle]: 0.8,
		[Species.Trana]: 0,
		[Species.Vittra]: 1.4,
		[Species.Nacken]: 0.9,
		[Species.Lindorm]: 1.1,
		[Species.Draug]: 1.2,
		[Species.Jatten]: 1.0,
	},
	[Season.Vinter]: {
		[Species.Morker]: 1.5,
		[Species.Lyktgubbe]: 0.5,
		[Species.Skogssnigle]: 0.3,
		[Species.Trana]: 0,
		[Species.Vittra]: 1.5,
		[Species.Nacken]: 0.4,
		[Species.Lindorm]: 1.3,
		[Species.Draug]: 1.5,
		[Species.Jatten]: 1.2,
	},
};

/** Look up spawn rate multiplier for a species in a given season. */
export function creatureSpawnMultiplier(season: SeasonId, species: SpeciesId): number {
	return CREATURE_SPAWN_MULT[season]?.[species] ?? 1.0;
}

// ─── Resource yield ───

/** Mining/gathering yield multiplier by season. */
const RESOURCE_YIELD_MULT: Record<SeasonId, number> = {
	[Season.Var]: 1.0,
	[Season.Sommar]: 1.3,
	[Season.Host]: 1.1,
	[Season.Vinter]: 0.7,
};

export function resourceYieldMultiplier(season: SeasonId): number {
	return RESOURCE_YIELD_MULT[season] ?? 1.0;
}

// ─── Season flags ───

/** Höst is mushroom season — bonus mushroom spawns / foraging. */
export function isMushroomSeason(season: SeasonId): boolean {
	return season === Season.Host;
}

/** Vår and Sommar are growth seasons — new saplings, returning creatures. */
export function isGrowthSeason(season: SeasonId): boolean {
	return season === Season.Var || season === Season.Sommar;
}

// ─── Module-level cache (updated by system) ───

let cachedSeason: SeasonId = 0;
let cachedResourceYield = 1.0;

/** Get cached spawn multiplier for a species this frame. */
export function getSeasonCreatureSpawnMult(species: SpeciesId): number {
	return creatureSpawnMultiplier(cachedSeason, species);
}

/** Get cached resource yield multiplier this frame. */
export function getResourceYieldMult(): number {
	return cachedResourceYield;
}

/** Reset module state on game destroy. */
export function resetSeasonEffectsState(): void {
	cachedSeason = 0;
	cachedResourceYield = 1.0;
}

// ─── ECS System ───

/** Reads SeasonState and caches gameplay effect values. Runs after seasonSystem. */
export function seasonEffectsSystem(world: World, _dt: number): void {
	world.query(SeasonState).readEach(([season]) => {
		if (season.current === cachedSeason) return;
		cachedSeason = season.current;
		cachedResourceYield = resourceYieldMultiplier(cachedSeason);
	});
}
