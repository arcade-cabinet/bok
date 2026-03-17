// ─── Interaction Rune Data ───
// Pure data: configuration for Jera, Fehu, Ansuz, and Thurisaz interaction runes.
// No ECS, no Three.js — just lookup tables and constants.

import { RuneId } from "./rune-data.ts";

/** Check if a rune is an interaction rune (Jera, Fehu, Ansuz, or Thurisaz). */
export function isInteractionRune(runeId: number): boolean {
	return runeId === RuneId.Jera || runeId === RuneId.Fehu || runeId === RuneId.Ansuz || runeId === RuneId.Thurisaz;
}

/** All interaction rune IDs. */
export const INTERACTION_RUNE_IDS: ReadonlyArray<number> = [RuneId.Jera, RuneId.Fehu, RuneId.Ansuz, RuneId.Thurisaz];

/** Check if a rune is a protection rune (Algiz, Mannaz, or Berkanan). */
export function isProtectionRune(runeId: number): boolean {
	return runeId === RuneId.Algiz || runeId === RuneId.Mannaz || runeId === RuneId.Berkanan;
}

/** All protection rune IDs. */
export const PROTECTION_RUNE_IDS: ReadonlyArray<number> = [RuneId.Algiz, RuneId.Mannaz, RuneId.Berkanan];

// ─── Jera (Harvest / Transform) ───

/** Tick interval for interaction rune processing (matches signal tick). */
export const INTERACTION_TICK_INTERVAL = 0.25;

// ─── Fehu (Wealth / Pull) ───

/** Radius in blocks for Fehu item attraction. */
export const FEHU_PULL_RADIUS = 6;

/** Pull force applied to items (blocks/second toward the rune). */
export const FEHU_PULL_SPEED = 3.0;

/** Minimum signal strength for Fehu to activate. 0 = always active when inscribed. */
export const FEHU_MIN_SIGNAL = 0;

// ─── Ansuz (Wisdom / Sense) ───

/** Detection radius in blocks for Ansuz creature sensing. */
export const ANSUZ_DETECT_RADIUS = 12;

/** Signal strength emitted when creature is detected. */
export const ANSUZ_EMIT_STRENGTH = 8;

/** Minimum number of frames between Ansuz detection emissions. */
export const ANSUZ_COOLDOWN = 1.0;

// ─── Thurisaz (Thorn / Damage) ───

/** Damage radius in blocks from the inscribed face. */
export const THURISAZ_DAMAGE_RADIUS = 3;

/** Minimum signal strength required to activate Thurisaz damage. */
export const THURISAZ_MIN_SIGNAL = 3;

/** Base damage per signal strength point. */
export const THURISAZ_DAMAGE_PER_STRENGTH = 2;

/** Maximum damage Thurisaz can deal per tick. */
export const THURISAZ_MAX_DAMAGE = 20;

// ─── Algiz (Protection / Ward) ───

/** Base ward radius when no signal is present (blocks). */
export const ALGIZ_BASE_RADIUS = 3;

/** Additional radius per point of signal strength. */
export const ALGIZ_RADIUS_PER_STRENGTH = 0.6;

/** Maximum ward radius (blocks). */
export const ALGIZ_MAX_RADIUS = 12;

/** Particle color for ward boundary. */
export const ALGIZ_WARD_COLOR = 0x9370db;

// ─── Mannaz (Humanity / Calm) ───

/** Base calm radius when no signal is present (blocks). */
export const MANNAZ_BASE_RADIUS = 4;

/** Additional radius per point of signal strength. */
export const MANNAZ_RADIUS_PER_STRENGTH = 0.5;

/** Maximum calm radius (blocks). */
export const MANNAZ_MAX_RADIUS = 12;

/** Particle color for calm zone. */
export const MANNAZ_CALM_COLOR = 0xe0c068;

// ─── Berkanan (Birch / Growth) ───

/** Base growth radius when no signal is present (blocks). */
export const BERKANAN_BASE_RADIUS = 3;

/** Additional radius per point of signal strength. */
export const BERKANAN_RADIUS_PER_STRENGTH = 0.4;

/** Maximum growth radius (blocks). */
export const BERKANAN_MAX_RADIUS = 9;

/** Base growth speed multiplier (1.0 = normal speed). */
export const BERKANAN_BASE_MULTIPLIER = 1.5;

/** Additional multiplier per point of signal strength. */
export const BERKANAN_MULTIPLIER_PER_STRENGTH = 0.2;

/** Maximum growth speed multiplier. */
export const BERKANAN_MAX_MULTIPLIER = 4.0;

/** Particle color for growth zone. */
export const BERKANAN_GROW_COLOR = 0x228b22;
