import { beforeEach, describe, expect, test } from "vitest";
import { WorldState } from "../../engine/runes/world-state.ts";
import { createTickState, type TickState } from "../../engine/runes/world-tick.ts";
import { InscriptionIndex, type SurfaceInscription } from "../../engine/runes/inscription.ts";
import { MaterialId } from "../../engine/runes/material.ts";
import { ResourceId } from "../../engine/runes/resource.ts";
import { RuneId } from "./rune-data.ts";
import { resetRuneWorldTickState, runeWorldTickSystem } from "./rune-world-tick.ts";

/** Build a real InscriptionIndex from an array. */
function makeIndex(inscriptions: SurfaceInscription[]): InscriptionIndex {
	const idx = new InscriptionIndex();
	for (const i of inscriptions) idx.add(i);
	return idx;
}

/** Create a basic inscription. */
function ins(x: number, z: number, glyph: number, strength = 10): SurfaceInscription {
	return { x, y: 0, z, nx: 0, ny: 1, nz: 0, glyph: glyph as SurfaceInscription["glyph"], material: MaterialId.Stone, strength };
}

describe("rune-world-tick system", () => {
	beforeEach(() => {
		resetRuneWorldTickState();
	});

	test("ticks the world simulation forward", () => {
		const worldState = new WorldState();
		const tickState = createTickState();
		const index = makeIndex([ins(0, 0, RuneId.Kenaz)]);
		const getMat = () => MaterialId.Stone;

		runeWorldTickSystem(index, getMat, worldState, tickState, new Map());
		expect(tickState.tickCount).toBe(1);
	});

	test("multiple ticks advance tickCount", () => {
		const worldState = new WorldState();
		const tickState = createTickState();
		const index = makeIndex([ins(0, 0, RuneId.Kenaz)]);
		const getMat = () => MaterialId.Stone;

		for (let i = 0; i < 5; i++) {
			runeWorldTickSystem(index, getMat, worldState, tickState, new Map());
		}
		expect(tickState.tickCount).toBe(5);
	});

	test("Berkanan generates resources when powered", () => {
		const worldState = new WorldState();
		const tickState = createTickState();
		// Kenaz emits signal, Berkanan at adjacent position receives it
		const index = makeIndex([
			ins(2, 0, RuneId.Kenaz),
			ins(3, 0, RuneId.Berkanan),
		]);
		const getMat = () => MaterialId.Stone;
		const berkConfig = new Map([["3,0,0", ResourceId.Wood]]);

		// Run enough ticks for signal to propagate and Berkanan to activate
		for (let i = 0; i < 10; i++) {
			runeWorldTickSystem(index, getMat, worldState, tickState, berkConfig);
		}

		// Berkanan should have generated wood resources nearby
		const res = worldState.get(3, 0, 0);
		expect(res).not.toBeNull();
		expect(res?.type).toBe(ResourceId.Wood);
	});

	test("empty inscription index runs without error", () => {
		const worldState = new WorldState();
		const tickState = createTickState();
		const index = makeIndex([]);
		const getMat = () => MaterialId.Stone;

		expect(() => {
			runeWorldTickSystem(index, getMat, worldState, tickState, new Map());
		}).not.toThrow();
	});
});
