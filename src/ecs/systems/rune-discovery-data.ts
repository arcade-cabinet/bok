/**
 * Rune Discovery Data — pure data definitions for rune discovery triggers
 * and Kunskapen (Knowledge) rune entries.
 *
 * Maps each rune to its discovery condition per structures.md discovery table,
 * plus the description text shown in the Bok when discovered.
 *
 * No ECS, no Three.js — just lookup tables and pure functions.
 */

import { RuneId, type RuneIdValue } from "./rune-data.ts";

// ─── Trigger Types ───

/** How a rune can be discovered in the world. */
export const DiscoveryTrigger = {
	/** Auto-granted at game start (tutorial). */
	Tutorial: "tutorial",
	/** Observe a full sunrise cycle (timeOfDay crosses dawn). */
	Sunrise: "sunrise",
	/** Be near a specific creature species. */
	CreatureNearby: "creature_nearby",
	/** Be near a landmark (Fornlämning/Runsten). */
	LandmarkNearby: "landmark_nearby",
	/** Take damage from any source. */
	DamageTaken: "damage_taken",
	/** Kill a creature. */
	CreatureKilled: "creature_killed",
	/** Visit a specific biome type. */
	BiomeVisited: "biome_visited",
} as const;

export type DiscoveryTriggerId = (typeof DiscoveryTrigger)[keyof typeof DiscoveryTrigger];

// ─── Discovery Table ───

export interface RuneDiscoveryEntry {
	/** The rune being discovered. */
	runeId: RuneIdValue;
	/** How the rune is discovered. */
	trigger: DiscoveryTriggerId;
	/** Additional parameter for the trigger (species, biome, landmark type). */
	triggerParam?: string;
	/** Short title shown in Kunskapen. */
	title: string;
	/** Flavor text describing the discovery moment. */
	discoveryText: string;
	/** Rune behavior description shown in Kunskapen. */
	behaviorText: string;
	/** Saga entry text when discovered (uses {day} placeholder). */
	sagaText: string;
}

/**
 * Discovery table for all 15 implemented runes.
 * Maps each rune to its world-observation trigger per structures.md.
 */
