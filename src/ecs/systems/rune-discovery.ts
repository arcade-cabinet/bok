/**
 * Rune Discovery — pure math trigger condition checks.
 * Each function takes game state and returns whether the discovery condition is met.
 *
 * No ECS, no Three.js — just boolean checks on plain values.
 */

import type { SpeciesId } from "../traits/index.ts";
import type { DiscoveryTriggerId } from "./rune-discovery-data.ts";
import { DiscoveryTrigger, type RuneDiscoveryEntry } from "./rune-discovery-data.ts";

/** Game state snapshot used for trigger evaluation. */
export interface DiscoveryContext {
	/** Current in-game time of day [0, 1). */
	timeOfDay: number;
	/** Previous frame's time of day (for sunrise edge detection). */
	prevTimeOfDay: number;
	/** Species of creatures within detection range. */
	nearbyCreatures: readonly SpeciesId[];
	/** Landmark types in explored chunks near the player. */
	nearbyLandmarks: readonly string[];
	/** Player's current biome ID name (lowercase). */
	currentBiome: string;
	/** Whether the player took damage this tick. */
	tookDamage: boolean;
	/** Total creatures killed (from SagaLog). */
	creaturesKilled: number;
}

/** Dawn window: timeOfDay range where sunrise is observable. */
const DAWN_START = 0.2;
const DAWN_END = 0.3;

/** Check if the sunrise just occurred (time crossed into dawn window). */
export function isSunriseObserved(prevTime: number, currentTime: number): boolean {
	return prevTime < DAWN_START && currentTime >= DAWN_START && currentTime <= DAWN_END;
}

/** Check if a specific creature species is nearby. */
export function isCreatureNearby(nearby: readonly SpeciesId[], species: string): boolean {
	return nearby.includes(species as SpeciesId);
}

/** Check if a specific landmark type is nearby. */
export function isLandmarkNearby(nearby: readonly string[], landmarkType: string): boolean {
	return nearby.includes(landmarkType);
}

/** Check if the player is in a specific biome. */
export function isInBiome(currentBiome: string, targetBiome: string): boolean {
	return currentBiome === targetBiome;
}

/**
 * Evaluate whether a single discovery entry's trigger condition is met.
 * Returns true if the rune should be discovered.
 */
export function checkDiscoveryTrigger(entry: RuneDiscoveryEntry, ctx: DiscoveryContext): boolean {
	switch (entry.trigger as DiscoveryTriggerId) {
		case DiscoveryTrigger.Tutorial:
			return true;
		case DiscoveryTrigger.Sunrise:
			return isSunriseObserved(ctx.prevTimeOfDay, ctx.timeOfDay);
		case DiscoveryTrigger.CreatureNearby:
			return entry.triggerParam ? isCreatureNearby(ctx.nearbyCreatures, entry.triggerParam) : false;
		case DiscoveryTrigger.LandmarkNearby:
			return entry.triggerParam ? isLandmarkNearby(ctx.nearbyLandmarks, entry.triggerParam) : false;
		case DiscoveryTrigger.DamageTaken:
			return ctx.tookDamage;
		case DiscoveryTrigger.CreatureKilled:
			return ctx.creaturesKilled > 0;
		case DiscoveryTrigger.BiomeVisited:
			return entry.triggerParam ? isInBiome(ctx.currentBiome, entry.triggerParam) : false;
		default:
			return false;
	}
}
