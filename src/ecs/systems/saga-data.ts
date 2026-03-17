/**
 * Saga data — pure data definitions for the Sagan (Saga/Journal) page.
 * Milestone definitions, prose generation, stats aggregation.
 * No ECS/Three.js — consumed by saga.ts (ECS) and BokSaga.tsx (UI).
 */

// ─── Milestone Definitions ───

export const MilestoneId = {
	FirstShelter: "first_shelter",
	FirstCreatureKill: "first_creature_kill",
	FirstBiome: "first_biome",
	BossDefeated: "boss_defeated",
	Day3: "day_3",
	Day7: "day_7",
	Day14: "day_14",
	Day30: "day_30",
	Blocks100: "blocks_100",
	Blocks500: "blocks_500",
	FirstObservation: "first_observation",
	FirstLore: "first_lore",
} as const;
export type MilestoneKey = (typeof MilestoneId)[keyof typeof MilestoneId];

export interface SagaEntry {
	milestoneId: MilestoneKey;
	/** Day on which this milestone was achieved. */
	day: number;
	/** Prose verse describing the achievement. */
	text: string;
}

/** Prose templates for each milestone. */
const MILESTONE_PROSE: Record<MilestoneKey, string> = {
	[MilestoneId.FirstShelter]:
		"With stone and timber, the wanderer raised walls against the dark. A hearth was kindled — the first shelter stood.",
	[MilestoneId.FirstCreatureKill]:
		"Steel met shadow and the creature fell. The wanderer's blade tasted blood for the first time.",
	[MilestoneId.FirstBiome]: "Beyond the familiar meadows, new land unfolded. Strange ground beneath unfamiliar skies.",
	[MilestoneId.BossDefeated]:
		"The ancient giant, Jätten, crumbled at last. The earth itself shook as the great one fell.",
	[MilestoneId.Day3]: "Three suns have risen and set. The wanderer endures, learning the rhythm of the land.",
	[MilestoneId.Day7]:
		"A full week in the wild. The wanderer knows the sound of wind through birch, the cry of cranes at dusk.",
	[MilestoneId.Day14]: "Fourteen days carved into stone. The land remembers the wanderer's name now.",
	[MilestoneId.Day30]: "A full moon's passage. The saga deepens — the wanderer is no longer a stranger here.",
	[MilestoneId.Blocks100]:
		"One hundred marks upon the world. Stone lifted, earth moved — the landscape bears the wanderer's will.",
	[MilestoneId.Blocks500]: "Five hundred inscriptions etched into the terrain. The wanderer reshapes the land itself.",
	[MilestoneId.FirstObservation]:
		"Patient eyes studied a creature of the wild. Knowledge begins with stillness and attention.",
	[MilestoneId.FirstLore]:
		"Ancient runes whispered their secrets. The old stories live again through the wanderer's eyes.",
};

/** Generate a saga entry for a given milestone. */
export function createSagaEntry(milestoneId: MilestoneKey, day: number): SagaEntry {
	return {
		milestoneId,
		day,
		text: MILESTONE_PROSE[milestoneId],
	};
}

// ─── Active Objectives ───

export interface ActiveObjective {
	text: string;
	progress: number;
	target: number;
}

/** Day thresholds for survival milestones. */
const DAY_THRESHOLDS = [3, 7, 14, 30] as const;

/** Compute the current active objective based on game state. */
export function computeActiveObjective(
	dayCount: number,
	hasShelter: boolean,
	hasKilledCreature: boolean,
	achievedMilestones: ReadonlySet<string>,
): ActiveObjective | null {
	if (!hasShelter && !achievedMilestones.has(MilestoneId.FirstShelter)) {
		return {
			text: "Build your first shelter — raise walls and a roof.",
			progress: 0,
			target: 1,
		};
	}

	if (!hasKilledCreature && !achievedMilestones.has(MilestoneId.FirstCreatureKill)) {
		return {
			text: "Defeat a creature of the wild.",
			progress: 0,
			target: 1,
		};
	}

	for (const threshold of DAY_THRESHOLDS) {
		const milestoneId =
			threshold === 3
				? MilestoneId.Day3
				: threshold === 7
					? MilestoneId.Day7
					: threshold === 14
						? MilestoneId.Day14
						: MilestoneId.Day30;
		if (!achievedMilestones.has(milestoneId)) {
			return {
				text: `Survive ${threshold} days.`,
				progress: Math.min(dayCount, threshold),
				target: threshold,
			};
		}
	}

	if (!achievedMilestones.has(MilestoneId.BossDefeated)) {
		return {
			text: "Seek and defeat the ancient Jätten.",
			progress: 0,
			target: 1,
		};
	}

	return null;
}

// ─── Stats ───

export interface SagaStats {
	daysSurvived: number;
	blocksPlaced: number;
	blocksMined: number;
	creaturesObserved: number;
}

/** Compute stats from ECS-sourced values. */
export function computeSagaStats(
	dayCount: number,
	blocksPlaced: number,
	blocksMined: number,
	creatureProgress: Record<string, number>,
): SagaStats {
	let observed = 0;
	for (const progress of Object.values(creatureProgress)) {
		if (progress > 0) observed++;
	}
	return {
		daysSurvived: dayCount,
		blocksPlaced,
		blocksMined,
		creaturesObserved: observed,
	};
}

// ─── Milestone Detection Helpers ───

/** Check which milestones should trigger based on current state. */
export function detectNewMilestones(
	achieved: ReadonlySet<string>,
	dayCount: number,
	totalBlocksPlaced: number,
	totalBlocksMined: number,
	inShelter: boolean,
	creaturesKilled: number,
	biomesDiscovered: number,
	bossDefeated: boolean,
	creaturesObserved: number,
	loreCollected: number,
): MilestoneKey[] {
	const triggered: MilestoneKey[] = [];

	const check = (id: MilestoneKey, condition: boolean) => {
		if (!achieved.has(id) && condition) triggered.push(id);
	};

	check(MilestoneId.FirstShelter, inShelter);
	check(MilestoneId.FirstCreatureKill, creaturesKilled > 0);
	check(MilestoneId.FirstBiome, biomesDiscovered >= 2);
	check(MilestoneId.BossDefeated, bossDefeated);
	check(MilestoneId.Day3, dayCount >= 3);
	check(MilestoneId.Day7, dayCount >= 7);
	check(MilestoneId.Day14, dayCount >= 14);
	check(MilestoneId.Day30, dayCount >= 30);
	check(MilestoneId.Blocks100, totalBlocksPlaced + totalBlocksMined >= 100);
	check(MilestoneId.Blocks500, totalBlocksPlaced + totalBlocksMined >= 500);
	check(MilestoneId.FirstObservation, creaturesObserved > 0);
	check(MilestoneId.FirstLore, loreCollected > 0);

	return triggered;
}
