// ─── Rune Resource Pickup System ───
// ECS system: scans WorldState cells near the player and transfers
// resources into the player's inventory.
// Runs after rune-world-tick so freshly produced resources are available.
// No Three.js — uses side-effect callback for particles.

import type { World } from "koota";
import type { WorldState } from "../../engine/runes/world-state.ts";
import { addItem } from "../inventory.ts";
import { Inventory, PlayerTag, Position } from "../traits/index.ts";
import { PICKUP_PARTICLE_COLOR, PICKUP_PARTICLE_COUNT, resourceToItemId } from "./rune-resource-data.ts";

/** Radius in blocks around the player to scan for resources. */
export const PICKUP_RADIUS = 3;

export interface RuneResourcePickupEffects {
	spawnParticles: (x: number, y: number, z: number, color: number, count: number) => void;
}

/**
 * Scan WorldState cells near the player, transfer resources to inventory.
 * Removes collected resources from WorldState and spawns pickup particles.
 */
export function runeResourcePickupSystem(
	world: World,
	worldState: WorldState,
	effects: RuneResourcePickupEffects,
): void {
	if (worldState.size === 0) return;

	let px = 0;
	let py = 0;
	let pz = 0;
	let hasPlayer = false;

	world.query(PlayerTag, Position).readEach(([pos]) => {
		px = pos.x;
		py = pos.y;
		pz = pos.z;
		hasPlayer = true;
	});

	if (!hasPlayer) return;

	const rSq = PICKUP_RADIUS * PICKUP_RADIUS;
	const toRemove: Array<[number, number, number, number]> = [];

	for (const [cx, cy, cz, cell] of worldState.entries()) {
		const dx = cx + 0.5 - px;
		const dy = cy + 0.5 - py;
		const dz = cz + 0.5 - pz;
		if (dx * dx + dy * dy + dz * dz > rSq) continue;

		// Try to add to inventory
		const itemId = resourceToItemId(cell.type);
		let added = 0;

		world.query(PlayerTag, Inventory).updateEach(([inv]) => {
			added = addItem(inv, itemId, cell.qty);
		});

		if (added <= 0) continue;

		toRemove.push([cx, cy, cz, added]);
		effects.spawnParticles(cx, cy, cz, PICKUP_PARTICLE_COLOR, PICKUP_PARTICLE_COUNT);
	}

	// Remove collected resources from WorldState
	for (const [x, y, z, qty] of toRemove) {
		worldState.remove(x, y, z, qty);
	}
}

/** Reset module state (for tests / game restart). */
export function resetRuneResourcePickupState(): void {
	// No module-level state currently, but follows the pattern
	// for consistency with other systems.
}
