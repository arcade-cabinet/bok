/**
 * Progression Arc — discovery-driven multi-act progression system.
 *
 * Five acts guide the player from awakening through Jätten confrontation.
 * Inscription level thresholds + milestone gates drive act transitions.
 * Pure data — no ECS, no Three.js. Consumed by saga.ts for milestone recording.
 */

// ─── Act Definitions ───

export const Act = {
	/** Awakening — survive first night. */
	I: 1,
	/** The Margin — establish base, craft workstation. */
	II: 2,
	/** Beyond the Margin — explore second biome, defeat Runväktare. */
	III: 3,
	/** The Inscription — build hamlet settlement, Jätten warning. */
	IV: 4,
	/** Jätten — confront boss, earn Runsten Seal. */
	V: 5,
} as const;
export type ActId = (typeof Act)[keyof typeof Act];

/** Display names for each act. */
export const ACT_NAMES: Record<ActId, string> = {
	[Act.I]: "Awakening",
	[Act.II]: "The Margin",
	[Act.III]: "Beyond the Margin",
	[Act.IV]: "The Inscription",
	[Act.V]: "Jätten",
};

/** Inscription level thresholds that gate act transitions. */
export const INSCRIPTION_ACT_THRESHOLDS: Record<ActId, number> = {
	[Act.I]: 0,
	[Act.II]: 10,
	[Act.III]: 100,
	[Act.IV]: 300,
	[Act.V]: 1000,
};

// ─── State for Act Computation ───

export interface ProgressionState {
	dayCount: number;
	inscriptionLevel: number;
	hasShelter: boolean;
	hasWorkstation: boolean;
	biomesDiscovered: number;
	hasDefeatedRunvaktare: boolean;
	/** 0 = none, 1 = hamlet, 2 = village, 3 = town */
	settlementLevel: number;
	bossDefeated: boolean;
}

// ─── Act Computation ───

/**
 * Compute the player's current act from game state.
 * Acts are sequential — each requires the previous act's gate plus its own.
 * Inscription level is a necessary-but-not-sufficient condition for each act.
 */
export function computeCurrentAct(state: ProgressionState): ActId {
	// Act V: boss defeated + inscription >= 1000
	if (state.bossDefeated && state.inscriptionLevel >= INSCRIPTION_ACT_THRESHOLDS[Act.V]) {
		return Act.V;
	}

	// Act IV: Runväktare defeated + hamlet+ settlement + inscription >= 300
	if (
		state.hasDefeatedRunvaktare &&
		state.settlementLevel >= 1 &&
		state.inscriptionLevel >= INSCRIPTION_ACT_THRESHOLDS[Act.IV]
	) {
		return Act.IV;
	}

	// Act III: workstation + 2+ biomes + inscription >= 100
	if (
		state.hasWorkstation &&
		state.biomesDiscovered >= 2 &&
		state.inscriptionLevel >= INSCRIPTION_ACT_THRESHOLDS[Act.III]
	) {
		return Act.III;
	}

	// Act II: shelter built + inscription >= 10
	if (state.hasShelter && state.inscriptionLevel >= INSCRIPTION_ACT_THRESHOLDS[Act.II]) {
		return Act.II;
	}

	return Act.I;
}

// ─── Objectives ───

const ACT_OBJECTIVES: Record<ActId, string> = {
	[Act.I]: "Survive the first night — build a shelter before darkness falls.",
	[Act.II]: "Establish your base. Craft a workstation and fill your first Kunskapen entry.",
	[Act.III]: "Explore a second biome. Find a Fornlämning and defeat its Runväktare.",
	[Act.IV]: "Grow your settlement to hamlet size. The Jätten stirs.",
	[Act.V]: "Confront the Jätten and earn the Runsten Seal.",
};

/** Get the current act's objective text for UI display. */
export function getActObjective(act: ActId): string {
	return ACT_OBJECTIVES[act];
}

// ─── Saga Integration ───

const ACT_MILESTONE_IDS: Record<ActId, string> = {
	[Act.I]: "act_1_awakening",
	[Act.II]: "act_2_margin",
	[Act.III]: "act_3_beyond",
	[Act.IV]: "act_4_inscription",
	[Act.V]: "act_5_jatten",
};

const ACT_PROSE: Record<ActId, string> = {
	[Act.I]:
		"The wanderer opened their eyes to a strange land. With bare hands and birch bark, the first chapter begins.",
	[Act.II]: "Walls rose, a workbench took shape. The margin of the wild grew smaller — the wanderer claims a foothold.",
	[Act.III]:
		"New lands beckoned beyond the familiar hills. At the old ruins, a Runväktare stood guard over forgotten knowledge.",
	[Act.IV]:
		"Stone by stone, a hamlet emerged. The runes carved deep enough that the earth itself took notice — the Jätten stirs.",
	[Act.V]:
		"The ancient giant fell. The Runsten Seal was earned, and the wanderer's saga etched forever into the world's memory.",
};

/** Get the milestone ID for an act transition (for SagaLog recording). */
export function getActMilestoneId(act: ActId): string {
	return ACT_MILESTONE_IDS[act];
}

/** Get the saga prose for an act transition. */
export function getActProse(act: ActId): string {
	return ACT_PROSE[act];
}
