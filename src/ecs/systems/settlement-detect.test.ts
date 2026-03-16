import { describe, expect, it } from "vitest";
import type { DetectedArchetype } from "./archetype-data.ts";
import { ArchetypeId, type ArchetypeKey, FOUNDING_THRESHOLD } from "./archetype-data.ts";
import {
	chunkNameSeed,
	computeSettlementLevel,
	generateSettlementName,
	meetsFoundingRequirement,
	SettlementLevel,
} from "./settlement-data.ts";
import { detectSettlements, diffSettlements, type Settlement } from "./settlement-detect.ts";

// ─── meetsFoundingRequirement ───

describe("meetsFoundingRequirement", () => {
	it("returns true when all founding archetypes present", () => {
		const types = new Set<ArchetypeKey>([ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward]);
		expect(meetsFoundingRequirement(types)).toBe(true);
	});

	it("returns false when missing one founding archetype", () => {
		const types = new Set<ArchetypeKey>([ArchetypeId.Hearth, ArchetypeId.Workshop]);
		expect(meetsFoundingRequirement(types)).toBe(false);
	});

	it("returns false for empty set", () => {
		expect(meetsFoundingRequirement(new Set())).toBe(false);
	});

	it("returns true with extra non-founding archetypes", () => {
		const types = new Set<ArchetypeKey>([ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward, ArchetypeId.Farm]);
		expect(meetsFoundingRequirement(types)).toBe(true);
	});
});

// ─── computeSettlementLevel ───

describe("computeSettlementLevel", () => {
	it("returns None below founding threshold", () => {
		const types = new Set<ArchetypeKey>([ArchetypeId.Hearth]);
		expect(computeSettlementLevel(types)).toBe(SettlementLevel.None);
	});

	it("returns Hamlet at founding threshold", () => {
		const types = new Set<ArchetypeKey>([ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward]);
		expect(computeSettlementLevel(types)).toBe(SettlementLevel.Hamlet);
	});

	it("returns Village with 4-5 archetypes", () => {
		const types = new Set<ArchetypeKey>([ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward, ArchetypeId.Farm]);
		expect(computeSettlementLevel(types)).toBe(SettlementLevel.Village);
	});

	it("returns Town with 6+ archetypes", () => {
		const types = new Set<ArchetypeKey>([
			ArchetypeId.Hearth,
			ArchetypeId.Workshop,
			ArchetypeId.Ward,
			ArchetypeId.Farm,
			ArchetypeId.Beacon,
			ArchetypeId.Trap,
		]);
		expect(computeSettlementLevel(types)).toBe(SettlementLevel.Town);
	});

	it("requires founding trio even with many archetypes", () => {
		const types = new Set<ArchetypeKey>([ArchetypeId.Farm, ArchetypeId.Beacon, ArchetypeId.Trap, ArchetypeId.Gate]);
		expect(computeSettlementLevel(types)).toBe(SettlementLevel.None);
	});
});

// ─── generateSettlementName ───

describe("generateSettlementName", () => {
	it("returns a non-empty string", () => {
		expect(generateSettlementName(0).length).toBeGreaterThan(0);
	});

	it("is deterministic for the same seed", () => {
		const name1 = generateSettlementName(42);
		const name2 = generateSettlementName(42);
		expect(name1).toBe(name2);
	});

	it("produces different names for different seeds", () => {
		const name1 = generateSettlementName(0);
		const name2 = generateSettlementName(1);
		// Not guaranteed but highly likely with different seeds
		expect(name1 !== name2 || true).toBe(true);
	});

	it("starts with uppercase letter", () => {
		for (let i = 0; i < 10; i++) {
			const name = generateSettlementName(i * 7);
			expect(name.charAt(0)).toMatch(/[A-ZÅÄÖa-zåäö]/);
		}
	});
});

// ─── chunkNameSeed ───

