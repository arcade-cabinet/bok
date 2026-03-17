import { describe, expect, test } from "vitest";
import type { Stroke } from "./glyph-strokes.ts";
import { getGlyph } from "./glyph-strokes.ts";
import {
	findBestMatch,
	MIN_RAW_POINTS,
	MOUSE_THRESHOLD,
	matchGlyph,
	resampleStroke,
	scoreStroke,
	TOUCH_THRESHOLD,
} from "./stroke-matcher.ts";

// ─── Helpers ───

/** Generate N evenly-spaced points along a stroke path (simulates perfect drawing). */
function tracePerfect(stroke: Stroke, numPoints: number = 30): Stroke {
	const result: Stroke = [];
	const totalLen = stroke.reduce((sum, pt, i) => {
		if (i === 0) return 0;
		return sum + Math.sqrt((pt.x - stroke[i - 1].x) ** 2 + (pt.y - stroke[i - 1].y) ** 2);
	}, 0);

	for (let i = 0; i < numPoints; i++) {
		const t = i / (numPoints - 1);
		const targetDist = t * totalLen;
		let accumulated = 0;
		for (let j = 1; j < stroke.length; j++) {
			const segLen = Math.sqrt((stroke[j].x - stroke[j - 1].x) ** 2 + (stroke[j].y - stroke[j - 1].y) ** 2);
			if (accumulated + segLen >= targetDist) {
				const frac = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
				result.push({
					x: stroke[j - 1].x + (stroke[j].x - stroke[j - 1].x) * frac,
					y: stroke[j - 1].y + (stroke[j].y - stroke[j - 1].y) * frac,
				});
				break;
			}
			accumulated += segLen;
			if (j === stroke.length - 1) {
				result.push({ ...stroke[stroke.length - 1] });
			}
		}
	}
	return result;
}

/** Add random noise to a stroke. */
function addNoise(stroke: Stroke, maxOffset: number): Stroke {
	return stroke.map((pt) => ({
		x: Math.max(0, Math.min(1, pt.x + (Math.random() - 0.5) * maxOffset * 2)),
		y: Math.max(0, Math.min(1, pt.y + (Math.random() - 0.5) * maxOffset * 2)),
	}));
}

// ─── Resample Tests ───

describe("resampleStroke", () => {
	test("resamples a straight line to N equidistant points", () => {
		const line: Stroke = [
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
		];
		const resampled = resampleStroke(line, 5);
		expect(resampled.length).toBe(5);
		// Points should be evenly spaced along x
		expect(resampled[0].x).toBeCloseTo(0, 1);
		expect(resampled[2].x).toBeCloseTo(0.5, 1);
		expect(resampled[4].x).toBeCloseTo(1, 1);
	});

	test("handles single-segment diagonal", () => {
		const diag: Stroke = [
			{ x: 0, y: 0 },
			{ x: 1, y: 1 },
		];
		const resampled = resampleStroke(diag, 3);
		expect(resampled.length).toBe(3);
		expect(resampled[1].x).toBeCloseTo(0.5, 1);
		expect(resampled[1].y).toBeCloseTo(0.5, 1);
	});

	test("returns empty for single-point stroke", () => {
		const single: Stroke = [{ x: 0.5, y: 0.5 }];
		const resampled = resampleStroke(single);
		expect(resampled.length).toBe(0);
	});

	test("preserves multi-segment paths", () => {
		const zigzag: Stroke = [
			{ x: 0, y: 0 },
			{ x: 0.5, y: 1 },
			{ x: 1, y: 0 },
		];
		const resampled = resampleStroke(zigzag, 10);
		expect(resampled.length).toBe(10);
		// First and last should be near start/end
		expect(resampled[0].x).toBeCloseTo(0, 1);
		expect(resampled[9].x).toBeCloseTo(1, 1);
	});
});

// ─── Single Stroke Scoring ───

describe("scoreStroke", () => {
	test("perfect trace scores close to 1", () => {
		const canonical: Stroke = [
			{ x: 0.5, y: 0 },
			{ x: 0.5, y: 1 },
		];
		const player = tracePerfect(canonical, 25);
		const score = scoreStroke(player, canonical, TOUCH_THRESHOLD);
		expect(score).toBeGreaterThan(0.9);
	});

	test("reversed trace also scores high", () => {
		const canonical: Stroke = [
			{ x: 0.5, y: 0 },
			{ x: 0.5, y: 1 },
		];
		// Draw bottom-to-top
		const player = tracePerfect(
			[
				{ x: 0.5, y: 1 },
				{ x: 0.5, y: 0 },
			],
			25,
		);
		const score = scoreStroke(player, canonical, TOUCH_THRESHOLD);
		expect(score).toBeGreaterThan(0.9);
	});

	test("completely wrong direction scores low", () => {
		const canonical: Stroke = [
			{ x: 0.5, y: 0 },
			{ x: 0.5, y: 1 },
		];
		// Draw horizontally instead of vertically
		const player = tracePerfect(
			[
				{ x: 0, y: 0.5 },
				{ x: 1, y: 0.5 },
			],
			25,
		);
		const score = scoreStroke(player, canonical, TOUCH_THRESHOLD);
		expect(score).toBeLessThan(0.3);
	});

	test("slightly noisy trace still passes", () => {
		const canonical: Stroke = [
			{ x: 0.3, y: 0 },
			{ x: 0.3, y: 1 },
		];
		const perfect = tracePerfect(canonical, 25);
		const noisy = addNoise(perfect, 0.02);
		const score = scoreStroke(noisy, canonical, TOUCH_THRESHOLD);
		expect(score).toBeGreaterThan(0.7);
	});

	test("mouse threshold is tighter than touch", () => {
		const canonical: Stroke = [
			{ x: 0.5, y: 0 },
			{ x: 0.5, y: 1 },
		];
		const imperfect = tracePerfect(canonical, 25).map((pt) => ({
			x: pt.x + 0.05,
			y: pt.y,
		}));
		const touchScore = scoreStroke(imperfect, canonical, TOUCH_THRESHOLD);
		const mouseScore = scoreStroke(imperfect, canonical, MOUSE_THRESHOLD);
		// Same drawing should score better on touch than mouse
		expect(touchScore).toBeGreaterThan(mouseScore);
	});
});

