// ─── Glyph Strokes ───
// Canonical stroke paths for all 15 Elder Futhark runes.
// Each rune is defined as an array of strokes in [0,1]² normalized space.
// A stroke is an ordered array of {x, y} points defining the draw path.
// No ECS, no Three.js — pure geometry data.

import type { RuneIdValue } from "../../ecs/systems/rune-data.ts";
import { RuneId } from "../../ecs/systems/rune-data.ts";

/** A single point in normalized [0,1]² space. */
export interface StrokePoint {
	x: number;
	y: number;
}

/** A stroke is an ordered sequence of points the player traces. */
export type Stroke = StrokePoint[];

/** A glyph is 1–4 strokes that together form the rune shape. */
export interface GlyphDef {
	/** Rune ID this glyph represents. */
	runeId: RuneIdValue;
	/** Ordered strokes. Player draws each in sequence. */
	strokes: Stroke[];
}

// ─── Canonical Glyph Definitions ───
// Coordinates: x=0 left, x=1 right, y=0 top, y=1 bottom.
// Designed for natural top-to-bottom, left-to-right drawing.

/** ᚠ Fehu — vertical stave + two upward branches (like F). */
const FEHU: GlyphDef = {
	runeId: RuneId.Fehu,
	strokes: [
		[
			{ x: 0.3, y: 0 },
			{ x: 0.3, y: 1 },
		],
		[
			{ x: 0.3, y: 0.15 },
			{ x: 0.8, y: 0.0 },
		],
		[
			{ x: 0.3, y: 0.4 },
			{ x: 0.7, y: 0.25 },
		],
	],
};

/** ᚢ Uruz — down-stroke left, across bottom, up-stroke right (like ∩ inverted). */
const URUZ: GlyphDef = {
	runeId: RuneId.Uruz,
	strokes: [
		[
			{ x: 0.2, y: 0 },
			{ x: 0.2, y: 1 },
		],
		[
			{ x: 0.2, y: 1 },
			{ x: 0.8, y: 1 },
		],
		[
			{ x: 0.8, y: 1 },
			{ x: 0.8, y: 0.3 },
		],
	],
};

/** ᚦ Thurisaz — vertical stave + thorn pointing right (like Þ/P). */
const THURISAZ: GlyphDef = {
	runeId: RuneId.Thurisaz,
	strokes: [
		[
			{ x: 0.25, y: 0 },
			{ x: 0.25, y: 1 },
		],
		[
			{ x: 0.25, y: 0.2 },
			{ x: 0.75, y: 0.4 },
			{ x: 0.25, y: 0.6 },
		],
	],
};

/** ᚨ Ansuz — vertical stave + two branches angling down-right (like ᚨ). */
const ANSUZ: GlyphDef = {
	runeId: RuneId.Ansuz,
	strokes: [
		[
			{ x: 0.3, y: 0 },
			{ x: 0.3, y: 1 },
		],
		[
			{ x: 0.3, y: 0.2 },
			{ x: 0.75, y: 0.4 },
		],
		[
			{ x: 0.3, y: 0.4 },
			{ x: 0.75, y: 0.6 },
		],
	],
};

/** ᚲ Kenaz — two diagonal lines meeting at a point (like <). */
const KENAZ: GlyphDef = {
	runeId: RuneId.Kenaz,
	strokes: [
		[
			{ x: 0.75, y: 0.1 },
			{ x: 0.25, y: 0.5 },
		],
		[
			{ x: 0.25, y: 0.5 },
			{ x: 0.75, y: 0.9 },
		],
	],
};

/** ᛁ Isa — single vertical line. */
const ISA: GlyphDef = {
	runeId: RuneId.Isa,
	strokes: [
		[
			{ x: 0.5, y: 0.05 },
			{ x: 0.5, y: 0.95 },
		],
	],
};

/** ᛒ Berkanan — vertical stave + two bumps right (like B). */
const BERKANAN: GlyphDef = {
	runeId: RuneId.Berkanan,
	strokes: [
		[
			{ x: 0.25, y: 0 },
			{ x: 0.25, y: 1 },
		],
		[
			{ x: 0.25, y: 0.0 },
			{ x: 0.7, y: 0.25 },
			{ x: 0.25, y: 0.5 },
		],
		[
			{ x: 0.25, y: 0.5 },
			{ x: 0.7, y: 0.75 },
			{ x: 0.25, y: 1.0 },
		],
	],
};

/** ᛉ Algiz — vertical stave + two upward branches (like ᛉ / Y-fork). */
const ALGIZ: GlyphDef = {
	runeId: RuneId.Algiz,
	strokes: [
		[
			{ x: 0.5, y: 1 },
			{ x: 0.5, y: 0.35 },
		],
		[
			{ x: 0.5, y: 0.35 },
			{ x: 0.15, y: 0.0 },
		],
		[
			{ x: 0.5, y: 0.35 },
			{ x: 0.85, y: 0.0 },
		],
	],
};

