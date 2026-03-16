/**
 * Codex system — ECS bridge for the observation/knowledge mechanic.
 * Per-frame: checks if player is observing any creatures, ticks progress.
 * Consumed by game.ts.
 */

import type { World } from "koota";
import { Codex, CreatureTag, CreatureType, PlayerTag, Position, Rotation } from "../traits/index.ts";
import { isCreatureInView, tickObservation } from "./observation.ts";

/**
 * Update codex observation progress for all creatures in view.
 * Runs per-frame. Cheap: only dot product + range check per creature.
 */
export function codexSystem(world: World, dt: number): void {
	// Read player state
	let px = 0;
	let pz = 0;
	let pYaw = 0;
	let hasPlayer = false;
	world.query(PlayerTag, Position, Rotation).readEach(([pos, rot]) => {
		px = pos.x;
		pz = pos.z;
		pYaw = rot.yaw;
		hasPlayer = true;
	});
	if (!hasPlayer) return;

	// Collect visible species this frame
	const viewedSpecies = new Set<string>();
	world.query(CreatureTag, CreatureType, Position).readEach(([ct, cPos]) => {
		if (isCreatureInView(px, pz, pYaw, cPos.x, cPos.z)) {
			viewedSpecies.add(ct.species);
		}
	});

	if (viewedSpecies.size === 0) return;

	// Update codex progress for viewed species
	world.query(PlayerTag, Codex).updateEach(([codex]) => {
		for (const species of viewedSpecies) {
			const current = codex.creatureProgress[species] ?? 0;
			if (current >= 1) continue;
			codex.creatureProgress[species] = tickObservation(current, dt, true);
		}
	});
}

/**
 * Add a lore entry to the player's codex.
 * Called when player interacts with runstenar/fornlamningar.
 */
export function collectLoreEntry(world: World, loreId: string): void {
	world.query(PlayerTag, Codex).updateEach(([codex]) => {
		codex.loreEntries.add(loreId);
	});
}

/**
 * Add a discovered recipe to the codex.
 * Called when player first crafts an item or finds a recipe scroll.
 */
export function discoverRecipe(world: World, recipeIdx: number): void {
	world.query(PlayerTag, Codex).updateEach(([codex]) => {
		codex.discoveredRecipes.add(recipeIdx);
	});
}
