/**
 * Micro-goals — ensures there's always something discoverable nearby.
 * Pure math, no ECS/Three.js/React.
 *
 * Checks what's available around the player and returns the most
 * relevant short-term goal. Designed so 1-2 minutes of play feels complete.
 */

import { packChunk } from "./map-data.ts";
import { MICRO_GOAL_SCAN_RADIUS } from "./session-data.ts";

export type MicroGoalType =
	| "explore_chunk"
	| "observe_creature"
	| "discover_rune"
	| "find_landmark"
	| "build_shelter"
	| "craft_tool";

export interface MicroGoal {
	type: MicroGoalType;
	/** Short hint text for the player. */
	hint: string;
}

/** Goal hints keyed by type — thematic, concise. */
const GOAL_HINTS: Record<MicroGoalType, string> = {
	explore_chunk: "Uncharted land lies just beyond — explore a new area.",
	observe_creature: "A creature stirs nearby — watch it to learn its ways.",
	discover_rune: "Ancient power awaits discovery — seek new runes.",
	find_landmark: "Stone markers dot the horizon — find a landmark.",
	build_shelter: "Night approaches — build walls to shelter within.",
	craft_tool: "Better tools bring new possibilities — craft something.",
};

/**
 * Count unexplored chunks adjacent to the player's current chunk.
 * Returns the number of chunks within SCAN_RADIUS that haven't been visited.
 */
export function countUnexploredNearby(playerCx: number, playerCz: number, visited: ReadonlySet<number>): number {
	let count = 0;
	const r = MICRO_GOAL_SCAN_RADIUS;
	for (let dx = -r; dx <= r; dx++) {
		for (let dz = -r; dz <= r; dz++) {
			if (dx === 0 && dz === 0) continue;
			if (!visited.has(packChunk(playerCx + dx, playerCz + dz))) {
				count++;
			}
		}
	}
	return count;
}

/**
 * Find the best micro-goal for the current player state.
 * Priority: shelter (if night + no shelter) > explore > observe > craft > rune > landmark.
 *
 * Returns null if no obvious micro-goal (player has done everything nearby).
 */
export function findMicroGoal(
	playerCx: number,
	playerCz: number,
	visited: ReadonlySet<number>,
	timeOfDay: number,
	inShelter: boolean,
	hasObservableCreature: boolean,
	undiscoveredRuneCount: number,
	workstationTier: number,
): MicroGoal | null {
	// Night without shelter — urgent goal
	const isNightApproaching = timeOfDay > 0.65 && timeOfDay < 0.8;
	if (isNightApproaching && !inShelter) {
		return { type: "build_shelter", hint: GOAL_HINTS.build_shelter };
	}

	// Unexplored chunks nearby — always available early game
	const unexplored = countUnexploredNearby(playerCx, playerCz, visited);
	if (unexplored > 0) {
		return { type: "explore_chunk", hint: GOAL_HINTS.explore_chunk };
	}

	// Observable creature nearby
	if (hasObservableCreature) {
		return { type: "observe_creature", hint: GOAL_HINTS.observe_creature };
	}

	// Crafting progression hint — if player hasn't reached tier 1
	if (workstationTier < 1) {
		return { type: "craft_tool", hint: GOAL_HINTS.craft_tool };
	}

	// Undiscovered runes
	if (undiscoveredRuneCount > 0) {
		return { type: "discover_rune", hint: GOAL_HINTS.discover_rune };
	}

	// Landmark finding — generic fallback
	return { type: "find_landmark", hint: GOAL_HINTS.find_landmark };
}
