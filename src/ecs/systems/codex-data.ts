/**
 * Codex data — pure data definitions for the Kunskapen (Knowledge) page.
 * Species entries, reveal stages, observation thresholds, lore entries.
 * No ECS/Three.js — consumed by codex.ts (ECS) and BokCodex.tsx (UI).
 */

import type { SpeciesId } from "../traits/index.ts";
import { Species } from "../traits/index.ts";

// ─── Reveal Stages ───

export const RevealStage = {
	Hidden: 0,
	Silhouette: 1,
	Basic: 2,
	Full: 3,
} as const;
export type RevealStageId = (typeof RevealStage)[keyof typeof RevealStage];

/** Progress thresholds for each reveal stage (0–1 range). */
const STAGE_THRESHOLDS: readonly number[] = [0, 0.25, 0.6, 1.0];

/** Duration in seconds of continuous observation needed for full reveal. */
export const FULL_OBSERVE_DURATION = 8;

/** Compute reveal stage from observation progress [0, 1]. */
export function computeRevealStage(progress: number): RevealStageId {
	if (progress >= STAGE_THRESHOLDS[3]) return RevealStage.Full;
	if (progress >= STAGE_THRESHOLDS[2]) return RevealStage.Basic;
	if (progress >= STAGE_THRESHOLDS[1]) return RevealStage.Silhouette;
	return RevealStage.Hidden;
}

/** Get the progress threshold for a given stage. */
export function getStageThreshold(stage: RevealStageId): number {
	return STAGE_THRESHOLDS[stage];
}

// ─── Creature Entries ───

export interface CreatureEntry {
	species: SpeciesId;
	name: string;
	/** Revealed at Basic stage. */
	description: string;
	/** Revealed at Full stage. */
	weaknesses: string;
	/** Revealed at Full stage. */
	drops: string;
	/** Rune glyph displayed in the silhouette stage. */
	rune: string;
}

export const CREATURE_ENTRIES: readonly CreatureEntry[] = [
	{
		species: Species.Morker,
		name: "Mörker",
		description: "Shadow creatures that hunt in packs at night. Flankers surround while the alpha charges.",
		weaknesses: "Torchlight burns them. Dawn dissolves them entirely.",
		drops: "Shadow Essence",
		rune: "\u16A0",
	},
	{
		species: Species.Lyktgubbe,
		name: "Lyktgubbe",
		description: "Will-o-wisps that drift through marshes at twilight and dawn. Scatter when approached.",
		weaknesses: "None — passive and ethereal.",
		drops: "Glow Mote",
		rune: "\u16A2",
	},
	{
		species: Species.Skogssnigle,
		name: "Skogssnigle",
		description: "Giant forest snails found in woodlands. Slow, gentle grazers.",
		weaknesses: "Slow movement makes them easy to approach.",
		drops: "Slime Trail",
		rune: "\u16A6",
	},
	{
		species: Species.Trana,
		name: "Trana",
		description: "Cranes that travel in small flocks across open meadows. Graceful and wary.",
		weaknesses: "Easily startled by sudden movement.",
		drops: "Feather",
		rune: "\u16B1",
	},
	{
		species: Species.Runvaktare,
		name: "Runväktare",
		description: "Stone guardians near runstenar. Dormant until provoked — then devastating slam attacks.",
		weaknesses: "Slow to turn. Circle behind after a slam.",
		drops: "Rune Fragment",
		rune: "\u16B2",
	},
	{
		species: Species.Lindorm,
		name: "Lindorm",
		description: "Serpentine tunnelers that breach from underground. Attracted by mining vibrations.",
		weaknesses: "Vulnerable mid-breach when segments are exposed.",
		drops: "Scale Plate",
		rune: "\u16B7",
	},
	{
		species: Species.Draug,
		name: "Draugar",
		description: "Spectral undead that freeze when observed. Advance relentlessly when unobserved.",
		weaknesses: "Keep your eyes on them. Dawn banishes them.",
		drops: "Frost Shard",
		rune: "\u16B9",
	},
	{
		species: Species.Vittra,
		name: "Vittra",
		description: "Underground fae near mounds. Inflict otur (bad luck) when angered, bless when appeased.",
		weaknesses: "Offer food at their mound to appease.",
		drops: "Lucky Charm",
		rune: "\u16BA",
	},
	{
		species: Species.Nacken,
		name: "Näcken",
		description: "Water spirit seated near streams. Disorienting aura. Teaches runes to those who offer iron.",
		weaknesses: "Iron offering breaks the enchantment.",
		drops: "Rune Song",
		rune: "\u16BE",
	},
	{
		species: Species.Jatten,
		name: "Jätten",
		description: "Ancient giant boss. Consumes terrain to regenerate. Staggers when damaged enough.",
		weaknesses: "Stagger by dealing rapid damage. Prevent terrain consumption.",
		drops: "Giant's Heart",
		rune: "\u16C1",
	},
];

/** Lookup creature entry by species. */
export function getCreatureEntry(species: SpeciesId): CreatureEntry | undefined {
	return CREATURE_ENTRIES.find((e) => e.species === species);
}

// ─── Lore Entries ───

export interface LoreEntry {
	id: string;
	title: string;
	text: string;
	/** Source landmark type (runsten or fornlamning). */
	source: "runsten" | "fornlamning";
}

export const LORE_ENTRIES: readonly LoreEntry[] = [
	{
		id: "lore_rune_origin",
		title: "Origin of the Runes",
		text: "The first inscriptions were carved by wanderers who listened to the land. Each mark holds the memory of the stone.",
		source: "runsten",
	},
	{
		id: "lore_morker_fear",
		title: "The Mörker's Fear",
		text: "Where light falls, shadow flees. The ancients raised torches not for warmth, but for safety.",
		source: "runsten",
	},
	{
		id: "lore_lindorm_deep",
		title: "The Lindorm Below",
		text: "Beneath the roots of mountains, great serpents coil. They feel every stone that shifts above.",
		source: "fornlamning",
	},
	{
		id: "lore_vittra_mound",
		title: "The Vittra Mounds",
		text: "Leave offerings at the small hills. The underground folk remember kindness — and slights.",
		source: "fornlamning",
	},
	{
		id: "lore_nacken_stream",
		title: "The Song of Näcken",
		text: "By still water, a melody drifts. Those who listen too long forget which way is home.",
		source: "runsten",
	},
	{
		id: "lore_jatten_fall",
		title: "The Fall of the Giant",
		text: "The great one sleeps where mountains crumble. When the land is scarred enough, it wakes.",
		source: "fornlamning",
	},
];

/** Lookup lore entry by id. */
export function getLoreEntry(id: string): LoreEntry | undefined {
	return LORE_ENTRIES.find((e) => e.id === id);
}
