// ─── Computational Rune Data ───
// Pure data: constants for Naudiz (NOT), Isa (DELAY), and Hagalaz (AND) gates.
// No ECS, no Three.js — just lookup tables and constants.

import { RuneId } from "./rune-data.ts";

/** Check if a rune is a computational rune (Naudiz, Isa, or Hagalaz). */
export function isComputationalRune(runeId: number): boolean {
	return runeId === RuneId.Naudiz || runeId === RuneId.Isa || runeId === RuneId.Hagalaz;
}

/** All computational rune IDs. */
export const COMPUTATIONAL_RUNE_IDS: ReadonlyArray<number> = [RuneId.Naudiz, RuneId.Isa, RuneId.Hagalaz];

// ─── Naudiz (Need / NOT gate) ───

/** Signal strength Naudiz emits when it receives no input. */
export const NAUDIZ_OUTPUT_STRENGTH = 5;

/** Particle color for Naudiz activation (dark red). */
export const NAUDIZ_ACTIVE_COLOR = 0x8b0000;

// ─── Isa (Ice / DELAY gate) ───

/** Default delay in ticks for Isa (1 tick = 250ms). */
export const ISA_DEFAULT_DELAY = 1;

/** Delay in ticks when Isa is inscribed on a Crystal block. */
export const ISA_CRYSTAL_DELAY = 2;

/** Particle color for Isa pass-through (ice blue). */
export const ISA_ACTIVE_COLOR = 0xadd8e6;

// ─── Hagalaz (Hail / AND gate) ───

/** Minimum signal strength on perpendicular face to open the gate. */
export const HAGALAZ_MIN_GATE_SIGNAL = 1;

/** Particle color for Hagalaz gate open (slate). */
export const HAGALAZ_ACTIVE_COLOR = 0x708090;
