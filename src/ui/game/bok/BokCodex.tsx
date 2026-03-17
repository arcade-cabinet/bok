/**
 * BokCodex — Kunskapen (Knowledge) page of the Bok journal.
 * Renders creature entries at progressive reveal stages, lore entries, recipe discoveries.
 *
 * Props use plain arrays (not Sets) so they serialize across Playwright CT boundary.
 */

import {
	CREATURE_ENTRIES,
	type CreatureEntry,
	computeRevealStage,
	LORE_ENTRIES,
	type LoreEntry,
	RevealStage,
} from "../../../ecs/systems/codex-data.ts";
import { RUNES } from "../../../ecs/systems/rune-data.ts";
import {
	RUNE_DISCOVERIES,
	type RuneDiscoveryEntry,
	TOTAL_DISCOVERABLE_RUNES,
} from "../../../ecs/systems/rune-discovery-data.ts";

export interface BokCodexProps {
	/** Observation progress per species id. Range [0, 1]. */
	creatureProgress: Record<string, number>;
	/** Collected lore entry IDs (plain array for serialization). */
	loreEntryIds: string[];
	/** Count of recipes discovered through exploration. */
	discoveredRecipeCount: number;
	/** Discovered rune IDs (plain array for serialization). */
	discoveredRuneIds?: number[];
}

export function BokCodex({ creatureProgress, loreEntryIds, discoveredRecipeCount, discoveredRuneIds }: BokCodexProps) {
	const creatures = CREATURE_ENTRIES.map((entry) => ({
		entry,
		progress: creatureProgress[entry.species] ?? 0,
		stage: computeRevealStage(creatureProgress[entry.species] ?? 0),
	}));
	const loreSet = new Set(loreEntryIds);
	const collectedLore = LORE_ENTRIES.filter((l) => loreSet.has(l.id));
	const discoveredSet = new Set(discoveredRuneIds ?? []);
	const discoveredRunes = RUNE_DISCOVERIES.filter((e) => discoveredSet.has(e.runeId));

	return (
		<div className="space-y-6" data-testid="bok-codex">
			{/* Rune Discoveries */}
			{discoveredRunes.length > 0 && (
				<section data-testid="codex-runes">
					<h3
						className="font-display text-sm tracking-[0.2em] uppercase mb-3"
						style={{ color: "var(--color-bok-ink)" }}
					>
						Runes ({discoveredRunes.length}/{TOTAL_DISCOVERABLE_RUNES})
					</h3>
					<div className="space-y-2">
						{discoveredRunes.map((entry) => (
							<RuneCard key={entry.runeId} entry={entry} />
						))}
					</div>
				</section>
			)}

			{/* Creature Entries */}
			<section data-testid="codex-creatures">
				<h3 className="font-display text-sm tracking-[0.2em] uppercase mb-3" style={{ color: "var(--color-bok-ink)" }}>
					Creatures
				</h3>
				<div className="space-y-2">
					{creatures.map(({ entry, progress, stage }) => (
						<CreatureCard key={entry.species} entry={entry} progress={progress} stage={stage} />
					))}
				</div>
			</section>

			{/* Lore Entries */}
			{collectedLore.length > 0 && (
				<section data-testid="codex-lore">
					<h3
						className="font-display text-sm tracking-[0.2em] uppercase mb-3"
						style={{ color: "var(--color-bok-ink)" }}
					>
						Inscriptions
					</h3>
					<div className="space-y-2">
						{collectedLore.map((lore) => (
							<LoreCard key={lore.id} lore={lore} />
						))}
					</div>
				</section>
			)}

			{/* Recipe Discoveries */}
			{discoveredRecipeCount > 0 && (
				<section data-testid="codex-recipes">
					<h3
						className="font-display text-sm tracking-[0.2em] uppercase mb-3"
						style={{ color: "var(--color-bok-ink)" }}
					>
						Discovered Recipes
					</h3>
					<p className="text-xs opacity-60">
						{discoveredRecipeCount} recipe{discoveredRecipeCount !== 1 ? "s" : ""} discovered
					</p>
				</section>
			)}
		</div>
	);
}