export const RUNE_DISCOVERIES: readonly RuneDiscoveryEntry[] = [
	{
		runeId: RuneId.Kenaz,
		trigger: DiscoveryTrigger.Tutorial,
		title: "Kenaz — Torch",
		discoveryText: "The first rune, demonstrated at the spawn stenhög. Fire's essence, carved into stone.",
		behaviorText: "Emits heat in its facing direction. The elemental source for forges and warmth.",
		sagaText: "Day {day} — The warmth rune reveals itself. Fire carved into stone.",
	},
	{
		runeId: RuneId.Sowilo,
		trigger: DiscoveryTrigger.Sunrise,
		title: "Sowilo — Sun",
		discoveryText: "Watching the sun crest the horizon, light's pattern becomes clear.",
		behaviorText: "Emits light in its facing direction. Repels Mörker and darkness creatures.",
		sagaText: "Day {day} — The sunrise taught the mark of light.",
	},
	{
		runeId: RuneId.Fehu,
		trigger: DiscoveryTrigger.LandmarkNearby,
		triggerParam: "runsten",
		title: "Fehu — Wealth",
		discoveryText: "Near the old runestone, dropped items slide toward its base. The pull of wealth.",
		behaviorText: "Attracts nearby loose items within radius. A collector rune.",
		sagaText: "Day {day} — The runestone pulls. Fehu, the wealth-gatherer, is understood.",
	},
	{
		runeId: RuneId.Ansuz,
		trigger: DiscoveryTrigger.CreatureNearby,
		triggerParam: "runvaktare",
		title: "Ansuz — Signal",
		discoveryText: "A Runväktare stirs as you enter the ruin. Stone that senses — wisdom carved.",
		behaviorText: "Detects creatures within radius. Emits a detection signal when triggered.",
		sagaText: "Day {day} — The guardian woke. Ansuz, the sensing rune, is learned.",
	},
	{
		runeId: RuneId.Algiz,
		trigger: DiscoveryTrigger.LandmarkNearby,
		triggerParam: "fornlamning",
		title: "Algiz — Protection",
		discoveryText: "Mörker circle the ancient ruin but cannot enter. A ward older than memory.",
		behaviorText: "Creates an exclusion zone. Hostile creatures cannot enter the warded area.",
		sagaText: "Day {day} — The ancient ward speaks. Algiz protects what it encircles.",
	},
	{
		runeId: RuneId.Jera,
		trigger: DiscoveryTrigger.CreatureNearby,
		triggerParam: "skogssnigle",
		title: "Jera — Harvest",
		discoveryText: "A Skogssnigle grazes, and where it passes, grass becomes mushroom. Nature transforms.",
		behaviorText: "Transforms resources when signal is present. The core of automated crafting.",
		sagaText: "Day {day} — The snail showed the way. Jera transforms what it touches.",
	},
	{
		runeId: RuneId.Thurisaz,
		trigger: DiscoveryTrigger.DamageTaken,
		title: "Thurisaz — Thorn",
		discoveryText: "Pain teaches what words cannot. The ruin's trap strikes, and its mark is understood.",
		behaviorText: "Converts incoming signal to area damage. A trap rune for automated defense.",
		sagaText: "Day {day} — A wound becomes wisdom. Thurisaz, the thorn, is known.",
	},
	{
		runeId: RuneId.Uruz,
		trigger: DiscoveryTrigger.CreatureNearby,
		triggerParam: "lindorm",
		title: "Uruz — Strength",
		discoveryText: "The Lindorm breaches earth, pushing stone aside. Raw force given form.",
		behaviorText: "Exerts a push force on entities in the signal direction.",
		sagaText: "Day {day} — The serpent's strength is carved. Uruz pushes what stands before it.",
	},
	{
		runeId: RuneId.Berkanan,
		trigger: DiscoveryTrigger.BiomeVisited,
		triggerParam: "bokskogen",
		title: "Berkanan — Growth",
		discoveryText: "In the deep forest, saplings grow tall beside ancient birch. Life accelerates.",
		behaviorText: "Accelerates natural growth in radius. Saplings grow, crops yield faster.",
		sagaText: "Day {day} — The birch whispers growth. Berkanan quickens life around it.",
	},
	{
		runeId: RuneId.Mannaz,
		trigger: DiscoveryTrigger.CreatureNearby,
		triggerParam: "vittra",
		title: "Mannaz — Humanity",
		discoveryText: "Near the Vittra mound, peace settles. Creatures calm in the presence of old magic.",
		behaviorText: "Neutral creatures in radius become friendly. A calming ward.",
		sagaText: "Day {day} — The Vittra taught stillness. Mannaz calms what lives nearby.",
	},
	{
		runeId: RuneId.Naudiz,
		trigger: DiscoveryTrigger.LandmarkNearby,
		triggerParam: "fornlamning",
		title: "Naudiz — Need",
		discoveryText: "In the ruin, a door opens when the sensor loses its target. Absence triggers action.",
		behaviorText: "Outputs signal when receiving none. The NOT gate — inverts logic.",
		sagaText: "Day {day} — Need reveals itself in what is missing. Naudiz inverts.",
	},
	{
		runeId: RuneId.Isa,
		trigger: DiscoveryTrigger.BiomeVisited,
		triggerParam: "fjallen",
		title: "Isa — Ice",
		discoveryText: "In the frozen heights, ice holds and then releases. Patience carved in crystal.",
		behaviorText: "Delays signal by N ticks before releasing. Enables sequential logic.",
		sagaText: "Day {day} — Ice holds, then releases. Isa teaches patience.",
	},
	{
		runeId: RuneId.Hagalaz,
		trigger: DiscoveryTrigger.CreatureKilled,
		title: "Hagalaz — Hail",
		discoveryText: "In the clash of forces, destruction follows a pattern. Hail falls where paths cross.",
		behaviorText: "Gates signal — passes only when inputs present on perpendicular faces. The AND gate.",
		sagaText: "Day {day} — Destruction has conditions. Hagalaz opens only when two paths meet.",
	},
	{
		runeId: RuneId.Raido,
		trigger: DiscoveryTrigger.LandmarkNearby,
		triggerParam: "runsten",
		title: "Raido — Journey",
		discoveryText: "Near the ancient runestone, the air shimmers. A path between distant stones reveals itself.",
		behaviorText: "Inscribe on runestones for fast travel. Paired Raido blocks bridge items across distances.",
		sagaText: "Day {day} — The journey rune. Raido connects what distance divides.",
	},
	{
		runeId: RuneId.Tiwaz,
		trigger: DiscoveryTrigger.CreatureKilled,
		title: "Tiwaz — Victory",
		discoveryText: "In the heat of battle, the mark of triumph appears. Victory's rune empowers the worthy.",
		behaviorText: "Boosts combat damage for entities within radius. The warrior's rune.",
		sagaText: "Day {day} — Triumph etched in stone. Tiwaz amplifies the warrior's blow.",
	},
];

/** Look up a discovery entry by rune ID. */
export function getDiscoveryEntry(runeId: number): RuneDiscoveryEntry | undefined {
	return RUNE_DISCOVERIES.find((e) => e.runeId === runeId);
}

/** Get all rune IDs that are auto-discovered (tutorial). */
export function getTutorialRunes(): RuneIdValue[] {
	return RUNE_DISCOVERIES.filter((e) => e.trigger === DiscoveryTrigger.Tutorial).map((e) => e.runeId);
}

/** Total number of discoverable runes. */
export const TOTAL_DISCOVERABLE_RUNES = RUNE_DISCOVERIES.length;
