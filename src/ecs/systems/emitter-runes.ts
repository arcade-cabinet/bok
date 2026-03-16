// ─── Emitter Rune Data ───
// Pure data: maps rune IDs to signal emission configs (type, strength, glow color).
// No ECS, no Three.js — just lookup tables and constants.

import { RuneId, type RuneIdValue } from "./rune-data.ts";
import { SignalType, type SignalTypeId } from "./signal-data.ts";

/** Configuration for a rune that emits a signal. */
export interface EmitterRuneConfig {
	/** Signal type this rune emits. */
	signalType: SignalTypeId;
	/** Initial signal strength (1–15). */
	strength: number;
	/** Hex color for the face glow effect. */
	glowColor: string;
	/** Whether this emitter runs continuously (every tick). */
	continuous: boolean;
}

/** Default emitter strength for Kenaz and Sowilo. */
export const EMITTER_STRENGTH = 10;

/** Kenaz glow color (ember). */
export const KENAZ_GLOW = "#a3452a";

/** Sowilo glow color (gold). */
export const SOWILO_GLOW = "#c9a84c";

/** Emitter rune configurations indexed by RuneId. */
const EMITTER_CONFIGS: ReadonlyMap<number, EmitterRuneConfig> = new Map([
	[
		RuneId.Kenaz,
		{
			signalType: SignalType.Heat,
			strength: EMITTER_STRENGTH,
			glowColor: KENAZ_GLOW,
			continuous: true,
		},
	],
	[
		RuneId.Sowilo,
		{
			signalType: SignalType.Light,
			strength: EMITTER_STRENGTH,
			glowColor: SOWILO_GLOW,
			continuous: true,
		},
	],
]);

/** Check if a rune ID is an emitter rune. */
export function isEmitterRune(runeId: number): boolean {
	return EMITTER_CONFIGS.has(runeId);
}

/** Get the emitter config for a rune, or undefined if not an emitter. */
export function getEmitterConfig(runeId: number): EmitterRuneConfig | undefined {
	return EMITTER_CONFIGS.get(runeId);
}

/** All emitter rune IDs. */
export const EMITTER_RUNE_IDS: ReadonlyArray<RuneIdValue> = [RuneId.Kenaz, RuneId.Sowilo];

/** Parse a hex color string to a numeric color value (for particles). */
export function hexToNumber(hex: string): number {
	return Number.parseInt(hex.slice(1), 16);
}
