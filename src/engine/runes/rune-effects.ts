// ─── Rune Effects ───
// Per-rune behavior when signal reaches an inscription.
// Pure state machine: input state + signal → output state + signal.
// No ECS, no Three.js — just logic.

import type { RuneIdValue } from "../../ecs/systems/rune-data.ts";
import { RuneId } from "../../ecs/systems/rune-data.ts";
import type { MaterialIdValue } from "./material.ts";
import { MaterialId } from "./material.ts";

// ─── Inscription State ───

/** Per-inscription mutable state tracked across ticks. */
export interface InscriptionState {
	/** Whether signal is currently reaching this inscription. */
	powered: boolean;
	/** Number of distinct signal directions reaching this inscription. */
	inputCount: number;
	/** Delay counter for Isa rune (ticks remaining). */
	delayCounter: number;
	/** Whether this inscription is emitting signal. */
	emitting: boolean;
	/** Current output strength (0 = silent). */
	outputStrength: number;
}

/** Create a fresh inscription state. */
export function createInscriptionState(): InscriptionState {
	return {
		powered: false,
		inputCount: 0,
		delayCounter: 0,
		emitting: false,
		outputStrength: 0,
	};
}

// ─── Delay Ticks by Material ───

/** How many ticks Isa delays signal, by material. */
function getIsaDelay(mat: MaterialIdValue): number {
	if (mat === MaterialId.Crystal) return 2;
	return 1; // stone, iron, copper, etc.
}

// ─── Emitter Runes ───

/** Runes that always emit signal (emitters). */
const EMITTERS = new Set<RuneIdValue>([RuneId.Kenaz, RuneId.Sowilo, RuneId.Ansuz]);

/** Check if a rune is a constant emitter. */
export function isEmitter(glyph: RuneIdValue): boolean {
	return EMITTERS.has(glyph);
}

// ─── Process Single Inscription ───

/**
 * Process one inscription for a tick.
 * Takes current state + whether signal reached it, returns new state.
 *
 * @param glyph - Which rune is inscribed.
 * @param material - Material the inscription is on.
 * @param state - Current state of this inscription.
 * @param signalStrength - Incoming signal strength (0 = unpowered).
 * @param inputDirections - Number of distinct directions signal arrives from.
 * @param baseStrength - The inscription's base output strength.
 * @returns Updated inscription state (mutates in place for perf).
 */
export function processInscription(
	glyph: RuneIdValue,
	material: MaterialIdValue,
	state: InscriptionState,
	signalStrength: number,
	inputDirections: number,
	baseStrength: number,
): InscriptionState {
	state.powered = signalStrength > 0;
	state.inputCount = inputDirections;

	// ─── Constant emitters: always emit ───
	if (isEmitter(glyph)) {
		state.emitting = true;
		state.outputStrength = baseStrength;
		return state;
	}

	switch (glyph) {
		// ─── NOT gate: emit when unpowered ───
		case RuneId.Naudiz:
			state.emitting = !state.powered;
			state.outputStrength = state.emitting ? baseStrength : 0;
			break;

		// ─── AND gate: emit only when 2+ input directions ───
		case RuneId.Hagalaz:
			state.emitting = inputDirections >= 2;
			state.outputStrength = state.emitting ? baseStrength : 0;
			break;

		// ─── DELAY: hold signal for N ticks, then release ───
		case RuneId.Isa: {
			const delay = getIsaDelay(material);
			if (state.powered && state.delayCounter === 0) {
				// Signal just arrived: start delay
				state.delayCounter = delay;
				state.emitting = false;
				state.outputStrength = 0;
			} else if (state.delayCounter > 0) {
				state.delayCounter--;
				if (state.delayCounter === 0) {
					// Delay expired: release
					state.emitting = true;
					state.outputStrength = baseStrength;
				} else {
					state.emitting = false;
					state.outputStrength = 0;
				}
			} else {
				// Not powered, no delay pending
				state.emitting = false;
				state.outputStrength = 0;
			}
			break;
		}

		// ─── Actuator runes: emit when powered (pass-through) ───
		default:
			state.emitting = state.powered;
			state.outputStrength = state.powered ? signalStrength : 0;
			break;
	}

	return state;
}
