// ─── Circuit Recognizer Tests ───
// Verifies that known rune circuit patterns are detected from inscription topology.
// Tests written FIRST per visual TDD.

import { describe, expect, it } from "vitest";
import type { SurfaceInscription } from "../../engine/runes/inscription.ts";
import { InscriptionIndex } from "../../engine/runes/inscription.ts";
import { MaterialId } from "../../engine/runes/material.ts";
import { CircuitType, scanCircuits } from "./circuit-recognizer.ts";
import { RuneId } from "./rune-data.ts";

// ─── Helpers ───

function ins(x: number, z: number, glyph: number, strength = 10): SurfaceInscription {
	return {
		x,
		y: 0,
		z,
		nx: 0,
		ny: 1,
		nz: 0,
		glyph: glyph as SurfaceInscription["glyph"],
		material: MaterialId.Stone,
		strength,
	};
}

function buildIndex(inscriptions: SurfaceInscription[]): InscriptionIndex {
	const idx = new InscriptionIndex();
	for (const i of inscriptions) idx.add(i);
	return idx;
}

// ─── NOT Gate ───

describe("Circuit Recognizer: NOT gate", () => {
	it("detects Naudiz as a NOT gate", () => {
		const index = buildIndex([ins(0, 0, RuneId.Kenaz), ins(3, 0, RuneId.Naudiz)]);
		const matches = scanCircuits(index);
		const notGates = matches.filter((m) => m.type === CircuitType.NotGate);
		expect(notGates.length).toBe(1);
		expect(notGates[0].runes).toContain(RuneId.Naudiz);
	});

	it("does not detect NOT gate without Naudiz", () => {
		const index = buildIndex([ins(0, 0, RuneId.Kenaz), ins(3, 0, RuneId.Fehu)]);
		const matches = scanCircuits(index);
		const notGates = matches.filter((m) => m.type === CircuitType.NotGate);
		expect(notGates.length).toBe(0);
	});
});

// ─── AND Gate ───

describe("Circuit Recognizer: AND gate", () => {
	it("detects Hagalaz with two inputs as AND gate", () => {
		const index = buildIndex([ins(0, 0, RuneId.Kenaz), ins(3, 0, RuneId.Kenaz), ins(1, 1, RuneId.Hagalaz)]);
		const matches = scanCircuits(index);
		const andGates = matches.filter((m) => m.type === CircuitType.AndGate);
		expect(andGates.length).toBe(1);
	});

	it("does not detect AND gate with only one input", () => {
		const index = buildIndex([ins(0, 0, RuneId.Kenaz), ins(1, 1, RuneId.Hagalaz)]);
		const matches = scanCircuits(index);
		const andGates = matches.filter((m) => m.type === CircuitType.AndGate);
		expect(andGates.length).toBe(0);
	});
});

// ─── Clock ───

describe("Circuit Recognizer: Clock", () => {
	it("detects Naudiz + Isa pair as clock oscillator", () => {
		const index = buildIndex([ins(0, 0, RuneId.Naudiz), ins(2, 0, RuneId.Isa)]);
		const matches = scanCircuits(index);
		const clocks = matches.filter((m) => m.type === CircuitType.Clock);
		expect(clocks.length).toBe(1);
		expect(clocks[0].runes).toContain(RuneId.Naudiz);
		expect(clocks[0].runes).toContain(RuneId.Isa);
	});
});

// ─── Production Chain ───

describe("Circuit Recognizer: Production Chain", () => {
	it("detects Kenaz → Berkanan → Fehu → Jera as production chain", () => {
		const index = buildIndex([
			ins(0, 0, RuneId.Kenaz),
			ins(2, 0, RuneId.Berkanan),
			ins(4, 0, RuneId.Fehu),
			ins(6, 0, RuneId.Jera),
		]);
		const matches = scanCircuits(index);
		const chains = matches.filter((m) => m.type === CircuitType.ProductionChain);
		expect(chains.length).toBe(1);
	});

	it("does not detect chain if missing Jera (transformer)", () => {
		const index = buildIndex([ins(0, 0, RuneId.Kenaz), ins(2, 0, RuneId.Berkanan), ins(4, 0, RuneId.Fehu)]);
		const matches = scanCircuits(index);
		const chains = matches.filter((m) => m.type === CircuitType.ProductionChain);
		expect(chains.length).toBe(0);
	});
});

// ─── Multiple patterns ───

describe("Circuit Recognizer: Multiple patterns", () => {
	it("detects both NOT gate and clock in the same scan", () => {
		const index = buildIndex([ins(0, 0, RuneId.Naudiz), ins(2, 0, RuneId.Isa)]);
		const matches = scanCircuits(index);
		// Naudiz alone is a NOT gate, Naudiz+Isa is a clock
		const notGates = matches.filter((m) => m.type === CircuitType.NotGate);
		const clocks = matches.filter((m) => m.type === CircuitType.Clock);
		expect(notGates.length).toBe(1);
		expect(clocks.length).toBe(1);
	});
});

// ─── Empty index ───

describe("Circuit Recognizer: Edge cases", () => {
	it("returns empty array for empty index", () => {
		const index = new InscriptionIndex();
		const matches = scanCircuits(index);
		expect(matches).toEqual([]);
	});

	it("returns empty for runes too far apart to connect", () => {
		const index = buildIndex([
			ins(0, 0, RuneId.Naudiz),
			ins(50, 0, RuneId.Isa), // way beyond signal range
		]);
		const matches = scanCircuits(index);
		const clocks = matches.filter((m) => m.type === CircuitType.Clock);
		expect(clocks.length).toBe(0);
	});
});