// ─── Sub-components ───

function CreatureCard({ entry, progress, stage }: { entry: CreatureEntry; progress: number; stage: number }) {
	const pct = Math.round(progress * 100);
	const barColor = stage >= RevealStage.Full ? "#6b8f5e" : "#c9a84c";

	return (
		<div
			className="rounded-lg p-3"
			style={{
				background: "rgba(0,0,0,0.04)",
				border: "1px solid rgba(201,168,76,0.2)",
			}}
			data-testid={`creature-${entry.species}`}
			data-stage={stage}
		>
			{/* Header: rune + name + progress bar */}
			<div className="flex items-center gap-2 mb-1">
				<span className="text-lg" style={{ color: "var(--color-bok-gold)", opacity: stage > 0 ? 1 : 0.3 }}>
					{entry.rune}
				</span>
				<span
					className="font-display text-sm tracking-wider"
					style={{ color: "var(--color-bok-ink)", opacity: stage >= RevealStage.Silhouette ? 0.9 : 0.3 }}
				>
					{stage >= RevealStage.Silhouette ? entry.name : "???"}
				</span>
				<div
					className="flex-1 h-1 rounded-full ml-auto"
					style={{ background: "rgba(0,0,0,0.1)", maxWidth: "60px" }}
					data-testid={`progress-${entry.species}`}
				>
					<div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
				</div>
			</div>

			{/* Description — Basic stage */}
			{stage >= RevealStage.Basic && (
				<p className="text-xs leading-relaxed mt-1" style={{ color: "var(--color-bok-ink)", opacity: 0.6 }}>
					{entry.description}
				</p>
			)}

			{/* Weaknesses + Drops — Full stage */}
			{stage >= RevealStage.Full && (
				<div className="mt-2 text-xs space-y-1" style={{ color: "var(--color-bok-ink)", opacity: 0.5 }}>
					<p>
						<strong>Weakness:</strong> {entry.weaknesses}
					</p>
					<p>
						<strong>Drops:</strong> {entry.drops}
					</p>
				</div>
			)}
		</div>
	);
}

function RuneCard({ entry }: { entry: RuneDiscoveryEntry }) {
	const runeDef = RUNES[entry.runeId];
	if (!runeDef) return null;

	return (
		<div
			className="rounded-lg p-3"
			style={{
				background: "rgba(0,0,0,0.04)",
				border: `1px solid ${runeDef.color}30`,
			}}
			data-testid={`rune-entry-${runeDef.name.toLowerCase()}`}
		>
			<div className="flex items-center gap-2 mb-1">
				<span className="text-lg" style={{ color: runeDef.color }}>
					{runeDef.glyph}
				</span>
				<span className="font-display text-sm tracking-wider" style={{ color: "var(--color-bok-ink)" }}>
					{entry.title}
				</span>
			</div>
			<p className="text-xs leading-relaxed" style={{ color: "var(--color-bok-ink)", opacity: 0.7 }}>
				{entry.discoveryText}
			</p>
			<p className="text-xs leading-relaxed mt-1" style={{ color: "var(--color-bok-ink)", opacity: 0.5 }}>
				{entry.behaviorText}
			</p>
		</div>
	);
}

function LoreCard({ lore }: { lore: LoreEntry }) {
	return (
		<div
			className="rounded-lg p-3"
			style={{
				background: "rgba(0,0,0,0.04)",
				border: "1px solid rgba(201,168,76,0.15)",
			}}
			data-testid={`lore-${lore.id}`}
		>
			<div className="flex items-center gap-2 mb-1">
				<span className="text-xs opacity-40">{lore.source === "runsten" ? "\u16A0" : "\u16B2"}</span>
				<span className="font-display text-xs tracking-wider" style={{ color: "var(--color-bok-ink)" }}>
					{lore.title}
				</span>
			</div>
			<p className="text-xs leading-relaxed" style={{ color: "var(--color-bok-ink)", opacity: 0.6 }}>
				{lore.text}
			</p>
		</div>
	);
}
