// ─── Raido (Fast Travel) Data ───
// Pure data: travel cost, crystal dust item ID, scan constants, pairing radius.
// No ECS, no Three.js — just constants and type definitions.

import { RuneId } from "./rune-data.ts";

/** Crystal Dust item ID — consumed per fast travel. */
export const CRYSTAL_DUST_ID = 301;

/** Base crystal dust cost per travel. */
export const TRAVEL_BASE_COST = 1;

/** Additional crystal dust cost per 100 blocks of distance. */
export const TRAVEL_COST_PER_100_BLOCKS = 1;

/** Maximum travel cost cap (prevents unreasonable costs). */
export const TRAVEL_MAX_COST = 5;

/** Scan interval for Raido anchor detection (seconds). */
export const RAIDO_SCAN_INTERVAL = 2.0;

/** Maximum range (chunks) for Raido item teleportation pairing. */
export const RAIDO_PAIR_RANGE_CHUNKS = 6;

/** Item teleportation tick interval (seconds). */
export const RAIDO_TELEPORT_TICK = 0.5;

/** Maximum items teleported per tick per pair. */
export const RAIDO_ITEMS_PER_TICK = 1;

/** Raido glow color for particles (slate-blue-violet). */
export const RAIDO_GLOW = "#6A5ACD";

/** Raido glow as numeric color for particles. */
export const RAIDO_GLOW_NUM = 0x6a5acd;

/** Check if a rune ID is the Raido travel rune. */
export function isRaidoRune(runeId: number): boolean {
	return runeId === RuneId.Raido;
}
