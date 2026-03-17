// ─── Rune World Tick System ───
// Thin ECS wrapper around the proven tickWorld() simulation.
// Bridges isolated rune simulation → game engine.
// Reads RuneFaces from ECS, maintains TickState, runs simulation.

import type { InscriptionIndex } from "../../engine/runes/inscription.ts";
import type { GetMaterial, SignalField } from "../../engine/runes/wavefront.ts";
import type { WorldState } from "../../engine/runes/world-state.ts";
import { type BerkananConfig, type TickState, tickWorld } from "../../engine/runes/world-tick.ts";

/** Persisted signal field for inter-tick state. */
let lastField: SignalField = new Map();

/**
 * Run one tick of the rune world simulation.
 * Called from GameBridge.update() each frame.
 *
 * @param insIndex - Inscription index built from RuneFaces trait.
 * @param getMaterial - Material lookup for wavefront propagation.
 * @param worldState - Resource storage (in/out).
 * @param tickState - Persistent simulation state (in/out).
 * @param berkananConfig - Berkanan resource type configuration.
 */
export function runeWorldTickSystem(
	insIndex: InscriptionIndex,
	getMaterial: GetMaterial,
	worldState: WorldState,
	tickState: TickState,
	berkananConfig: BerkananConfig,
): void {
	const result = tickWorld(insIndex, getMaterial, lastField, worldState, tickState, berkananConfig);
	lastField = result.field;
}

/** Get the current signal field (for renderers). */
export function getLastSignalField(): SignalField {
	return lastField;
}

/** Reset module state (for tests / game restart). */
export function resetRuneWorldTickState(): void {
	lastField = new Map();
}