/** ᛊ Sowilo — zigzag lightning bolt (like S/Z). */
const SOWILO: GlyphDef = {
	runeId: RuneId.Sowilo,
	strokes: [
		[
			{ x: 0.7, y: 0.1 },
			{ x: 0.25, y: 0.35 },
			{ x: 0.75, y: 0.65 },
			{ x: 0.3, y: 0.9 },
		],
	],
};

/** ᛃ Jera — two interlocking angular shapes (like ᛃ). */
const JERA: GlyphDef = {
	runeId: RuneId.Jera,
	strokes: [
		[
			{ x: 0.5, y: 0.0 },
			{ x: 0.15, y: 0.25 },
			{ x: 0.5, y: 0.5 },
		],
		[
			{ x: 0.5, y: 0.5 },
			{ x: 0.85, y: 0.75 },
			{ x: 0.5, y: 1.0 },
		],
	],
};

/** ᛗ Mannaz — two staves + X crossing (like M / ᛗ). */
const MANNAZ: GlyphDef = {
	runeId: RuneId.Mannaz,
	strokes: [
		[
			{ x: 0.2, y: 0 },
			{ x: 0.2, y: 1 },
		],
		[
			{ x: 0.8, y: 0 },
			{ x: 0.8, y: 1 },
		],
		[
			{ x: 0.2, y: 0.0 },
			{ x: 0.8, y: 0.5 },
		],
		[
			{ x: 0.8, y: 0.0 },
			{ x: 0.2, y: 0.5 },
		],
	],
};

/** ᚾ Naudiz — vertical stave + diagonal cross bar (like ᚾ). */
const NAUDIZ: GlyphDef = {
	runeId: RuneId.Naudiz,
	strokes: [
		[
			{ x: 0.5, y: 0 },
			{ x: 0.5, y: 1 },
		],
		[
			{ x: 0.2, y: 0.65 },
			{ x: 0.8, y: 0.35 },
		],
	],
};

/** ᚺ Hagalaz — two vertical staves + diagonal connector (like H). */
const HAGALAZ: GlyphDef = {
	runeId: RuneId.Hagalaz,
	strokes: [
		[
			{ x: 0.25, y: 0 },
			{ x: 0.25, y: 1 },
		],
		[
			{ x: 0.75, y: 0 },
			{ x: 0.75, y: 1 },
		],
		[
			{ x: 0.25, y: 0.6 },
			{ x: 0.75, y: 0.4 },
		],
	],
};

/** ᚱ Raido — vertical stave + angular branch right (like R). */
const RAIDO: GlyphDef = {
	runeId: RuneId.Raido,
	strokes: [
		[
			{ x: 0.25, y: 0 },
			{ x: 0.25, y: 1 },
		],
		[
			{ x: 0.25, y: 0.0 },
			{ x: 0.7, y: 0.3 },
			{ x: 0.25, y: 0.5 },
		],
		[
			{ x: 0.45, y: 0.4 },
			{ x: 0.75, y: 0.9 },
		],
	],
};

/** ᛏ Tiwaz — upward arrow / T-shape (like ↑). */
const TIWAZ: GlyphDef = {
	runeId: RuneId.Tiwaz,
	strokes: [
		[
			{ x: 0.5, y: 0 },
			{ x: 0.5, y: 1 },
		],
		[
			{ x: 0.15, y: 0.35 },
			{ x: 0.5, y: 0.0 },
			{ x: 0.85, y: 0.35 },
		],
	],
};

// ─── Lookup Table ───

/** All glyph definitions indexed by RuneId. */
const GLYPH_MAP = new Map<RuneIdValue, GlyphDef>([
	[RuneId.Fehu, FEHU],
	[RuneId.Uruz, URUZ],
	[RuneId.Thurisaz, THURISAZ],
	[RuneId.Ansuz, ANSUZ],
	[RuneId.Kenaz, KENAZ],
	[RuneId.Isa, ISA],
	[RuneId.Berkanan, BERKANAN],
	[RuneId.Algiz, ALGIZ],
	[RuneId.Sowilo, SOWILO],
	[RuneId.Jera, JERA],
	[RuneId.Mannaz, MANNAZ],
	[RuneId.Naudiz, NAUDIZ],
	[RuneId.Hagalaz, HAGALAZ],
	[RuneId.Raido, RAIDO],
	[RuneId.Tiwaz, TIWAZ],
]);

/** Get the canonical glyph definition for a rune, or undefined for None. */
export function getGlyph(runeId: RuneIdValue): GlyphDef | undefined {
	return GLYPH_MAP.get(runeId);
}

/** Get all glyph definitions. */
export function getAllGlyphs(): GlyphDef[] {
	return [...GLYPH_MAP.values()];
}

/** Number of defined glyphs (should match PLACEABLE_RUNES length). */
export const GLYPH_COUNT = GLYPH_MAP.size;
