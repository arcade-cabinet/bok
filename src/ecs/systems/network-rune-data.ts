// ─── Network Rune Data ───
// Pure data: configuration for Uruz (push) and Tiwaz (combat buff) network runes.
// No ECS, no Three.js — just lookup tables and constants.

import { RuneId } from "./rune-data.ts";

/** Check if a rune is a network rune (Uruz or Tiwaz). */
export function isNetworkRune(runeId: number): boolean {
	return runeId === RuneId.Uruz || runeId === RuneId.Tiwaz;
}

/** All network rune IDs. */
export const NETWORK_RUNE_IDS: ReadonlyArray<number> = [RuneId.Uruz, RuneId.Tiwaz];

// ─── Uruz (Strength / Push) ───

/** Push force (blocks/second) per point of signal strength. */
export const URUZ_FORCE_PER_STRENGTH = 0.5;

/** Maximum push force (blocks/second). */
export const URUZ_MAX_FORCE = 6;

/** Minimum signal strength for Uruz push to activate. */
export const URUZ_MIN_SIGNAL = 2;

/** Push effect radius in blocks from the inscribed face. */
export const URUZ_PUSH_RADIUS = 5;

/** Particle color for Uruz push (dark gold). */
export const URUZ_PUSH_COLOR = 0x8b6914;

// ─── Tiwaz (Victory / Combat Buff) ───

/** Base buff radius when no signal is present (blocks). */
export const TIWAZ_BASE_RADIUS = 3;

/** Additional radius per point of signal strength. */
export const TIWAZ_RADIUS_PER_STRENGTH = 0.5;

/** Maximum buff radius (blocks). */
export const TIWAZ_MAX_RADIUS = 12;

/** Base damage multiplier (1.0 = no bonus). */
export const TIWAZ_BASE_MULTIPLIER = 1.25;

/** Additional multiplier per point of signal strength. */
export const TIWAZ_MULTIPLIER_PER_STRENGTH = 0.1;

/** Maximum damage multiplier. */
export const TIWAZ_MAX_MULTIPLIER = 3.0;

/** Particle color for Tiwaz buff (crimson). */
export const TIWAZ_BUFF_COLOR = 0xc41e3a;
