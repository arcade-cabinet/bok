/**
 * Creature audio profiles — procedural audio signatures per species.
 *
 * Each creature type has a distinct audio identity:
 * - Mörker: ambient sound dims on proximity (shadow encroaching)
 * - Lindorm: low bass rumble (ground tremor)
 * - Trana: distant bird calls (high sine chirps)
 * - Lyktgubbe: soft chime (twinkling will-o-wisp)
 * - Draug: silence — ambient drops to zero (undead dread)
 *
 * Pure data module — no Web Audio API calls. The rendering layer
 * reads these profiles and drives oscillators/gain nodes.
 */

import type { SpeciesId } from "../traits/index.ts";
import { Species } from "../traits/index.ts";

// ─── Audio Profile Types ───

export type AudioProfileType = "oscillator" | "ambient-dim" | "silence";

export interface CreatureAudioProfile {
	/** How this creature affects audio. */
	type: AudioProfileType;
	/** Max distance (blocks) at which the effect is audible. */
	maxRange: number;
	/** Base frequency in Hz (for oscillator types). */
	frequency: number;
	/** Oscillator waveform (for oscillator types). */
	waveform: OscillatorType;
	/** Peak gain at distance 0 [0, 1]. */
	peakGain: number;
	/** How strongly this creature dims ambient audio [0, 1]. */
	ambientDimStrength: number;
}

// ─── Per-Species Profiles ───

const PROFILES: Partial<Record<SpeciesId, CreatureAudioProfile>> = {
	[Species.Morker]: {
		type: "ambient-dim",
		maxRange: 20,
		frequency: 0,
		waveform: "sine",
		peakGain: 0,
		ambientDimStrength: 0.8,
	},
	[Species.Lindorm]: {
		type: "oscillator",
		maxRange: 25,
		frequency: 55,
		waveform: "sine",
		peakGain: 0.6,
		ambientDimStrength: 0,
	},
	[Species.Trana]: {
		type: "oscillator",
		maxRange: 40,
		frequency: 880,
		waveform: "sine",
		peakGain: 0.3,
		ambientDimStrength: 0,
	},
	[Species.Lyktgubbe]: {
		type: "oscillator",
		maxRange: 15,
		frequency: 1200,
		waveform: "triangle",
		peakGain: 0.2,
		ambientDimStrength: 0,
	},
	[Species.Draug]: {
		type: "silence",
		maxRange: 18,
		frequency: 0,
		waveform: "sine",
		peakGain: 0,
		ambientDimStrength: 1,
	},
};

/** Get the audio profile for a creature species, or undefined if none. */
export function getCreatureAudioProfile(species: SpeciesId): CreatureAudioProfile | undefined {
	return PROFILES[species];
}

/**
 * Compute gain for a creature's direct audio (oscillator) based on distance.
 * Linear falloff from peakGain at 0 to 0 at maxRange.
 * Silence-type profiles always return 0.
 */
export function computeCreatureAudioGain(profile: CreatureAudioProfile, distance: number): number {
	if (profile.type === "silence") return 0;
	if (distance >= profile.maxRange) return 0;
	if (distance <= 0) return 1;
	return 1 - distance / profile.maxRange;
}

/** Input for ambient dimming calculation. */
export interface NearbyCreature {
	species: SpeciesId;
	distance: number;
}

/**
 * Compute how much ambient audio should be dimmed by nearby creatures.
 * Returns a multiplier [0, 1] where 1 = full ambient, 0 = total silence.
 *
 * Only creatures with ambient-dim or silence profiles affect the result.
 * The strongest dimming effect wins (min of all individual factors).
 */
export function computeAmbientDimming(creatures: NearbyCreature[]): number {
	if (creatures.length === 0) return 1;

	let minFactor = 1;

	for (const c of creatures) {
		const profile = PROFILES[c.species];
		if (!profile) continue;
		if (profile.ambientDimStrength <= 0) continue;
		if (c.distance >= profile.maxRange) continue;

		const proximity = c.distance <= 0 ? 1 : 1 - c.distance / profile.maxRange;
		const dimming = proximity * profile.ambientDimStrength;
		const factor = 1 - dimming;
		if (factor < minFactor) minFactor = factor;
	}

	return minFactor;
}
