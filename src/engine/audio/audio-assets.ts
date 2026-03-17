/**
 * Audio asset definitions for Bok's Swedish soundscape.
 * All sounds are Tone.js synthesis recipes — no sample files.
 *
 * Categories:
 *  - interaction: player actions (mine, place, chisel, rune)
 *  - thematic: narrative moments (nyckelharpa, kulning, bok open)
 *  - ambient: continuous layers (wind, water, forest)
 */

// ─── One-Shot Sound IDs ───

export const InteractionSounds = {
	mine_hit: "mine_hit",
	block_place: "block_place",
	chisel_tap: "chisel_tap",
	rune_glow: "rune_glow",
} as const;

export const ThematicSounds = {
	nyckelharpa_discovery: "nyckelharpa_discovery",
	kulning_dawn: "kulning_dawn",
	bok_open: "bok_open",
} as const;

export type InteractionSoundId = (typeof InteractionSounds)[keyof typeof InteractionSounds];
export type ThematicSoundId = (typeof ThematicSounds)[keyof typeof ThematicSounds];
export type AudioAssetId = InteractionSoundId | ThematicSoundId;

// ─── Ambient Layer IDs ───

export const AmbientLayers = {
	wind: "wind",
	water: "water",
	forest: "forest",
} as const;

export type AmbientLayerId = (typeof AmbientLayers)[keyof typeof AmbientLayers];

// ─── Synthesis Recipes ───

/** Parameters for a one-shot synth voice. */
export interface OneShotRecipe {
	type: "synth" | "fm" | "am" | "metal" | "noise";
	note?: string;
	duration?: string | number;
	volume?: number;
	envelope?: {
		attack?: number;
		decay?: number;
		sustain?: number;
		release?: number;
	};
	modulationIndex?: number;
	harmonicity?: number;
}

/** Parameters for a continuous ambient layer. */
export interface AmbientRecipe {
	type: "noise";
	noiseType?: "white" | "pink" | "brown";
	filterFreq?: number;
	filterType?: "lowpass" | "bandpass" | "highpass";
	volume?: number;
}

/** One-shot sound recipes keyed by AudioAssetId. */
export const oneShotRecipes: Record<AudioAssetId, OneShotRecipe> = {
	// ─── Interaction Sounds ───
	mine_hit: {
		type: "metal",
		note: "C3",
		duration: 0.08,
		volume: -12,
		envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
	},
	block_place: {
		type: "synth",
		note: "G3",
		duration: 0.1,
		volume: -15,
		envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.08 },
	},
	chisel_tap: {
		type: "metal",
		note: "E5",
		duration: 0.06,
		volume: -10,
		envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.03 },
	},
	rune_glow: {
		type: "fm",
		note: "A4",
		duration: 0.8,
		volume: -18,
		envelope: { attack: 0.2, decay: 0.3, sustain: 0.4, release: 0.5 },
		modulationIndex: 3,
		harmonicity: 2.5,
	},

	// ─── Thematic Sounds ───
	nyckelharpa_discovery: {
		type: "fm",
		note: "D4",
		duration: 1.5,
		volume: -14,
		envelope: { attack: 0.1, decay: 0.4, sustain: 0.5, release: 0.8 },
		modulationIndex: 5,
		harmonicity: 3,
	},
	kulning_dawn: {
		type: "am",
		note: "A5",
		duration: 2.0,
		volume: -16,
		envelope: { attack: 0.3, decay: 0.5, sustain: 0.6, release: 1.0 },
		harmonicity: 1.5,
	},
	bok_open: {
		type: "noise",
		duration: 0.4,
		volume: -20,
		envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
	},
};

/** Ambient layer recipes keyed by AmbientLayerId. */
export const ambientRecipes: Record<AmbientLayerId, AmbientRecipe> = {
	wind: {
		type: "noise",
		noiseType: "brown",
		filterFreq: 400,
		filterType: "lowpass",
		volume: -28,
	},
	water: {
		type: "noise",
		noiseType: "white",
		filterFreq: 2000,
		filterType: "bandpass",
		volume: -32,
	},
	forest: {
		type: "noise",
		noiseType: "pink",
		filterFreq: 3000,
		filterType: "highpass",
		volume: -35,
	},
};
