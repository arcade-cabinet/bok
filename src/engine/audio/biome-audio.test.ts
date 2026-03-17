import { describe, expect, it } from "vitest";
import { Biome, type BiomeId } from "../../world/biomes.ts";
import { BIOME_SOUND_PALETTES, createBiomeAudioState, getActiveLayerIds, updateBiomeAudio } from "./biome-audio.ts";

describe("BIOME_SOUND_PALETTES", () => {
	it("defines palettes for all 6 biomes", () => {
		const biomeIds: BiomeId[] = [
			Biome.Angen,
			Biome.Bokskogen,
			Biome.Fjallen,
			Biome.Skargarden,
			Biome.Myren,
			Biome.Blothogen,
		];
		for (const id of biomeIds) {
			expect(BIOME_SOUND_PALETTES[id]).toBeDefined();
			expect(BIOME_SOUND_PALETTES[id].length).toBeGreaterThan(0);
		}
	});

	it("Ängen has birds and breeze", () => {
		const palette = BIOME_SOUND_PALETTES[Biome.Angen];
		const ids = palette.map((l) => l.layerId);
		expect(ids).toContain("birds");
		expect(ids).toContain("breeze");
	});

	it("Bokskogen has forest and kulning", () => {
		const palette = BIOME_SOUND_PALETTES[Biome.Bokskogen];
		const ids = palette.map((l) => l.layerId);
		expect(ids).toContain("forest");
		expect(ids).toContain("kulning");
	});

	it("Fjällen has mountain-wind and echoes", () => {
		const palette = BIOME_SOUND_PALETTES[Biome.Fjallen];
		const ids = palette.map((l) => l.layerId);
		expect(ids).toContain("mountain-wind");
		expect(ids).toContain("echoes");
	});

	it("Skärgården has waves and seabirds", () => {
		const palette = BIOME_SOUND_PALETTES[Biome.Skargarden];
		const ids = palette.map((l) => l.layerId);
		expect(ids).toContain("waves");
		expect(ids).toContain("seabirds");
	});

	it("Myren has swamp-bubbles and insects", () => {
		const palette = BIOME_SOUND_PALETTES[Biome.Myren];
		const ids = palette.map((l) => l.layerId);
		expect(ids).toContain("swamp-bubbles");
		expect(ids).toContain("insects");
	});

	it("Blothögen has bass-hum (near-silence)", () => {
		const palette = BIOME_SOUND_PALETTES[Biome.Blothogen];
		const ids = palette.map((l) => l.layerId);
		expect(ids).toContain("bass-hum");
		expect(palette.length).toBeLessThanOrEqual(2);
	});
});

describe("createBiomeAudioState", () => {
	it("creates state with no active biome", () => {
		const state = createBiomeAudioState();
		expect(state.currentBiome).toBeNull();
		expect(state.targetBiome).toBeNull();
		expect(state.fadeProgress).toBe(0);
		expect(state.fadeDuration).toBe(2);
	});

	it("accepts custom fade duration", () => {
		const state = createBiomeAudioState(3);
		expect(state.fadeDuration).toBe(3);
	});
});