// ─── Multi-Stroke Glyph Matching ───

describe("matchGlyph", () => {
	test("perfect trace of Isa (1 stroke) passes", () => {
		const glyph = getGlyph(6); // Isa
		const player = [tracePerfect(glyph.strokes[0], 25)];
		const result = matchGlyph(player, glyph);
		expect(result.pass).toBe(true);
		expect(result.score).toBeGreaterThan(0.8);
		expect(result.strokeScores.length).toBe(1);
	});

	test("perfect trace of Naudiz (2 strokes) passes", () => {
		const glyph = getGlyph(12); // Naudiz
		const player = glyph.strokes.map((s) => tracePerfect(s, 25));
		const result = matchGlyph(player, glyph);
		expect(result.pass).toBe(true);
		expect(result.score).toBeGreaterThan(0.8);
		expect(result.strokeScores.length).toBe(2);
	});

	test("perfect trace of Fehu (3 strokes) passes", () => {
		const glyph = getGlyph(1); // Fehu
		const player = glyph.strokes.map((s) => tracePerfect(s, 25));
		const result = matchGlyph(player, glyph);
		expect(result.pass).toBe(true);
		expect(result.score).toBeGreaterThan(0.8);
	});

	test("permuted stroke order still matches", () => {
		const glyph = getGlyph(12); // Naudiz (2 strokes)
		// Draw strokes in reverse order
		const player = [...glyph.strokes].reverse().map((s) => tracePerfect(s, 25));
		const result = matchGlyph(player, glyph);
		expect(result.pass).toBe(true);
		expect(result.score).toBeGreaterThan(0.7);
	});

	test("wrong stroke count fails", () => {
		const glyph = getGlyph(6); // Isa (1 stroke)
		const player = [
			tracePerfect(glyph.strokes[0], 25),
			tracePerfect(glyph.strokes[0], 25), // extra
		];
		const result = matchGlyph(player, glyph);
		expect(result.pass).toBe(false);
		expect(result.score).toBe(0);
	});

	test("strokes below MIN_RAW_POINTS are filtered out", () => {
		const glyph = getGlyph(6); // Isa
		// Only 3 points — below minimum
		const shortStroke: Stroke = [
			{ x: 0.5, y: 0 },
			{ x: 0.5, y: 0.5 },
			{ x: 0.5, y: 1 },
		];
		expect(shortStroke.length).toBeLessThan(MIN_RAW_POINTS);
		const result = matchGlyph([shortStroke], glyph);
		expect(result.pass).toBe(false);
	});

	test("Mannaz (4 strokes) — perfect trace passes", () => {
		const glyph = getGlyph(11); // Mannaz
		expect(glyph.strokes.length).toBe(4);
		const player = glyph.strokes.map((s) => tracePerfect(s, 25));
		const result = matchGlyph(player, glyph);
		expect(result.pass).toBe(true);
		expect(result.score).toBeGreaterThan(0.7);
	});
});

// ─── Best Match (Free-Draw) ───

describe("findBestMatch", () => {
	test("identifies correct glyph from candidates", () => {
		const isa = getGlyph(6);
		const naudiz = getGlyph(12);
		const player = [tracePerfect(isa.strokes[0], 25)];
		const match = findBestMatch(player, [isa, naudiz]);
		expect(match).not.toBeNull();
		expect(match?.glyph.runeId).toBe(6); // Isa
	});

	test("returns null when nothing passes", () => {
		const isa = getGlyph(6);
		// Draw a circle (nothing like Isa)
		const circle: Stroke = [];
		for (let i = 0; i < 30; i++) {
			const t = (i / 30) * Math.PI * 2;
			circle.push({ x: 0.5 + 0.4 * Math.cos(t), y: 0.5 + 0.4 * Math.sin(t) });
		}
		const match = findBestMatch([circle], [isa]);
		expect(match).toBeNull();
	});
});
