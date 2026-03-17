import { describe, expect, it } from "vitest";
import { Species } from "../traits/index.ts";
import { RuneId } from "./rune-data.ts";
import {
	checkDiscoveryTrigger,
	type DiscoveryContext,
	isCreatureNearby,
	isInBiome,
	isLandmarkNearby,
	isSunriseObserved,
} from "./rune-discovery.ts";
import { RUNE_DISCOVERIES, type RuneDiscoveryEntry } from "./rune-discovery-data.ts";

function baseCtx(overrides: Partial<DiscoveryContext> = {}): DiscoveryContext {
	return {
		timeOfDay: 0.25,
		prevTimeOfDay: 0.24,
		nearbyCreatures: [],
		nearbyLandmarks: [],
		currentBiome: "angen",
		tookDamage: false,
		creaturesKilled: 0,
		...overrides,
	};
}

function findEntry(runeId: number): RuneDiscoveryEntry {
	const entry = RUNE_DISCOVERIES.find((e) => e.runeId === runeId);
	if (!entry) throw new Error(`No entry for rune ${runeId}`);
	return entry;
}

describe("isSunriseObserved", () => {
	it("returns true when time crosses into dawn window", () => {
		expect(isSunriseObserved(0.19, 0.21)).toBe(true);
	});

	it("returns false when already in dawn window", () => {
		expect(isSunriseObserved(0.21, 0.25)).toBe(false);
	});

	it("returns false when well past dawn", () => {
		expect(isSunriseObserved(0.5, 0.6)).toBe(false);
	});

	it("returns false when time is before dawn", () => {
		expect(isSunriseObserved(0.1, 0.15)).toBe(false);
	});
});

describe("isCreatureNearby", () => {
	it("returns true when species is in nearby list", () => {
		expect(isCreatureNearby([Species.Runvaktare, Species.Morker], "runvaktare")).toBe(true);
	});

	it("returns false when species is not nearby", () => {
		expect(isCreatureNearby([Species.Morker], "runvaktare")).toBe(false);
	});

	it("returns false for empty list", () => {
		expect(isCreatureNearby([], "morker")).toBe(false);
	});
});

describe("isLandmarkNearby", () => {
	it("returns true when landmark type is nearby", () => {
		expect(isLandmarkNearby(["runsten", "fornlamning"], "runsten")).toBe(true);
	});

	it("returns false when landmark type is not nearby", () => {
		expect(isLandmarkNearby(["stenhog"], "runsten")).toBe(false);
	});
});

describe("isInBiome", () => {
	it("matches exact biome name", () => {
		expect(isInBiome("fjallen", "fjallen")).toBe(true);
	});

	it("does not match different biome", () => {
		expect(isInBiome("angen", "fjallen")).toBe(false);
	});
});

describe("checkDiscoveryTrigger", () => {
	it("tutorial rune is always discoverable", () => {
		const entry = findEntry(RuneId.Kenaz);
		expect(checkDiscoveryTrigger(entry, baseCtx())).toBe(true);
	});

	it("Sowilo triggers on sunrise", () => {
		const entry = findEntry(RuneId.Sowilo);
		// Crossing into dawn
		expect(checkDiscoveryTrigger(entry, baseCtx({ prevTimeOfDay: 0.19, timeOfDay: 0.21 }))).toBe(true);
		// Not crossing
		expect(checkDiscoveryTrigger(entry, baseCtx({ prevTimeOfDay: 0.5, timeOfDay: 0.6 }))).toBe(false);
	});

	it("Ansuz triggers when Runväktare is nearby", () => {
		const entry = findEntry(RuneId.Ansuz);
		expect(checkDiscoveryTrigger(entry, baseCtx({ nearbyCreatures: [Species.Runvaktare] }))).toBe(true);
		expect(checkDiscoveryTrigger(entry, baseCtx({ nearbyCreatures: [Species.Morker] }))).toBe(false);
	});

	it("Jera triggers when Skogssnigle is nearby", () => {
		const entry = findEntry(RuneId.Jera);
		expect(checkDiscoveryTrigger(entry, baseCtx({ nearbyCreatures: [Species.Skogssnigle] }))).toBe(true);
	});

	it("Thurisaz triggers on damage", () => {
		const entry = findEntry(RuneId.Thurisaz);
		expect(checkDiscoveryTrigger(entry, baseCtx({ tookDamage: true }))).toBe(true);
		expect(checkDiscoveryTrigger(entry, baseCtx({ tookDamage: false }))).toBe(false);
	});

	it("Fehu triggers near runsten landmark", () => {
		const entry = findEntry(RuneId.Fehu);
		expect(checkDiscoveryTrigger(entry, baseCtx({ nearbyLandmarks: ["runsten"] }))).toBe(true);
		expect(checkDiscoveryTrigger(entry, baseCtx({ nearbyLandmarks: ["stenhog"] }))).toBe(false);
	});

	it("Algiz triggers near fornlamning landmark", () => {
		const entry = findEntry(RuneId.Algiz);
		expect(checkDiscoveryTrigger(entry, baseCtx({ nearbyLandmarks: ["fornlamning"] }))).toBe(true);
	});

	it("Isa triggers in fjallen biome", () => {
		const entry = findEntry(RuneId.Isa);
		expect(checkDiscoveryTrigger(entry, baseCtx({ currentBiome: "fjallen" }))).toBe(true);
		expect(checkDiscoveryTrigger(entry, baseCtx({ currentBiome: "angen" }))).toBe(false);
	});

	it("Berkanan triggers in bokskogen biome", () => {
		const entry = findEntry(RuneId.Berkanan);
		expect(checkDiscoveryTrigger(entry, baseCtx({ currentBiome: "bokskogen" }))).toBe(true);
	});

	it("Hagalaz triggers when creatures have been killed", () => {
		const entry = findEntry(RuneId.Hagalaz);
		expect(checkDiscoveryTrigger(entry, baseCtx({ creaturesKilled: 1 }))).toBe(true);
		expect(checkDiscoveryTrigger(entry, baseCtx({ creaturesKilled: 0 }))).toBe(false);
	});

	it("Uruz triggers when Lindorm is nearby", () => {
		const entry = findEntry(RuneId.Uruz);
		expect(checkDiscoveryTrigger(entry, baseCtx({ nearbyCreatures: [Species.Lindorm] }))).toBe(true);
	});

	it("Mannaz triggers when Vittra is nearby", () => {
		const entry = findEntry(RuneId.Mannaz);
		expect(checkDiscoveryTrigger(entry, baseCtx({ nearbyCreatures: [Species.Vittra] }))).toBe(true);
	});
});
