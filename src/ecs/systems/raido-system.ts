// ─── Raido System ───
// ECS system: throttled anchor scanning, module-level anchor cache,
// item teleportation between paired Raido blocks.
// Takes injected side effects — no Three.js imports.

import type { World } from "koota";
import { removeItem } from "../inventory.ts";
import { Inventory, PlayerTag, Position } from "../traits/index.ts";
import { CRYSTAL_DUST_ID, RAIDO_GLOW_NUM, RAIDO_PAIR_RANGE_CHUNKS, RAIDO_SCAN_INTERVAL } from "./raido-data.ts";
import { findPairedAnchors, findRaidoAnchors, type TravelAnchor } from "./raido-travel.ts";
import { getRuneIndex } from "./rune-index.ts";

// ─── Side Effects ───

export interface RaidoEffects {
	spawnParticles: (x: number, y: number, z: number, color: number, count: number) => void;
}

// ─── Module-level State ───

let cachedAnchors: TravelAnchor[] = [];
let cachedPairs: Array<[TravelAnchor, TravelAnchor]> = [];
let scanTimer = 0;

/** Get all active fast-travel anchors (read-only). */
export function getActiveAnchors(): readonly TravelAnchor[] {
	return cachedAnchors;
}

/** Get all paired anchors for item teleportation (read-only). */
export function getActivePairs(): ReadonlyArray<readonly [TravelAnchor, TravelAnchor]> {
	return cachedPairs;
}

/** Reset module-level state (call in destroyGame). */
export function resetRaidoState(): void {
	cachedAnchors = [];
	cachedPairs = [];
	scanTimer = 0;
}

// ─── ECS System ───

/**
 * Raido system — scans RuneIndex for Raido anchors at throttled interval.
 * Updates module-level cache for map display and item teleportation.
 */
export function raidoSystem(
	_world: World,
	dt: number,
	getBlock: (x: number, y: number, z: number) => number,
	effects: RaidoEffects,
): void {
	scanTimer += dt;
	if (scanTimer < RAIDO_SCAN_INTERVAL) return;
	scanTimer -= RAIDO_SCAN_INTERVAL;

	const runeIndex = getRuneIndex();
	cachedAnchors = findRaidoAnchors(runeIndex, getBlock);
	cachedPairs = findPairedAnchors(cachedAnchors, RAIDO_PAIR_RANGE_CHUNKS);

	// Spawn subtle particles at each anchor for visual feedback
	for (const anchor of cachedAnchors) {
		effects.spawnParticles(anchor.x + 0.5, anchor.y + 1.5, anchor.z + 0.5, RAIDO_GLOW_NUM, 1);
	}
}

/**
 * Execute fast travel: teleport player to target anchor and deduct cost.
 * Returns true if travel succeeded, false if insufficient resources.
 */
export function executeFastTravel(world: World, target: TravelAnchor, cost: number): boolean {
	let success = false;

	world.query(PlayerTag, Position, Inventory).updateEach(([pos, inv]) => {
		const dustCount = inv.items[CRYSTAL_DUST_ID] ?? 0;
		if (dustCount < cost) return;

		removeItem(inv, CRYSTAL_DUST_ID, cost);

		// Teleport to 1 block above anchor (so player doesn't clip into the block)
		pos.x = target.x + 0.5;
		pos.y = target.y + 2;
		pos.z = target.z + 0.5;
		success = true;
	});

	return success;
}