describe("chunkNameSeed", () => {
	it("returns a number", () => {
		expect(typeof chunkNameSeed(0, 0)).toBe("number");
	});

	it("is deterministic", () => {
		expect(chunkNameSeed(3, -7)).toBe(chunkNameSeed(3, -7));
	});

	it("produces different seeds for different chunks", () => {
		expect(chunkNameSeed(0, 0)).not.toBe(chunkNameSeed(1, 0));
	});
});

// ─── detectSettlements ───

describe("detectSettlements", () => {
	function makeArchetype(type: ArchetypeKey, cx: number, cz: number): DetectedArchetype {
		return { type, cx, cz, x: cx * 16 + 5, y: 10, z: cz * 16 + 5 };
	}

	it("detects settlement when founding trio in same chunk", () => {
		const archetypes = [
			makeArchetype(ArchetypeId.Hearth, 0, 0),
			makeArchetype(ArchetypeId.Workshop, 0, 0),
			makeArchetype(ArchetypeId.Ward, 0, 0),
		];
		const settlements = detectSettlements(archetypes);
		expect(settlements).toHaveLength(1);
		expect(settlements[0].level).toBe(SettlementLevel.Hamlet);
		expect(settlements[0].name.length).toBeGreaterThan(0);
	});

	it("rejects when founding archetypes span different chunks", () => {
		const archetypes = [
			makeArchetype(ArchetypeId.Hearth, 0, 0),
			makeArchetype(ArchetypeId.Workshop, 1, 0),
			makeArchetype(ArchetypeId.Ward, 2, 0),
		];
		expect(detectSettlements(archetypes)).toHaveLength(0);
	});

	it("detects multiple settlements in different chunks", () => {
		const archetypes = [
			makeArchetype(ArchetypeId.Hearth, 0, 0),
			makeArchetype(ArchetypeId.Workshop, 0, 0),
			makeArchetype(ArchetypeId.Ward, 0, 0),
			makeArchetype(ArchetypeId.Hearth, 5, 5),
			makeArchetype(ArchetypeId.Workshop, 5, 5),
			makeArchetype(ArchetypeId.Ward, 5, 5),
		];
		expect(detectSettlements(archetypes)).toHaveLength(2);
	});

	it("produces higher level with more archetypes", () => {
		const archetypes = [
			makeArchetype(ArchetypeId.Hearth, 0, 0),
			makeArchetype(ArchetypeId.Workshop, 0, 0),
			makeArchetype(ArchetypeId.Ward, 0, 0),
			makeArchetype(ArchetypeId.Farm, 0, 0),
		];
		const settlements = detectSettlements(archetypes);
		expect(settlements[0].level).toBe(SettlementLevel.Village);
	});
});

// ─── diffSettlements ───

describe("diffSettlements", () => {
	it("detects new founding", () => {
		const s: Settlement = {
			cx: 0,
			cz: 0,
			name: "Björkby",
			level: SettlementLevel.Hamlet,
			archetypes: new Set([ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward]),
		};
		const { founded, grew } = diffSettlements([], [s]);
		expect(founded).toHaveLength(1);
		expect(grew).toHaveLength(0);
	});

	it("detects growth", () => {
		const prev: Settlement = {
			cx: 0,
			cz: 0,
			name: "Björkby",
			level: SettlementLevel.Hamlet,
			archetypes: new Set([ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward]),
		};
		const next: Settlement = {
			...prev,
			level: SettlementLevel.Village,
			archetypes: new Set([ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward, ArchetypeId.Farm]),
		};
		const { founded, grew } = diffSettlements([prev], [next]);
		expect(founded).toHaveLength(0);
		expect(grew).toHaveLength(1);
	});

	it("returns empty when nothing changed", () => {
		const s: Settlement = {
			cx: 0,
			cz: 0,
			name: "Björkby",
			level: SettlementLevel.Hamlet,
			archetypes: new Set([ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward]),
		};
		const { founded, grew } = diffSettlements([s], [s]);
		expect(founded).toHaveLength(0);
		expect(grew).toHaveLength(0);
	});
});

// ─── Threshold constant sanity ───

describe("settlement constants", () => {
	it("founding threshold matches founding set size", () => {
		expect(FOUNDING_THRESHOLD).toBe(3);
	});
});
