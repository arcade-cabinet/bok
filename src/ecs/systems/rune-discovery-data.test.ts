import { describe, expect, it } from "vitest";
import { RuneId } from "./rune-data.ts";
import {
	DiscoveryTrigger,
	getDiscoveryEntry,
	getTutorialRunes,
	RUNE_DISCOVERIES,
	TOTAL_DISCOVERABLE_RUNES,
} from "./rune-discovery-data.ts";

describe("rune-discovery-data", () => {
	it("has an entry for each placeable rune", () => {
		const ids = new Set(RUNE_DISCOVERIES.map((e) => e.runeId));
		expect(ids.has(RuneId.Kenaz)).toBe(true);
		expect(ids.has(RuneId.Sowilo)).toBe(true);
		expect(ids.has(RuneId.Fehu)).toBe(true);
		expect(ids.has(RuneId.Ansuz)).toBe(true);
		expect(ids.has(RuneId.Algiz)).toBe(true);
		expect(ids.has(RuneId.Jera)).toBe(true);
		expect(ids.has(RuneId.Thurisaz)).toBe(true);
		expect(ids.has(RuneId.Uruz)).toBe(true);
		expect(ids.has(RuneId.Berkanan)).toBe(true);
		expect(ids.has(RuneId.Mannaz)).toBe(true);
		expect(ids.has(RuneId.Naudiz)).toBe(true);
		expect(ids.has(RuneId.Isa)).toBe(true);
		expect(ids.has(RuneId.Hagalaz)).toBe(true);
		expect(ids.has(RuneId.Raido)).toBe(true);
		expect(ids.has(RuneId.Tiwaz)).toBe(true);
	});

	it("has no duplicate rune IDs", () => {
		const ids = RUNE_DISCOVERIES.map((e) => e.runeId);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("TOTAL_DISCOVERABLE_RUNES matches array length", () => {
		expect(TOTAL_DISCOVERABLE_RUNES).toBe(RUNE_DISCOVERIES.length);
		expect(TOTAL_DISCOVERABLE_RUNES).toBe(15);
	});

	it("getDiscoveryEntry returns entry for valid rune", () => {
		const entry = getDiscoveryEntry(RuneId.Kenaz);
		expect(entry).toBeDefined();
		expect(entry?.title).toContain("Kenaz");
		expect(entry?.trigger).toBe(DiscoveryTrigger.Tutorial);
	});

	it("getDiscoveryEntry returns undefined for invalid rune", () => {
		expect(getDiscoveryEntry(999)).toBeUndefined();
	});

	it("getTutorialRunes returns Kenaz", () => {
		const tutorials = getTutorialRunes();
		expect(tutorials).toContain(RuneId.Kenaz);
		expect(tutorials.length).toBeGreaterThan(0);
	});

	it("every entry has title, discoveryText, behaviorText, sagaText", () => {
		for (const entry of RUNE_DISCOVERIES) {
			expect(entry.title.length).toBeGreaterThan(0);
			expect(entry.discoveryText.length).toBeGreaterThan(0);
			expect(entry.behaviorText.length).toBeGreaterThan(0);
			expect(entry.sagaText).toContain("{day}");
		}
	});

	it("each trigger type is a valid DiscoveryTrigger value", () => {
		const validTriggers = new Set(Object.values(DiscoveryTrigger));
		for (const entry of RUNE_DISCOVERIES) {
			expect(validTriggers.has(entry.trigger)).toBe(true);
		}
	});
});
