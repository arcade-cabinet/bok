/**
 * Creature audio system tests — written FIRST per visual TDD.
 * Each creature species has a distinct audio profile:
 * - Mörker: ambient dims on proximity
 * - Lindorm: low bass rumble
 * - Trana: distant bird calls
 * - Lyktgubbe: soft chime
 * - Draug: silence (ambient drops to zero)
 */

import { describe, expect, test } from "vitest";
import { Species } from "../traits/index.ts";
import { computeAmbientDimming, computeCreatureAudioGain, getCreatureAudioProfile } from "./creature-audio.ts";

describe("getCreatureAudioProfile", () => {
	test("Morker profile: ambient dim type", () => {
		const p = getCreatureAudioProfile(Species.Morker);
		expect(p).toBeDefined();
		expect(p?.type).toBe("ambient-dim");
		expect(p?.maxRange).toBeGreaterThan(0);
	});

	test("Lindorm profile: bass rumble", () => {
		const p = getCreatureAudioProfile(Species.Lindorm);
		expect(p).toBeDefined();
		expect(p?.type).toBe("oscillator");
		expect(p?.frequency).toBeLessThanOrEqual(80);
	});

	test("Trana profile: distant call", () => {
		const p = getCreatureAudioProfile(Species.Trana);
		expect(p).toBeDefined();
		expect(p?.type).toBe("oscillator");
		expect(p?.frequency).toBeGreaterThan(400);
	});

	test("Lyktgubbe profile: soft chime", () => {
		const p = getCreatureAudioProfile(Species.Lyktgubbe);
		expect(p).toBeDefined();
		expect(p?.type).toBe("oscillator");
		expect(p?.frequency).toBeGreaterThan(500);
	});

	test("Draug profile: silence", () => {
		const p = getCreatureAudioProfile(Species.Draug);
		expect(p).toBeDefined();
		expect(p?.type).toBe("silence");
	});

	test("unknown species returns undefined", () => {
		// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
		const p = getCreatureAudioProfile("unknown" as any);
		expect(p).toBeUndefined();
	});
});

describe("computeCreatureAudioGain", () => {
	function profile(species: string) {
		// biome-ignore lint/suspicious/noExplicitAny: test helper casts string to SpeciesId
		const p = getCreatureAudioProfile(species as any);
		if (!p) throw new Error(`No profile for ${species}`);
		return p;
	}

	test("gain is 0 at max range", () => {
		const p = profile(Species.Lindorm);
		const gain = computeCreatureAudioGain(p, p.maxRange);
		expect(gain).toBe(0);
	});

	test("gain is 1 at distance 0", () => {
		const p = profile(Species.Lindorm);
		const gain = computeCreatureAudioGain(p, 0);
		expect(gain).toBe(1);
	});

	test("gain falls off linearly with distance", () => {
		const p = profile(Species.Trana);
		const halfDist = p.maxRange / 2;
		const gain = computeCreatureAudioGain(p, halfDist);
		expect(gain).toBeCloseTo(0.5);
	});

	test("gain is 0 beyond max range", () => {
		const p = profile(Species.Lindorm);
		const gain = computeCreatureAudioGain(p, p.maxRange + 10);
		expect(gain).toBe(0);
	});

	test("silence type always returns 0 gain", () => {
		const p = profile(Species.Draug);
		expect(computeCreatureAudioGain(p, 0)).toBe(0);
		expect(computeCreatureAudioGain(p, 5)).toBe(0);
	});
});

describe("computeAmbientDimming", () => {
	test("no creatures: dimming factor is 1 (full ambient)", () => {
		const factor = computeAmbientDimming([]);
		expect(factor).toBe(1);
	});

	test("Morker at distance 0: maximum dimming", () => {
		const factor = computeAmbientDimming([{ species: Species.Morker, distance: 0 }]);
		expect(factor).toBeLessThan(0.5);
	});

	test("Morker at max range: no dimming", () => {
		const p = getCreatureAudioProfile(Species.Morker);
		expect(p).toBeDefined();
		const factor = computeAmbientDimming([{ species: Species.Morker, distance: p?.maxRange ?? 0 }]);
		expect(factor).toBe(1);
	});

	test("Draug at distance 0: ambient drops to 0", () => {
		const factor = computeAmbientDimming([{ species: Species.Draug, distance: 0 }]);
		expect(factor).toBe(0);
	});

	test("Draug beyond range: no dimming", () => {
		const p = getCreatureAudioProfile(Species.Draug);
		expect(p).toBeDefined();
		const factor = computeAmbientDimming([{ species: Species.Draug, distance: (p?.maxRange ?? 0) + 1 }]);
		expect(factor).toBe(1);
	});

	test("multiple creatures: strongest dimming wins", () => {
		const morkerProfile = getCreatureAudioProfile(Species.Morker);
		expect(morkerProfile).toBeDefined();
		const range = morkerProfile?.maxRange ?? 0;
		const factor = computeAmbientDimming([
			{ species: Species.Morker, distance: range / 2 },
			{ species: Species.Morker, distance: range / 4 },
		]);
		// Closer Mörker should dominate
		const singleFactor = computeAmbientDimming([{ species: Species.Morker, distance: range / 4 }]);
		expect(factor).toBeCloseTo(singleFactor);
	});

	test("non-dimming creatures do not affect ambient", () => {
		const factor = computeAmbientDimming([
			{ species: Species.Trana, distance: 5 },
			{ species: Species.Lyktgubbe, distance: 3 },
		]);
		expect(factor).toBe(1);
	});
});
