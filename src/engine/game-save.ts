/**
 * Save/load helpers — read/write ECS state for persistence.
 * Extracted from game.ts to keep file sizes manageable.
 */

import type { World } from "koota";
import { getDiscoveredRuneIds, restoreDiscoveredRunes } from "../ecs/systems/rune-discovery-system.ts";
import type { RuneEntry } from "../ecs/systems/rune-index.ts";
import { getRuneIndex } from "../ecs/systems/rune-index.ts";
import type { HotbarSlot } from "../ecs/traits/index.ts";
import {
	Health,
	Hotbar,
	Hunger,
	InscriptionLevel,
	Inventory,
	PlayerTag,
	Position,
	QuestProgress,
	RuneFaces,
	Stamina,
	WorldTime,
} from "../ecs/traits/index.ts";
import type { PlayerSaveData } from "../persistence/db.ts";

/** Read current ECS state for persistence. */
export function readPlayerStateForSave(world: World): PlayerSaveData | null {
	let result: PlayerSaveData | null = null;

	world
		.query(PlayerTag, Position, Health, Hunger, Stamina, Inventory, Hotbar, QuestProgress, InscriptionLevel)
		.readEach(([pos, health, hunger, stamina, inv, hotbar, quest, inscription]) => {
			let timeOfDay = 0.25;
			let dayCount = 1;
			world.query(WorldTime).readEach(([time]) => {
				timeOfDay = time.timeOfDay;
				dayCount = time.dayCount;
			});

			result = {
				posX: pos.x,
				posY: pos.y,
				posZ: pos.z,
				health: health.current,
				hunger: hunger.current,
				stamina: stamina.current,
				questStep: quest.step,
				questProgress: quest.progress,
				timeOfDay,
				dayCount,
				hotbar: [...hotbar.slots],
				inventory: { items: { ...inv.items }, capacity: inv.capacity },
				inscriptionBlocksPlaced: inscription.totalBlocksPlaced,
				inscriptionBlocksMined: inscription.totalBlocksMined,
				inscriptionStructuresBuilt: inscription.structuresBuilt,
				discoveredRunes: getDiscoveredRuneIds(world),
			};
		});

	return result;
}

/** Restore player ECS state from save data. */
export function restorePlayerState(world: World, data: PlayerSaveData): void {
	world
		.query(PlayerTag, Position, Health, Hunger, Stamina, Inventory, Hotbar, QuestProgress, InscriptionLevel)
		.updateEach(([pos, health, hunger, stamina, inv, hotbar, quest, inscription]) => {
			pos.x = data.posX;
			pos.y = data.posY;
			pos.z = data.posZ;
			health.current = data.health;
			hunger.current = data.hunger;
			stamina.current = data.stamina;
			quest.step = data.questStep;
			quest.progress = data.questProgress;

			const savedHotbar = data.hotbar as (HotbarSlot | null)[];
			for (let i = 0; i < hotbar.slots.length; i++) {
				hotbar.slots[i] = savedHotbar[i] ?? null;
			}

			const savedInv = data.inventory;
			inv.items = { ...savedInv.items };
			inv.capacity = savedInv.capacity;

			inscription.totalBlocksPlaced = data.inscriptionBlocksPlaced;
			inscription.totalBlocksMined = data.inscriptionBlocksMined;
			inscription.structuresBuilt = data.inscriptionStructuresBuilt;
		});

	world.query(WorldTime).updateEach(([time]) => {
		time.timeOfDay = data.timeOfDay;
		time.dayCount = data.dayCount;
	});

	if (data.discoveredRunes && data.discoveredRunes.length > 0) {
		restoreDiscoveredRunes(world, data.discoveredRunes);
	}
}

/** Get all rune entries from the spatial index for persistence. */
export function getRuneIndexEntries(): Array<{ x: number; y: number; z: number; face: number; runeId: number }> {
	return getRuneIndex().getAllEntries();
}

/** Restore rune entries into the spatial index (and ECS RuneFaces trait). */
export function applyRuneEntries(
	world: World,
	entries: Array<{ x: number; y: number; z: number; face: number; runeId: number }>,
): void {
	const idx = getRuneIndex();
	idx.loadEntries(entries as RuneEntry[]);

	world.query(PlayerTag, RuneFaces).updateEach(([runeFaces]) => {
		for (const e of entries) {
			const key = `${e.x},${e.y},${e.z}`;
			if (!runeFaces.faces[key]) {
				runeFaces.faces[key] = new Array(6).fill(0);
			}
			runeFaces.faces[key][e.face] = e.runeId;
		}
	});
}
