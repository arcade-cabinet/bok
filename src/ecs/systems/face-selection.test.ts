import { describe, expect, it } from "vitest";
import { computeFaceIndex, faceName, getInternalFaces, getVisibleFaces, isInternalFace } from "./face-selection.ts";
import { Face } from "./rune-data.ts";

describe("face-selection", () => {
	describe("computeFaceIndex", () => {
		it("returns PosX when prev is to the +x side", () => {
			expect(computeFaceIndex(5, 10, 15, 6, 10, 15)).toBe(Face.PosX);
		});

		it("returns NegX when prev is to the -x side", () => {
			expect(computeFaceIndex(5, 10, 15, 4, 10, 15)).toBe(Face.NegX);
		});

		it("returns PosY when prev is above", () => {
			expect(computeFaceIndex(5, 10, 15, 5, 11, 15)).toBe(Face.PosY);
		});

		it("returns NegY when prev is below", () => {
			expect(computeFaceIndex(5, 10, 15, 5, 9, 15)).toBe(Face.NegY);
		});

		it("returns PosZ when prev is to the +z side", () => {
			expect(computeFaceIndex(5, 10, 15, 5, 10, 16)).toBe(Face.PosZ);
		});

		it("returns NegZ when prev is to the -z side", () => {
			expect(computeFaceIndex(5, 10, 15, 5, 10, 14)).toBe(Face.NegZ);
		});

		it("returns -1 when positions are the same", () => {
			expect(computeFaceIndex(5, 10, 15, 5, 10, 15)).toBe(-1);
		});

		it("resolves diagonal to largest component", () => {
			// dx=2, dy=1, dz=0 → PosX wins
			expect(computeFaceIndex(5, 10, 15, 7, 11, 15)).toBe(Face.PosX);
		});
	});

	describe("isInternalFace", () => {
		const solidBlock = (x: number, y: number, z: number) => {
			// Block at (1,0,0) is solid, all others are air
			return x === 1 && y === 0 && z === 0;
		};

		it("returns true when neighbor on that face is solid", () => {
			// Block at (0,0,0), face PosX → neighbor at (1,0,0) is solid
			expect(isInternalFace(0, 0, 0, Face.PosX, solidBlock)).toBe(true);
		});

		it("returns false when neighbor is air", () => {
			// Block at (0,0,0), face NegX → neighbor at (-1,0,0) is air
			expect(isInternalFace(0, 0, 0, Face.NegX, solidBlock)).toBe(false);
		});

		it("checks correct direction for PosY", () => {
			const allSolid = () => true;
			expect(isInternalFace(0, 0, 0, Face.PosY, allSolid)).toBe(true);
		});

		it("returns false for all faces when isolated", () => {
			const noSolid = () => false;
			for (let i = 0; i < 6; i++) {
				expect(isInternalFace(0, 0, 0, i as 0 | 1 | 2 | 3 | 4 | 5, noSolid)).toBe(false);
			}
		});
	});

	describe("getVisibleFaces", () => {
		it("returns all 6 faces for isolated block", () => {
			const noSolid = () => false;
			const faces = getVisibleFaces(0, 0, 0, noSolid);
			expect(faces).toHaveLength(6);
		});

		it("excludes internal faces", () => {
			const solidOnPosX = (x: number, y: number, z: number) => x === 1 && y === 0 && z === 0;
			const faces = getVisibleFaces(0, 0, 0, solidOnPosX);
			expect(faces).toHaveLength(5);
			expect(faces).not.toContain(Face.PosX);
		});

		it("returns empty for fully enclosed block", () => {
			const allSolid = () => true;
			const faces = getVisibleFaces(0, 0, 0, allSolid);
			expect(faces).toHaveLength(0);
		});
	});

	describe("getInternalFaces", () => {
		it("returns empty for isolated block", () => {
			const noSolid = () => false;
			expect(getInternalFaces(0, 0, 0, noSolid)).toHaveLength(0);
		});

		it("returns all 6 for fully enclosed block", () => {
			const allSolid = () => true;
			expect(getInternalFaces(0, 0, 0, allSolid)).toHaveLength(6);
		});
	});

	describe("faceName", () => {
		it("returns correct names", () => {
			expect(faceName(Face.PosX)).toBe("+X");
			expect(faceName(Face.NegX)).toBe("-X");
			expect(faceName(Face.PosY)).toBe("+Y");
			expect(faceName(Face.NegY)).toBe("-Y");
			expect(faceName(Face.PosZ)).toBe("+Z");
			expect(faceName(Face.NegZ)).toBe("-Z");
		});
	});
});
