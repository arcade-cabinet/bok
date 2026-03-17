// ─── Stroke Matcher ───
// Compares player-drawn strokes against canonical glyph paths.
// Resample → normalize → compare → score. Pure math, no side effects.

import type { GlyphDef, Stroke, StrokePoint } from "./glyph-strokes.ts";

/** Number of equidistant points to resample each stroke to. */
const RESAMPLE_COUNT = 20;

/** Forgiveness thresholds — max average distance for a passing score. */
export const TOUCH_THRESHOLD = 0.15;
export const MOUSE_THRESHOLD = 0.1;

/** Minimum number of raw points for a stroke to be considered valid. */
export const MIN_RAW_POINTS = 5;

/** Result of matching a player's strokes against a glyph. */
export interface MatchResult {
	/** Score in [0, 1] where 1 = perfect match. */
	score: number;
	/** Whether the match passes the threshold for the given input mode. */
	pass: boolean;
	/** Per-stroke scores (same order as glyph strokes). */
	strokeScores: number[];
}

// ─── Geometry Helpers ───

/** Euclidean distance between two points. */
function dist(a: StrokePoint, b: StrokePoint): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/** Total path length of a stroke. */
function pathLength(stroke: Stroke): number {
	let len = 0;
	for (let i = 1; i < stroke.length; i++) {
		len += dist(stroke[i - 1], stroke[i]);
	}
	return len;
}

/** Lerp between two points. */
function lerp(a: StrokePoint, b: StrokePoint, t: number): StrokePoint {
	return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// ─── Resample ───

/**
 * Resample a stroke to N equidistant points along its path.
 * If stroke has fewer than 2 points, returns empty.
 */
export function resampleStroke(stroke: Stroke, n: number = RESAMPLE_COUNT): Stroke {
	if (stroke.length < 2) return [];

	const totalLen = pathLength(stroke);
	if (totalLen === 0) return Array(n).fill(stroke[0]);

	const spacing = totalLen / (n - 1);
	const result: Stroke = [{ ...stroke[0] }];

	let accumulated = 0;
	let srcIdx = 1;

	while (result.length < n && srcIdx < stroke.length) {
		const segLen = dist(stroke[srcIdx - 1], stroke[srcIdx]);
		if (segLen === 0) {
			srcIdx++;
			continue;
		}

		if (accumulated + segLen >= spacing) {
			const overshoot = spacing - accumulated;
			const t = overshoot / segLen;
			const pt = lerp(stroke[srcIdx - 1], stroke[srcIdx], t);
			result.push(pt);
			// Insert the new point into the stroke for next iteration
			stroke = [...stroke.slice(0, srcIdx), pt, ...stroke.slice(srcIdx)];
			accumulated = 0;
			srcIdx++;
		} else {
			accumulated += segLen;
			srcIdx++;
		}
	}

	// Pad with last point if rounding left us short
	while (result.length < n) {
		result.push({ ...stroke[stroke.length - 1] });
	}

	return result.slice(0, n);
}

// ─── Single Stroke Comparison ───

/**
 * Compare two resampled strokes (same length) by average point distance.
 * Returns average Euclidean distance.
 */
function averagePointDistance(a: Stroke, b: Stroke): number {
	const n = Math.min(a.length, b.length);
	if (n === 0) return 1;

	let total = 0;
	for (let i = 0; i < n; i++) {
		total += dist(a[i], b[i]);
	}
	return total / n;
}

/**
 * Score a single player stroke against a canonical stroke.
 * Tries both forward and reverse directions, picks the best.
 * Returns score in [0, 1].
 */
export function scoreStroke(playerStroke: Stroke, canonicalStroke: Stroke, threshold: number): number {
	const playerResampled = resampleStroke(playerStroke);
	const canonicalResampled = resampleStroke(canonicalStroke);

	if (playerResampled.length === 0 || canonicalResampled.length === 0) return 0;

	// Forward comparison
	const forwardDist = averagePointDistance(playerResampled, canonicalResampled);

	// Reverse comparison (player drew bottom-to-top)
	const reversedPlayer = [...playerResampled].reverse();
	const reverseDist = averagePointDistance(reversedPlayer, canonicalResampled);

	const bestDist = Math.min(forwardDist, reverseDist);
	return Math.max(0, Math.min(1, 1 - bestDist / threshold));
}

// ─── Multi-Stroke Matching ───

/**
 * Generate all permutations of an array (for stroke ordering).
 * Limited to arrays of length <= 4 (max strokes per glyph).
 */
function permutations<T>(arr: T[]): T[][] {
	if (arr.length <= 1) return [arr];
	const result: T[][] = [];
	for (let i = 0; i < arr.length; i++) {
		const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
		for (const perm of permutations(rest)) {
			result.push([arr[i], ...perm]);
		}
	}
	return result;
}

/**
 * Match a set of player strokes against a glyph definition.
 * Tries all permutations of player strokes against canonical strokes.
 *
 * @param playerStrokes - Raw strokes drawn by the player.
 * @param glyph - Canonical glyph definition to match against.
 * @param threshold - Distance threshold (TOUCH_THRESHOLD or MOUSE_THRESHOLD).
 * @returns Best match result across all permutations.
 */
export function matchGlyph(playerStrokes: Stroke[], glyph: GlyphDef, threshold: number = TOUCH_THRESHOLD): MatchResult {
	const canonical = glyph.strokes;

	// Filter out too-short player strokes
	const validStrokes = playerStrokes.filter((s) => s.length >= MIN_RAW_POINTS);

	// If stroke count doesn't match, score is 0
	if (validStrokes.length !== canonical.length) {
		return {
			score: 0,
			pass: false,
			strokeScores: canonical.map(() => 0),
		};
	}

	// Try all permutations of player strokes
	const perms = permutations(validStrokes);
	let bestResult: MatchResult = {
		score: 0,
		pass: false,
		strokeScores: canonical.map(() => 0),
	};

	for (const perm of perms) {
		const scores = perm.map((ps, i) => scoreStroke(ps, canonical[i], threshold));
		const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;

		if (avg > bestResult.score) {
			bestResult = {
				score: avg,
				pass: avg >= 0.5,
				strokeScores: scores,
			};
		}
	}

	return bestResult;
}

/**
 * Find the best matching glyph from a set of candidates.
 * Used when the player hasn't pre-selected a rune (free-draw mode).
 *
 * @param playerStrokes - Raw strokes drawn by the player.
 * @param candidates - Glyph definitions to try.
 * @param threshold - Distance threshold.
 * @returns Best match, or null if nothing passes.
 */
export function findBestMatch(
	playerStrokes: Stroke[],
	candidates: GlyphDef[],
	threshold: number = TOUCH_THRESHOLD,
): { glyph: GlyphDef; result: MatchResult } | null {
	let best: { glyph: GlyphDef; result: MatchResult } | null = null;

	for (const glyph of candidates) {
		const result = matchGlyph(playerStrokes, glyph, threshold);
		if (result.pass && (!best || result.score > best.result.score)) {
			best = { glyph, result };
		}
	}

	return best;
}
