// ─── Raido Travel Math ───
// Pure math: anchor registration from RuneIndex, travel cost, paired linking.
// No ECS, no Three.js — just functions operating on data.

import { BlockId } from "../../world/blocks.ts";
import { CRYSTAL_DUST_ID, TRAVEL_BASE_COST, TRAVEL_COST_PER_100_BLOCKS, TRAVEL_MAX_COST } from "./raido-data.ts";
import { RuneId } from "./rune-data.ts";
import type { RuneIndex } from "./rune-index.ts";

/** A fast-travel anchor derived from a Raido rune on a RuneStone block. */
export interface TravelAnchor {
	/** World-space block position. */
	x: number;
	y: number;
	z: number;
	/** Chunk coordinates. */
	cx: number;
	cz: number;
}

/**
 * Scan the RuneIndex for all Raido runes on RuneStone blocks.
 * Returns unique anchors (one per block position, even if multiple faces inscribed).
 */
export function findRaidoAnchors(
	runeIndex: RuneIndex,
	getBlock: (x: number, y: number, z: number) => number,
): TravelAnchor[] {
	const anchors: TravelAnchor[] = [];
	const seen = new Set<string>();

	for (const entry of runeIndex.getAllEntries()) {
		if (entry.runeId !== RuneId.Raido) continue;
		const key = `${entry.x},${entry.y},${entry.z}`;
		if (seen.has(key)) continue;
		seen.add(key);

		const blockId = getBlock(entry.x, entry.y, entry.z);
		if (blockId !== BlockId.RuneStone) continue;

		anchors.push({
			x: entry.x,
			y: entry.y,
			z: entry.z,
			cx: Math.floor(entry.x / 16),
			cz: Math.floor(entry.z / 16),
		});
	}

	return anchors;
}

/**
 * Compute travel cost in crystal dust based on distance.
 * base + floor(distance / 100), capped at max.
 */
export function computeTravelCost(fromX: number, fromZ: number, toX: number, toZ: number): number {
	const dx = toX - fromX;
	const dz = toZ - fromZ;
	const dist = Math.sqrt(dx * dx + dz * dz);
	const distCost = Math.floor(dist / 100) * TRAVEL_COST_PER_100_BLOCKS;
	return Math.min(TRAVEL_BASE_COST + distCost, TRAVEL_MAX_COST);
}

/** Check if player inventory has enough crystal dust. */
export function canAffordTravel(inventoryItems: Record<number, number>, cost: number): boolean {
	return (inventoryItems[CRYSTAL_DUST_ID] ?? 0) >= cost;
}

/**
 * Find paired Raido anchors — anchors within pairing chunk range of each other.
 * Returns pairs as [anchorA, anchorB] tuples. Each anchor appears in at most one pair.
 */
export function findPairedAnchors(
	anchors: readonly TravelAnchor[],
	maxChunkRange: number,
): Array<[TravelAnchor, TravelAnchor]> {
	const pairs: Array<[TravelAnchor, TravelAnchor]> = [];
	const used = new Set<number>();

	for (let i = 0; i < anchors.length; i++) {
		if (used.has(i)) continue;
		for (let j = i + 1; j < anchors.length; j++) {
			if (used.has(j)) continue;
			const a = anchors[i];
			const b = anchors[j];
			const dcx = Math.abs(a.cx - b.cx);
			const dcz = Math.abs(a.cz - b.cz);
			if (dcx <= maxChunkRange && dcz <= maxChunkRange) {
				pairs.push([a, b]);
				used.add(i);
				used.add(j);
				break;
			}
		}
	}

	return pairs;
}

/**
 * Get the partner anchor for item teleportation.
 * Returns the other end of a paired anchor, or null if unpaired.
 */
export function getPairPartner(
	anchor: TravelAnchor,
	pairs: ReadonlyArray<readonly [TravelAnchor, TravelAnchor]>,
): TravelAnchor | null {
	for (const [a, b] of pairs) {
		if (a.x === anchor.x && a.y === anchor.y && a.z === anchor.z) return b;
		if (b.x === anchor.x && b.y === anchor.y && b.z === anchor.z) return a;
	}
	return null;
}
