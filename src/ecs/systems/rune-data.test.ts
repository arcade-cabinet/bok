import { describe, expect, it } from "vitest";
import {
	CHISEL_ITEM_ID,
	FACE_COUNT,
	Face,
	getRuneColor,
	getRuneDef,
	PLACEABLE_RUNES,
	packFaceKey,
	RUNES,
	RuneId,
	unpackFaceKey,
} from "./rune-data.ts";

describe("rune-data", () => {
	describe("RuneId constants", () => {
		it("None is 0", () => {
			expect(RuneId.None).toBe(0);
		});

		it("has 15 placeable runes", () => {
			expect(PLACEABLE_RUNES).toHaveLength(15);
		});

		it("placeable runes exclude None", () => {
			expect(PLACEABLE_RUNES).not.toContain(RuneId.None);
		});
	});

	describe("Face constants", () => {
		it("has 6 faces", () => {
			expect(FACE_COUNT).toBe(6);
		});

		it("face indices are 0-5", () => {
			expect(Face.PosX).toBe(0);
			expect(Face.NegX).toBe(1);
			expect(Face.PosY).toBe(2);
			expect(Face.NegY).toBe(3);
			expect(Face.PosZ).toBe(4);
			expect(Face.NegZ).toBe(5);
		});
	});

	describe("getRuneDef", () => {
		it("returns definition for valid rune", () => {
			const def = getRuneDef(RuneId.Fehu);
			expect(def).toBeDefined();
			expect(def?.name).toBe("Fehu");
			expect(def?.glyph).toBe("\u16A0");
		});

		it("returns undefined for None", () => {
			expect(getRuneDef(RuneId.None)).toBeUndefined();
		});

		it("returns undefined for invalid ID", () => {
			expect(getRuneDef(999)).toBeUndefined();
		});

		it("every placeable rune has a definition", () => {
			for (const id of PLACEABLE_RUNES) {
				expect(RUNES[id]).toBeDefined();
				expect(RUNES[id].name).toBeTruthy();
				expect(RUNES[id].glyph).toBeTruthy();
				expect(RUNES[id].color).toBeTruthy();
			}
		});
	});

	describe("getRuneColor", () => {
		it("returns color for valid rune", () => {
			expect(getRuneColor(RuneId.Fehu)).toBe("#FFD700");
		});

		it("returns null for None", () => {
			expect(getRuneColor(RuneId.None)).toBeNull();
		});
	});

	describe("packFaceKey / unpackFaceKey", () => {
		it("round-trips positive coordinates", () => {
			const key = packFaceKey(10, 20, 30);
			const unpacked = unpackFaceKey(key);
			expect(unpacked).toEqual({ x: 10, y: 20, z: 30 });
		});

		it("round-trips negative coordinates", () => {
			const key = packFaceKey(-5, -10, -15);
			const unpacked = unpackFaceKey(key);
			expect(unpacked).toEqual({ x: -5, y: -10, z: -15 });
		});

		it("round-trips origin", () => {
			const key = packFaceKey(0, 0, 0);
			expect(unpackFaceKey(key)).toEqual({ x: 0, y: 0, z: 0 });
		});
	});

	describe("CHISEL_ITEM_ID", () => {
		it("is 110", () => {
			expect(CHISEL_ITEM_ID).toBe(110);
		});
	});
});
