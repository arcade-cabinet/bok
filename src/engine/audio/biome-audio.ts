// ─── Biome Ambient Audio ───
// Maps each biome to a sound palette and handles crossfade transitions.
// Pure state + commands pattern — returns audio commands for the caller
// (Tone.js synthesis layer) to execute. No browser APIs here.

import { Biome, type BiomeId } from "../../world/biomes.ts";

// ─── Sound Palette ───

export interface SoundLayer {
	layerId: string;
	targetVolume: number;
}

/** Ambient sound palette per biome — all synthesized via Tone.js, no samples. */
export const BIOME_SOUND_PALETTES: Record<BiomeId, SoundLayer[]> = {
	[Biome.Angen]: [
		{ layerId: "birds", targetVolume: 0.5 },
		{ layerId: "breeze", targetVolume: 0.35 },
	],
	[Biome.Bokskogen]: [
		{ layerId: "forest", targetVolume: 0.5 },
		{ layerId: "kulning", targetVolume: 0.15 },
	],
	[Biome.Fjallen]: [
		{ layerId: "mountain-wind", targetVolume: 0.6 },
		{ layerId: "echoes", targetVolume: 0.2 },
	],
	[Biome.Skargarden]: [
		{ layerId: "waves", targetVolume: 0.55 },
		{ layerId: "seabirds", targetVolume: 0.35 },
	],
	[Biome.Myren]: [
		{ layerId: "swamp-bubbles", targetVolume: 0.4 },
		{ layerId: "insects", targetVolume: 0.45 },
	],
	[Biome.Blothogen]: [
		{ layerId: "bass-hum", targetVolume: 0.25 },
		{ layerId: "silence", targetVolume: 0.05 },
	],
};

// ─── State ───

export interface BiomeAudioState {
	currentBiome: BiomeId | null;
	targetBiome: BiomeId | null;
	fadeProgress: number;
	fadeDuration: number;
}

export function createBiomeAudioState(fadeDuration = 2): BiomeAudioState {
	return { currentBiome: null, targetBiome: null, fadeProgress: 0, fadeDuration };
}

// ─── Commands ───

export interface VolumeChange {
	layerId: string;
	volume: number;
}

export interface AudioCommands {
	start: string[];
	stop: string[];
	volumeChanges: VolumeChange[];
}

const EMPTY_COMMANDS: AudioCommands = { start: [], stop: [], volumeChanges: [] };

// ─── Update ───

export function updateBiomeAudio(state: BiomeAudioState, biome: BiomeId, dt: number): AudioCommands {
	// First-time initialization
	if (state.currentBiome === null) {
		state.currentBiome = biome;
		const palette = BIOME_SOUND_PALETTES[biome];
		return { start: palette.map((l) => l.layerId), stop: [], volumeChanges: [] };
	}

	// No change and no active fade
	if (state.targetBiome === null && biome === state.currentBiome) {
		return EMPTY_COMMANDS;
	}

	// New biome transition requested
	if (state.targetBiome !== biome && biome !== state.currentBiome) {
		return startFade(state, biome, dt);
	}

	// Continue existing fade
	if (state.targetBiome !== null) {
		return tickFade(state, dt);
	}

	return EMPTY_COMMANDS;
}

function startFade(state: BiomeAudioState, newBiome: BiomeId, dt: number): AudioCommands {
	state.targetBiome = newBiome;
	state.fadeProgress = 0;

	const newPalette = BIOME_SOUND_PALETTES[newBiome];
	const commands: AudioCommands = {
		start: newPalette.map((l) => l.layerId),
		stop: [],
		volumeChanges: [],
	};

	// First tick of the fade
	return mergeCommands(commands, tickFade(state, dt));
}

function tickFade(state: BiomeAudioState, dt: number): AudioCommands {
	if (state.targetBiome === null || state.currentBiome === null) return EMPTY_COMMANDS;

	state.fadeProgress = Math.min(1, state.fadeProgress + dt / state.fadeDuration);
	const t = state.fadeProgress;

	const oldPalette = BIOME_SOUND_PALETTES[state.currentBiome];
	const newPalette = BIOME_SOUND_PALETTES[state.targetBiome];

	const volumeChanges: VolumeChange[] = [
		...oldPalette.map((l) => ({ layerId: l.layerId, volume: l.targetVolume * (1 - t) })),
		...newPalette.map((l) => ({ layerId: l.layerId, volume: l.targetVolume * t })),
	];

	// Fade complete
	if (t >= 1) {
		const stop = oldPalette.map((l) => l.layerId);
		state.currentBiome = state.targetBiome;
		state.targetBiome = null;
		state.fadeProgress = 0;
		return { start: [], stop, volumeChanges };
	}

	return { start: [], stop: [], volumeChanges };
}

function mergeCommands(a: AudioCommands, b: AudioCommands): AudioCommands {
	return {
		start: [...a.start, ...b.start],
		stop: [...a.stop, ...b.stop],
		volumeChanges: [...a.volumeChanges, ...b.volumeChanges],
	};
}

// ─── Queries ───

export function getActiveLayerIds(state: BiomeAudioState): string[] {
	if (state.currentBiome === null) return [];
	const current = BIOME_SOUND_PALETTES[state.currentBiome].map((l) => l.layerId);
	if (state.targetBiome === null) return current;
	const target = BIOME_SOUND_PALETTES[state.targetBiome].map((l) => l.layerId);
	return [...current, ...target];
}
