// ─── Circuit Recognizer ───
// Scans an InscriptionIndex for known circuit topologies:
// clock, NOT gate, AND gate, production chain.
// Returns matched patterns for codex/saga discovery.
// No ECS, no Three.js — pure topology analysis.

import type { InscriptionIndex, SurfaceInscription } from "../../engine/runes/inscription.ts";
import { RuneId } from "./rune-data.ts";

// ─── Circuit Types ───

export const CircuitType = {
	NotGate: "not_gate",
	AndGate: "and_gate",
	Clock: "clock",
	ProductionChain: "production_chain",
} as const;

export type CircuitTypeId = (typeof CircuitType)[keyof typeof CircuitType];

export interface CircuitMatch {
	type: CircuitTypeId;
	/** Rune IDs involved in the match. */
	runes: number[];
	/** Codex title for this discovery. */
	title: string;
	/** Saga text (uses {day} placeholder). */
	sagaText: string;
}

// ─── Discovery Text ───

const CIRCUIT_INFO: Record<CircuitTypeId, { title: string; sagaText: string }> = {
	[CircuitType.NotGate]: {
		title: "Naudiz Inverter — NOT Gate",
		sagaText: "Day {day} — A rune that speaks when silenced. The inverter is understood.",
	},
	[CircuitType.AndGate]: {
		title: "Hagalaz Junction — AND Gate",
		sagaText: "Day {day} — Two signals converge. The gate opens only when both paths meet.",
	},
	[CircuitType.Clock]: {
		title: "Naudiz-Isa Oscillator — Clock",
		sagaText: "Day {day} — Inversion and delay create rhythm. A heartbeat of runes.",
	},
	[CircuitType.ProductionChain]: {
		title: "Automated Forge — Production Chain",
		sagaText: "Day {day} — Power, growth, collection, transformation. The forge works alone.",
	},
};

// ─── Adjacency Graph ───

/** Manhattan distance between two inscriptions (3D). */
function manhattan(a: SurfaceInscription, b: SurfaceInscription): number {
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
}

/** Build connected components from inscriptions using signal range. */
function buildComponents(all: SurfaceInscription[]): SurfaceInscription[][] {
	const n = all.length;
	const parent = Array.from({ length: n }, (_, i) => i);

	function find(i: number): number {
		while (parent[i] !== i) {
			parent[i] = parent[parent[i]];
			i = parent[i];
		}
		return i;
	}

	function union(a: number, b: number): void {
		const ra = find(a);
		const rb = find(b);
		if (ra !== rb) parent[ra] = rb;
	}

	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			const dist = manhattan(all[i], all[j]);
			const range = Math.max(all[i].strength, all[j].strength);
			if (dist <= range) union(i, j);
		}
	}

	const groups = new Map<number, SurfaceInscription[]>();
	for (let i = 0; i < n; i++) {
		const root = find(i);
		let list = groups.get(root);
		if (!list) {
			list = [];
			groups.set(root, list);
		}
		list.push(all[i]);
	}
	return [...groups.values()];
}

// ─── Pattern Templates ───

function hasGlyph(component: SurfaceInscription[], glyph: number): boolean {
	return component.some((i) => i.glyph === glyph);
}

function glyphSet(component: SurfaceInscription[]): number[] {
	return [...new Set(component.map((i) => i.glyph))];
}

/** Check if Hagalaz has at least 2 distinct signal sources in range. */
function hagalazHasTwoInputs(component: SurfaceInscription[]): boolean {
	const hag = component.find((i) => i.glyph === RuneId.Hagalaz);
	if (!hag) return false;
	const sources = component.filter((i) => i !== hag && i.glyph !== RuneId.Hagalaz && manhattan(i, hag) <= i.strength);
	return sources.length >= 2;
}

// ─── Scanner ───

/**
 * Scan all inscriptions for known circuit patterns.
 * Returns one CircuitMatch per detected pattern.
 */
export function scanCircuits(index: InscriptionIndex): CircuitMatch[] {
	const all = [...index.all()];
	if (all.length === 0) return [];

	const components = buildComponents(all);
	const matches: CircuitMatch[] = [];

	for (const comp of components) {
		// NOT gate: any component containing Naudiz
		if (hasGlyph(comp, RuneId.Naudiz)) {
			matches.push({
				type: CircuitType.NotGate,
				runes: glyphSet(comp),
				...CIRCUIT_INFO[CircuitType.NotGate],
			});
		}

		// AND gate: Hagalaz with ≥2 signal sources
		if (hasGlyph(comp, RuneId.Hagalaz) && hagalazHasTwoInputs(comp)) {
			matches.push({
				type: CircuitType.AndGate,
				runes: glyphSet(comp),
				...CIRCUIT_INFO[CircuitType.AndGate],
			});
		}

		// Clock: Naudiz + Isa in same component (oscillator pair)
		if (hasGlyph(comp, RuneId.Naudiz) && hasGlyph(comp, RuneId.Isa)) {
			matches.push({
				type: CircuitType.Clock,
				runes: glyphSet(comp),
				...CIRCUIT_INFO[CircuitType.Clock],
			});
		}

		// Production chain: Kenaz + Berkanan + Fehu + Jera in one component
		if (
			hasGlyph(comp, RuneId.Kenaz) &&
			hasGlyph(comp, RuneId.Berkanan) &&
			hasGlyph(comp, RuneId.Fehu) &&
			hasGlyph(comp, RuneId.Jera)
		) {
			matches.push({
				type: CircuitType.ProductionChain,
				runes: glyphSet(comp),
				...CIRCUIT_INFO[CircuitType.ProductionChain],
			});
		}
	}

	return matches;
}
