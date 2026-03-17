import { describe, expect, test } from "vitest";
import { RuneId } from "../ecs/systems/rune-data.ts";
import { Face } from "../ecs/systems/rune-data.ts";
import {
	computeFaceUV,
	glyphToFaceCoords,
	type FaceGlyphData,
} from "./rune-face-renderer.ts";

describe("rune-face-renderer", () => {
	describe("computeFaceUV", () => {
		test("PosX face: returns valid UV rect", () => {
			const uv = computeFaceUV(5, 10, 15, Face.PosX);
			expect(uv.u0).toBeGreaterThanOrEqual(0);
			expect(uv.v0).toBeGreaterThanOrEqual(0);
			expect(uv.u1).toBeGreaterThan(uv.u0);
			expect(uv.v1).toBeGreaterThan(uv.v0);
		});

		test("all faces produce non-degenerate UV rects", () => {
			for (let face = 0; face < 6; face++) {
				const uv = computeFaceUV(0, 0, 0, face);
				const width = uv.u1 - uv.u0;
				const height = uv.v1 - uv.v0;
				expect(width, `face ${face} has zero UV width`).toBeGreaterThan(0);
				expect(height, `face ${face} has zero UV height`).toBeGreaterThan(0);
			}
		});

		test("different blocks produce different UV origins", () => {
			const a = computeFaceUV(0, 0, 0, Face.PosX);
			const b = computeFaceUV(1, 0, 0, Face.PosX);
			// Different blocks should have different face centers
			expect(a.centerX).not.toBeCloseTo(b.centerX, 0);
		});
	});

	describe("glyphToFaceCoords", () => {
		test("converts glyph strokes to face-local coordinates", () => {
			const data = glyphToFaceCoords(RuneId.Isa, Face.PosX, 5, 10, 15);
			expect(data).not.toBeNull();
			expect(data!.runeId).toBe(RuneId.Isa);
			expect(data!.strokes.length).toBeGreaterThan(0);
		});

		test("returns null for RuneId.None", () => {
			const data = glyphToFaceCoords(0, Face.PosX, 5, 10, 15);
			expect(data).toBeNull();
		});

		test("Isa glyph has 1 stroke in face coords", () => {
			const data = glyphToFaceCoords(RuneId.Isa, Face.PosX, 0, 0, 0);
			expect(data).not.toBeNull();
			expect(data!.strokes.length).toBe(1);
		});

		test("Fehu glyph has 3 strokes in face coords", () => {
			const data = glyphToFaceCoords(RuneId.Fehu, Face.PosY, 0, 0, 0);
			expect(data).not.toBeNull();
			expect(data!.strokes.length).toBe(3);
		});

		test("face coords are in world space near the block", () => {
			const data = glyphToFaceCoords(RuneId.Isa, Face.PosX, 10, 20, 30);
			expect(data).not.toBeNull();
			for (const stroke of data!.strokes) {
				for (const pt of stroke) {
					// Points should be near the block position
					expect(pt.x).toBeGreaterThan(9);
					expect(pt.x).toBeLessThan(12);
					expect(pt.y).toBeGreaterThan(19);
					expect(pt.y).toBeLessThan(22);
					expect(pt.z).toBeGreaterThan(29);
					expect(pt.z).toBeLessThan(32);
				}
			}
		});

		test("PosX face: glyph X coords are on the face plane", () => {
			const data = glyphToFaceCoords(RuneId.Isa, Face.PosX, 5, 10, 15);
			expect(data).not.toBeNull();
			for (const stroke of data!.strokes) {
				for (const pt of stroke) {
					// PosX face is at x = blockX + 1, glyph slightly offset
					expect(pt.x).toBeCloseTo(6.01, 1);
				}
			}
		});
	});
});
