import { describe, expect, test } from "vitest";
import { PLACEABLE_RUNES } from "../../ecs/systems/rune-data.ts";
import { GLYPH_COUNT, getAllGlyphs, getGlyph } from "./glyph-strokes.ts";

describe("glyph-strokes", () => {
	test("has a glyph for every placeable rune", () => {
		for (const runeId of PLACEABLE_RUNES) {
			const glyph = getGlyph(runeId);
			expect(glyph, `Missing glyph for rune ${runeId}`).toBeDefined();
			expect(glyph!.runeId).toBe(runeId);
		}
	});

	test("GLYPH_COUNT matches PLACEABLE_RUNES length", () => {
		expect(GLYPH_COUNT).toBe(PLACEABLE_RUNES.length);
	});

	test("getAllGlyphs returns all glyphs", () => {
		const all = getAllGlyphs();
		expect(all.length).toBe(GLYPH_COUNT);
	});

	test("every glyph has at least one stroke", () => {
		for (const glyph of getAllGlyphs()) {
			expect(glyph.strokes.length, `Rune ${glyph.runeId} has no strokes`).toBeGreaterThanOrEqual(1);
		}
	});

	test("no glyph has more than 4 strokes", () => {
		for (const glyph of getAllGlyphs()) {
			expect(glyph.strokes.length, `Rune ${glyph.runeId} exceeds 4 strokes`).toBeLessThanOrEqual(4);
		}
	});

	test("every stroke has at least 2 points", () => {
		for (const glyph of getAllGlyphs()) {
			for (let i = 0; i < glyph.strokes.length; i++) {
				const stroke = glyph.strokes[i];
				expect(stroke.length, `Rune ${glyph.runeId} stroke ${i} has fewer than 2 points`).toBeGreaterThanOrEqual(2);
			}
		}
	});

	test("all points are within [0, 1] bounds", () => {
		for (const glyph of getAllGlyphs()) {
			for (const stroke of glyph.strokes) {
				for (const pt of stroke) {
					expect(pt.x, `Rune ${glyph.runeId} has x=${pt.x} out of bounds`).toBeGreaterThanOrEqual(0);
					expect(pt.x, `Rune ${glyph.runeId} has x=${pt.x} out of bounds`).toBeLessThanOrEqual(1);
					expect(pt.y, `Rune ${glyph.runeId} has y=${pt.y} out of bounds`).toBeGreaterThanOrEqual(0);
					expect(pt.y, `Rune ${glyph.runeId} has y=${pt.y} out of bounds`).toBeLessThanOrEqual(1);
				}
			}
		}
	});

	test("Isa has exactly 1 stroke (simplest rune)", () => {
		const isa = getGlyph(6); // RuneId.Isa = 6
		expect(isa).toBeDefined();
		expect(isa!.strokes.length).toBe(1);
	});

	test("Mannaz has exactly 4 strokes (most complex)", () => {
		const mannaz = getGlyph(11); // RuneId.Mannaz = 11
		expect(mannaz).toBeDefined();
		expect(mannaz!.strokes.length).toBe(4);
	});

	test("no duplicate rune IDs in glyph set", () => {
		const ids = getAllGlyphs().map((g) => g.runeId);
		const unique = new Set(ids);
		expect(unique.size).toBe(ids.length);
	});
});
