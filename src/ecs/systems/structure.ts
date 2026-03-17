/**
 * Structure system — detects enclosed spaces and Falu red proximity.
 * Updates ShelterState trait on the player entity.
 *
 * Follows the same throttled-scan pattern as workstation-proximity.ts.
 * Injected getVoxel/isSolid callbacks avoid Three.js import (side-effect pattern).
 */

import type { World } from "koota";
import { InscriptionLevel, PlayerTag, Position, ShelterState } from "../traits/index.ts";
import {
	countFaluRedNearby,
	detectEnclosure,
	faluSpawnRadiusMultiplier,
	MIN_INSCRIPTION_VOLUME,
} from "./structure-detect.ts";

/** Shelter bonus: hunger decay multiplier (50% reduction). */
export const SHELTER_HUNGER_MULT = 0.5;

/** Shelter bonus: stamina regen multiplier (50% boost). */
export const SHELTER_STAMINA_MULT = 1.5;

/** How often to re-scan for structures (seconds). */
const SCAN_INTERVAL = 1.0;

let scanTimer = 0;

/** Tracks positions where structures have already been counted (avoids double-counting). */
const countedPositions = new Set<number>();

/** Pack position into a key for the counted set (4-block grid). */
function posKey(x: number, y: number, z: number): number {
	const gx = Math.floor(x / 4);
	const gy = Math.floor(y / 4);
	const gz = Math.floor(z / 4);
	return (gx + 256) * 262144 + (gy + 256) * 512 + (gz + 256);
}

/**
 * ECS system: periodically detects enclosed structures around the player.
 * @param getVoxel — injected voxel accessor (avoids Three.js import)
 * @param isSolid — injected block solidity check
 */
export function structureSystem(
	world: World,
	dt: number,
	getVoxel: (x: number, y: number, z: number) => number,
	isSolid: (blockId: number) => boolean,
): void {
	scanTimer += dt;
	if (scanTimer < SCAN_INTERVAL) return;
	scanTimer -= SCAN_INTERVAL;

	world.query(PlayerTag, Position, ShelterState, InscriptionLevel).updateEach(([pos, shelter, inscription]) => {
		// 1. Flood-fill enclosure check
		const result = detectEnclosure(pos.x, pos.y, pos.z, getVoxel, isSolid);
		const wasInShelter = shelter.inShelter;

		shelter.inShelter = result.enclosed;
		shelter.structureVolume = result.enclosed ? result.volume : 0;

		// 2. Falu red: use wall count from enclosure + nearby scan
		const nearbyFalu = countFaluRedNearby(pos.x, pos.y, pos.z, getVoxel);
		shelter.faluRedCount = Math.max(result.faluRedCount, nearbyFalu);
		shelter.morkerSpawnMult = faluSpawnRadiusMultiplier(shelter.faluRedCount);

		// 3. Increment inscription level on new structure detection
		if (result.enclosed && !wasInShelter && result.volume >= MIN_INSCRIPTION_VOLUME) {
			const key = posKey(pos.x, pos.y, pos.z);
			if (!countedPositions.has(key)) {
				countedPositions.add(key);
				inscription.structuresBuilt++;
			}
		}
	});
}

/** Reset scan timer and counted positions (for testing or game restart). */
export function resetStructureState(): void {
	scanTimer = 0;
	countedPositions.clear();
}
