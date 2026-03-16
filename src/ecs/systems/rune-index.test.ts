import { describe, expect, it } from "vitest";
import { Face } from "./rune-data.ts";
import { RuneIndex } from "./rune-index.ts";

function freshIndex(): RuneIndex {
	return new RuneIndex();
}

describe("RuneIndex", () => {
	describe("setRune / getRune", () => {
		it("stores and retrieves a rune on a specific face", () => {
			const idx = freshIndex();
			idx.setRune(10, 20, 30, Face.PosX, 1);
			expect(idx.getRune(10, 20, 30, Face.PosX)).toBe(1);
		});

		it("returns 0 for unset faces", () => {
			const idx = freshIndex();
			expect(idx.getRune(10, 20, 30, Face.PosX)).toBe(0);
		});

		it("overwrites existing rune", () => {
			const idx = freshIndex();
			idx.setRune(5, 5, 5, Face.NegZ, 2);
			idx.setRune(5, 5, 5, Face.NegZ, 3);
			expect(idx.getRune(5, 5, 5, Face.NegZ)).toBe(3);
		});

		it("setting runeId=0 removes the face entry", () => {
			const idx = freshIndex();
			idx.setRune(1, 2, 3, Face.PosY, 5);
			idx.setRune(1, 2, 3, Face.PosY, 0);
			expect(idx.getRune(1, 2, 3, Face.PosY)).toBe(0);
			expect(idx.size).toBe(0);
		});
	});

	describe("sparse face maps", () => {
		it("stores only inscribed faces, not all 6", () => {
			const idx = freshIndex();
			idx.setRune(0, 0, 0, Face.PosX, 1);
			idx.setRune(0, 0, 0, Face.NegZ, 2);

			const faces = idx.getBlockFaces(0, 0, 0);
			expect(faces).not.toBeNull();
			expect(faces?.size).toBe(2);
			expect(faces?.get(Face.PosX)).toBe(1);
			expect(faces?.get(Face.NegZ)).toBe(2);
			// Other faces are not stored at all
			expect(faces?.has(Face.PosY)).toBe(false);
		});

		it("size counts only inscribed faces", () => {
			const idx = freshIndex();
			idx.setRune(0, 0, 0, Face.PosX, 1);
			idx.setRune(0, 0, 0, Face.NegX, 2);
			idx.setRune(10, 10, 10, Face.PosZ, 3);
			expect(idx.size).toBe(3);
		});
	});

	describe("removeRune", () => {
		it("removes a single face rune", () => {
			const idx = freshIndex();
			idx.setRune(5, 5, 5, Face.PosX, 1);
			idx.setRune(5, 5, 5, Face.NegX, 2);
			idx.removeRune(5, 5, 5, Face.PosX);
			expect(idx.getRune(5, 5, 5, Face.PosX)).toBe(0);
			expect(idx.getRune(5, 5, 5, Face.NegX)).toBe(2);
		});

		it("cleans up empty voxel and chunk entries", () => {
			const idx = freshIndex();
			idx.setRune(5, 5, 5, Face.PosX, 1);
			idx.removeRune(5, 5, 5, Face.PosX);
			expect(idx.size).toBe(0);
			expect(idx.getBlockFaces(5, 5, 5)).toBeNull();
		});
	});

	describe("removeBlock", () => {
		it("removes all runes from a block", () => {
			const idx = freshIndex();
			idx.setRune(3, 4, 5, Face.PosX, 1);
			idx.setRune(3, 4, 5, Face.NegY, 3);
			idx.setRune(3, 4, 5, Face.PosZ, 5);
			idx.removeBlock(3, 4, 5);
			expect(idx.getRune(3, 4, 5, Face.PosX)).toBe(0);
			expect(idx.getRune(3, 4, 5, Face.NegY)).toBe(0);
			expect(idx.getRune(3, 4, 5, Face.PosZ)).toBe(0);
			expect(idx.size).toBe(0);
		});

		it("does not affect other blocks", () => {
			const idx = freshIndex();
			idx.setRune(0, 0, 0, Face.PosX, 1);
			idx.setRune(1, 0, 0, Face.PosX, 2);
			idx.removeBlock(0, 0, 0);
			expect(idx.getRune(1, 0, 0, Face.PosX)).toBe(2);
		});

		it("is a no-op for blocks without runes", () => {
			const idx = freshIndex();
			idx.removeBlock(99, 99, 99); // should not throw
			expect(idx.size).toBe(0);
		});
	});

	describe("hasRunes", () => {
		it("returns true when block has inscriptions", () => {
			const idx = freshIndex();
			idx.setRune(1, 2, 3, Face.PosX, 5);
			expect(idx.hasRunes(1, 2, 3)).toBe(true);
		});

		it("returns false when block has no inscriptions", () => {
			const idx = freshIndex();
			expect(idx.hasRunes(1, 2, 3)).toBe(false);
		});
	});

	describe("getChunkRunes", () => {
		it("returns all inscribed blocks in a chunk", () => {
			const idx = freshIndex();
			// Both at chunk (0,0) since x=0..15, z=0..15 all map to chunk 0,0
			idx.setRune(0, 5, 0, Face.PosX, 1);
			idx.setRune(8, 10, 8, Face.NegZ, 2);

			const chunkRunes = idx.getChunkRunes(0, 0);
			expect(chunkRunes).not.toBeNull();
			expect(chunkRunes?.size).toBe(2);
		});

		it("returns null for chunks without runes", () => {
			const idx = freshIndex();
			expect(idx.getChunkRunes(99, 99)).toBeNull();
		});

		it("separates runes by chunk correctly", () => {
			const idx = freshIndex();
			// Chunk (0,0): x=0..15
			idx.setRune(5, 5, 5, Face.PosX, 1);
			// Chunk (1,0): x=16..31
			idx.setRune(20, 5, 5, Face.PosX, 2);

			expect(idx.getChunkRunes(0, 0)?.size).toBe(1);
			expect(idx.getChunkRunes(1, 0)?.size).toBe(1);
		});
	});

	describe("negative coordinates", () => {
		it("handles negative block positions", () => {
			const idx = freshIndex();
			idx.setRune(-10, 5, -20, Face.NegX, 4);
			expect(idx.getRune(-10, 5, -20, Face.NegX)).toBe(4);
		});

		it("maps negative coords to correct chunk", () => {
			const idx = freshIndex();
			// x=-1 -> chunk -1, z=-1 -> chunk -1
			idx.setRune(-1, 0, -1, Face.PosY, 3);
			expect(idx.getChunkRunes(-1, -1)).not.toBeNull();
			expect(idx.getChunkRunes(0, 0)).toBeNull();
		});
	});

	describe("persistence round-trip", () => {
		it("getAllEntries returns all stored runes", () => {
			const idx = freshIndex();
			idx.setRune(1, 2, 3, Face.PosX, 1);
			idx.setRune(1, 2, 3, Face.NegZ, 5);
			idx.setRune(10, 20, 30, Face.PosY, 3);

			const entries = idx.getAllEntries();
			expect(entries).toHaveLength(3);

			// Verify each entry exists (order may vary)
			const found = new Set(entries.map((e) => `${e.x},${e.y},${e.z},${e.face},${e.runeId}`));
			expect(found.has("1,2,3,0,1")).toBe(true); // PosX=0
			expect(found.has("1,2,3,5,5")).toBe(true); // NegZ=5
			expect(found.has("10,20,30,2,3")).toBe(true); // PosY=2
		});

		it("loadEntries restores from getAllEntries", () => {
			const original = freshIndex();
			original.setRune(5, 10, 15, Face.PosX, 2);
			original.setRune(5, 10, 15, Face.NegY, 7);
			original.setRune(-3, 0, -7, Face.PosZ, 4);

			const entries = original.getAllEntries();

			const restored = freshIndex();
			restored.loadEntries(entries);

			expect(restored.getRune(5, 10, 15, Face.PosX)).toBe(2);
			expect(restored.getRune(5, 10, 15, Face.NegY)).toBe(7);
			expect(restored.getRune(-3, 0, -7, Face.PosZ)).toBe(4);
			expect(restored.size).toBe(original.size);
		});

		it("getAllEntries returns empty array for empty index", () => {
			const idx = freshIndex();
			expect(idx.getAllEntries()).toEqual([]);
		});
	});

	describe("clear", () => {
		it("removes all data", () => {
			const idx = freshIndex();
			idx.setRune(1, 2, 3, Face.PosX, 1);
			idx.setRune(10, 20, 30, Face.NegZ, 5);
			idx.clear();
			expect(idx.size).toBe(0);
			expect(idx.getRune(1, 2, 3, Face.PosX)).toBe(0);
		});
	});
});
