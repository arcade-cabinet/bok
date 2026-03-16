import { describe, expect, it } from "vitest";
import {
	CHUNK_LOD_MID_SQ,
	CHUNK_LOD_NEAR_SQ,
	ChunkLod,
	chunkDistanceSq,
	chunkLoadPriority,
	classifyChunkLod,
	shouldUnloadChunk,
} from "./chunk-lod.ts";

describe("chunk-lod", () => {
	describe("ChunkLod constants", () => {
		it("defines three LOD levels", () => {
			expect(ChunkLod.Near).toBe(0);
			expect(ChunkLod.Mid).toBe(1);
			expect(ChunkLod.Far).toBe(2);
		});

		it("near threshold is less than mid threshold", () => {
			expect(CHUNK_LOD_NEAR_SQ).toBeLessThan(CHUNK_LOD_MID_SQ);
		});
	});

	describe("classifyChunkLod", () => {
		it("classifies origin chunk as Near", () => {
			expect(classifyChunkLod(0)).toBe(ChunkLod.Near);
		});

		it("classifies adjacent chunk as Near (distSq=1)", () => {
			expect(classifyChunkLod(1)).toBe(ChunkLod.Near);
		});

		it("classifies distSq=2 as Mid", () => {
			expect(classifyChunkLod(2)).toBe(ChunkLod.Mid);
		});

		it("classifies distSq=4 as Mid (boundary)", () => {
			expect(classifyChunkLod(4)).toBe(ChunkLod.Mid);
		});

		it("classifies distSq=5 as Far", () => {
			expect(classifyChunkLod(5)).toBe(ChunkLod.Far);
		});

		it("classifies distSq=9 as Far", () => {
			expect(classifyChunkLod(9)).toBe(ChunkLod.Far);
		});
	});

	describe("chunkDistanceSq", () => {
		it("returns 0 for same chunk", () => {
			expect(chunkDistanceSq(5, 5, 5, 5)).toBe(0);
		});

		it("returns 1 for adjacent chunk", () => {
			expect(chunkDistanceSq(0, 0, 1, 0)).toBe(1);
			expect(chunkDistanceSq(0, 0, 0, 1)).toBe(1);
		});

		it("returns 2 for diagonal chunk", () => {
			expect(chunkDistanceSq(0, 0, 1, 1)).toBe(2);
		});

		it("handles negative chunk coordinates", () => {
			expect(chunkDistanceSq(-2, -3, -2, -3)).toBe(0);
			expect(chunkDistanceSq(0, 0, -1, -1)).toBe(2);
		});

		it("computes correct distance for far chunks", () => {
			expect(chunkDistanceSq(0, 0, 3, 4)).toBe(25);
		});
	});

	describe("chunkLoadPriority", () => {
		it("Near has highest priority (lowest value)", () => {
			expect(chunkLoadPriority(ChunkLod.Near)).toBe(0);
		});

		it("Mid has middle priority", () => {
			expect(chunkLoadPriority(ChunkLod.Mid)).toBe(1);
		});

		it("Far has lowest priority", () => {
			expect(chunkLoadPriority(ChunkLod.Far)).toBe(2);
		});

		it("priorities are ordered: Near < Mid < Far", () => {
			expect(chunkLoadPriority(ChunkLod.Near)).toBeLessThan(chunkLoadPriority(ChunkLod.Mid));
			expect(chunkLoadPriority(ChunkLod.Mid)).toBeLessThan(chunkLoadPriority(ChunkLod.Far));
		});
	});

	describe("shouldUnloadChunk", () => {
		it("returns false for nearby chunks", () => {
			expect(shouldUnloadChunk(5, 5, 5, 5, 3)).toBe(false);
			expect(shouldUnloadChunk(5, 5, 6, 6, 3)).toBe(false);
		});

		it("returns false for chunks at exact unload distance", () => {
			expect(shouldUnloadChunk(5, 5, 8, 5, 3)).toBe(false);
		});

		it("returns true for chunks beyond unload distance", () => {
			expect(shouldUnloadChunk(5, 5, 9, 5, 3)).toBe(true);
			expect(shouldUnloadChunk(5, 5, 5, 9, 3)).toBe(true);
		});

		it("handles negative coordinates", () => {
			expect(shouldUnloadChunk(0, 0, -4, 0, 3)).toBe(true);
			expect(shouldUnloadChunk(0, 0, -3, 0, 3)).toBe(false);
		});
	});
});