describe("updateBiomeAudio", () => {
	it("sets initial biome immediately (no crossfade)", () => {
		const state = createBiomeAudioState();
		const commands = updateBiomeAudio(state, Biome.Angen, 0.016);

		expect(state.currentBiome).toBe(Biome.Angen);
		expect(state.targetBiome).toBeNull();
		expect(commands.start.length).toBeGreaterThan(0);
		expect(commands.stop.length).toBe(0);
	});

	it("starts crossfade when biome changes", () => {
		const state = createBiomeAudioState();
		updateBiomeAudio(state, Biome.Angen, 0.016);

		const commands = updateBiomeAudio(state, Biome.Fjallen, 0.016);
		expect(state.targetBiome).toBe(Biome.Fjallen);
		expect(state.fadeProgress).toBeGreaterThan(0);
		expect(commands.start.length).toBeGreaterThan(0);
		expect(commands.volumeChanges.length).toBeGreaterThan(0);
	});

	it("completes crossfade after fade duration", () => {
		const state = createBiomeAudioState(1); // 1 second fade
		updateBiomeAudio(state, Biome.Angen, 0.016);

		// Start crossfade to Fjällen
		updateBiomeAudio(state, Biome.Fjallen, 0.016);

		// Tick past the full fade duration
		const commands = updateBiomeAudio(state, Biome.Fjallen, 1.0);

		expect(state.currentBiome).toBe(Biome.Fjallen);
		expect(state.targetBiome).toBeNull();
		expect(state.fadeProgress).toBe(0);
		expect(commands.stop.length).toBeGreaterThan(0);
	});

	it("returns no commands when biome unchanged and no fade active", () => {
		const state = createBiomeAudioState();
		updateBiomeAudio(state, Biome.Angen, 0.016);

		const commands = updateBiomeAudio(state, Biome.Angen, 0.016);
		expect(commands.start.length).toBe(0);
		expect(commands.stop.length).toBe(0);
		expect(commands.volumeChanges.length).toBe(0);
	});

	it("volume changes interpolate during crossfade", () => {
		const state = createBiomeAudioState(2); // 2 second fade
		updateBiomeAudio(state, Biome.Angen, 0.016);

		// Start crossfade
		updateBiomeAudio(state, Biome.Fjallen, 0.016);

		// Tick halfway through
		const commands = updateBiomeAudio(state, Biome.Fjallen, 1.0);
		expect(state.fadeProgress).toBeCloseTo(0.508, 1);

		// Old biome layers should be fading out, new ones fading in
		const fadingOut = commands.volumeChanges.filter((c) =>
			BIOME_SOUND_PALETTES[Biome.Angen].some((p) => p.layerId === c.layerId),
		);
		const fadingIn = commands.volumeChanges.filter((c) =>
			BIOME_SOUND_PALETTES[Biome.Fjallen].some((p) => p.layerId === c.layerId),
		);

		for (const change of fadingOut) {
			expect(change.volume).toBeLessThan(1);
			expect(change.volume).toBeGreaterThanOrEqual(0);
		}
		for (const change of fadingIn) {
			expect(change.volume).toBeGreaterThan(0);
			expect(change.volume).toBeLessThanOrEqual(1);
		}
	});

	it("handles rapid biome changes by restarting fade", () => {
		const state = createBiomeAudioState(2);
		updateBiomeAudio(state, Biome.Angen, 0.016);
		updateBiomeAudio(state, Biome.Fjallen, 0.5);

		// Change again mid-fade
		const commands = updateBiomeAudio(state, Biome.Myren, 0.016);
		expect(state.targetBiome).toBe(Biome.Myren);
		expect(commands.start.length).toBeGreaterThan(0);
	});
});

describe("getActiveLayerIds", () => {
	it("returns current biome layers when no fade", () => {
		const state = createBiomeAudioState();
		updateBiomeAudio(state, Biome.Angen, 0.016);

		const ids = getActiveLayerIds(state);
		const expected = BIOME_SOUND_PALETTES[Biome.Angen].map((p) => p.layerId);
		expect(ids).toEqual(expected);
	});

	it("returns both biome layers during crossfade", () => {
		const state = createBiomeAudioState(2);
		updateBiomeAudio(state, Biome.Angen, 0.016);
		updateBiomeAudio(state, Biome.Fjallen, 0.016);

		const ids = getActiveLayerIds(state);
		const angenIds = BIOME_SOUND_PALETTES[Biome.Angen].map((p) => p.layerId);
		const fjallenIds = BIOME_SOUND_PALETTES[Biome.Fjallen].map((p) => p.layerId);

		for (const id of angenIds) expect(ids).toContain(id);
		for (const id of fjallenIds) expect(ids).toContain(id);
	});

	it("returns empty array when no biome set", () => {
		const state = createBiomeAudioState();
		expect(getActiveLayerIds(state)).toEqual([]);
	});
});
