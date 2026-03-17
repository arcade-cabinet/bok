// ─── Settlement Bonus System ───
// Applies gameplay bonuses to the player based on detected settlement archetypes.
// Smedja (Workshop) = combat, Kvarn (Farm) = food, Vakttorn (Beacon) = detection,
// Försvarsverk (Ward) = defense. No Three.js — pure ECS read/write.

import type { World } from "koota";
import { PlayerTag, Position, SettlementBonusState } from "../traits/index.ts";
import { ArchetypeId, CHUNK_SIZE } from "./archetype-data.ts";
import type { Settlement } from "./settlement-detect.ts";

// ─── Tuning Constants ───

/** Combat multiplier bonus when Workshop (Smedja) is present. */
export const SMEDJA_BONUS = 0.15;

/** Hunger decay multiplier when Farm (Kvarn) is present. Lower = slower. */
export const FOOD_BONUS = 0.7;

/** Detection radius bonus (blocks) when Beacon (Vakttorn) is present. */
export const VAKTTORN_BONUS = 5;

/** Defense bonus per settlement level. */
export const DEFENSE_PER_LEVEL = 0.05;

/** Extra defense when Ward archetype (Försvarsverk) is present. */
export const WARD_BONUS = 0.05;

/** Base detection radius bonus per settlement level (blocks). */
export const DETECTION_PER_LEVEL = 2;

/** Reset module state (called in destroyGame). */
export function resetSettlementBonusState(): void {
	// No module-level state to reset currently.
	// Kept for API consistency with other systems.
}

// ─── Helpers ───

/** Find the settlement containing the player's chunk, if any. */
function findPlayerSettlement(
	playerCx: number,
	playerCz: number,
	settlements: ReadonlyArray<Settlement>,
): Settlement | null {
	for (const s of settlements) {
		if (s.cx === playerCx && s.cz === playerCz) return s;
	}
	return null;
}

// ─── Main Function ───

/**
 * Apply settlement bonuses to the player based on their current chunk.
 * Called by the settlement system after detection. Reads settlements,
 * finds player overlap, writes bonuses to SettlementBonusState trait.
 */
export function applySettlementBonuses(world: World, settlements: ReadonlyArray<Settlement>): void {
	world.query(PlayerTag, Position, SettlementBonusState).updateEach(([pos, bonus]) => {
		const cx = Math.floor(pos.x / CHUNK_SIZE);
		const cz = Math.floor(pos.z / CHUNK_SIZE);

		const settlement = findPlayerSettlement(cx, cz, settlements);

		if (!settlement) {
			// Reset to defaults
			bonus.combatMult = 1;
			bonus.foodMult = 1;
			bonus.detectionBonus = 0;
			bonus.defenseMult = 1;
			return;
		}

		const level = settlement.level;
		const archs = settlement.archetypes;

		// ─── Smedja (Workshop) → Combat ───
		bonus.combatMult = archs.has(ArchetypeId.Workshop) ? 1 + SMEDJA_BONUS : 1;

		// ─── Kvarn (Farm) → Food (hunger reduction) ───
		bonus.foodMult = archs.has(ArchetypeId.Farm) ? FOOD_BONUS : 1;

		// ─── Vakttorn (Beacon) → Detection radius ───
		bonus.detectionBonus = DETECTION_PER_LEVEL * level + (archs.has(ArchetypeId.Beacon) ? VAKTTORN_BONUS : 0);

		// ─── Försvarsverk (Ward) → Defense (damage reduction) ───
		bonus.defenseMult = 1 - DEFENSE_PER_LEVEL * level - (archs.has(ArchetypeId.Ward) ? WARD_BONUS : 0);
	});
}
