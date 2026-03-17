// ─── Rune Predictor ───
// Ranks discovered runes by contextual relevance for the prediction carousel.
// Signals: recency, adjacency, frequency, discovery freshness.
// Pure function — no ECS, no side effects.

import type { RuneIdValue } from "../../ecs/systems/rune-data.ts";

/** Context passed to the predictor from ECS state. */
export interface PredictionContext {
	/** Discovered rune IDs (only these can be predicted). */
	discovered: readonly RuneIdValue[];
	/** Recently placed rune IDs, most recent first. Max ~10 entries. */
	recentPlacements: readonly RuneIdValue[];
	/** Rune IDs on adjacent block faces (neighbors of the target block). */
	adjacentRunes: readonly RuneIdValue[];
	/** Lifetime placement counts per rune ID. */
	placementCounts: Readonly<Record<number, number>>;
}

/** A prediction with its ranked score. */
export interface Prediction {
	runeId: RuneIdValue;
	score: number;
}

// ─── Weights ───

const W_RECENCY = 4;
const W_ADJACENCY = 3;
const W_FREQUENCY = 1;
const W_DISCOVERY = 0.5;

// ─── Scoring ───

/**
 * Rank discovered runes by contextual relevance.
 * Returns all discovered runes sorted by predicted desirability.
 */
export function predictRunes(ctx: PredictionContext): Prediction[] {
	if (ctx.discovered.length === 0) return [];

	const maxFreq = Math.max(1, ...Object.values(ctx.placementCounts));
	const adjacentSet = new Set(ctx.adjacentRunes);

	const predictions: Prediction[] = ctx.discovered.map((runeId) => {
		let score = 0;

		// ─── Recency: higher if recently placed ───
		const recentIdx = ctx.recentPlacements.indexOf(runeId);
		if (recentIdx !== -1) {
			// Decay: most recent = full weight, older = less
			score += W_RECENCY * (1 - recentIdx / ctx.recentPlacements.length);
		}

		// ─── Adjacency: boost if this rune is on a neighbor (circuit continuation) ───
		if (adjacentSet.has(runeId)) {
			score += W_ADJACENCY;
		}

		// ─── Frequency: slight boost for frequently used runes (muscle memory) ───
		const freq = ctx.placementCounts[runeId] ?? 0;
		score += W_FREQUENCY * (freq / maxFreq);

		// ─── Discovery freshness: slight boost for recently discovered runes ───
		// discovered array is ordered by discovery time, last = newest
		const discIdx = ctx.discovered.indexOf(runeId);
		if (discIdx !== -1) {
			score += W_DISCOVERY * (discIdx / ctx.discovered.length);
		}

		return { runeId, score };
	});

	// Sort descending by score, stable (preserves discovery order for ties)
	predictions.sort((a, b) => b.score - a.score);
	return predictions;
}

/**
 * Get the top N predicted rune IDs.
 * Convenience wrapper around predictRunes().
 */
export function topPredictions(ctx: PredictionContext, n: number = 5): RuneIdValue[] {
	return predictRunes(ctx)
		.slice(0, n)
		.map((p) => p.runeId);
}
