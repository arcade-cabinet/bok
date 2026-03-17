/**
 * Greedy voxel mesher — unit tests (TDD: written FIRST).
 *
 * Tests cover: single block, same-type merging, different-type separation,
 * air faces, internal face culling, and rune-aware face splitting.
 */

import { describe, expect, test } from "vitest";
import { type ChunkAccessor, FaceDir, greedyMesh, type MesherQuad } from "./greedy-mesher.ts";

const W = 16; // chunk width/depth
const H = 32; // chunk height

/** Helper: create a flat chunk data array (W × H × W). */
function makeChunk(): Uint16Array {
	return new Uint16Array(W * H * W);
}

/** Helper: index into flat chunk array. */
function idx(x: number, y: number, z: number): number {
	return x + z * W + y * W * W;
}

/** Helper: create accessor from flat array with no cross-chunk neighbors. */
function accessor(data: Uint16Array): ChunkAccessor {
	return (x, y, z) => {
		if (x < 0 || x >= W || y < 0 || y >= H || z < 0 || z >= W) return 0;
		return data[idx(x, y, z)];
	};
}

/** Count quads with a specific face direction. */
function countFace(quads: MesherQuad[], dir: FaceDir): number {
	return quads.filter((q) => q.face === dir).length;
}

describe("greedyMesh", () => {
	test("empty chunk produces no quads", () => {
		const chunk = makeChunk();
		const quads = greedyMesh(chunk, W, H, accessor(chunk));
		expect(quads).toHaveLength(0);
	});

	test("single block produces 6 quads", () => {
		const chunk = makeChunk();
		chunk[idx(5, 5, 5)] = 1; // one stone block
		const quads = greedyMesh(chunk, W, H, accessor(chunk));
		expect(quads).toHaveLength(6);
		// Each face direction should appear exactly once
		for (const dir of [FaceDir.PosX, FaceDir.NegX, FaceDir.PosY, FaceDir.NegY, FaceDir.PosZ, FaceDir.NegZ]) {
			expect(countFace(quads, dir)).toBe(1);
		}
		// All quads should be 1×1
		for (const q of quads) {
			expect(q.w).toBe(1);
			expect(q.h).toBe(1);
			expect(q.blockId).toBe(1);
		}
	});

	test("two adjacent same-type blocks merge on shared axis", () => {
		const chunk = makeChunk();
		// Two stone blocks side by side on X axis
		chunk[idx(5, 5, 5)] = 1;
		chunk[idx(6, 5, 5)] = 1;
		const quads = greedyMesh(chunk, W, H, accessor(chunk));

		// Top and bottom faces should merge into 2×1 quads
		const topQuads = quads.filter((q) => q.face === FaceDir.PosY);
		expect(topQuads).toHaveLength(1);
		expect(topQuads[0].w).toBe(2);
		expect(topQuads[0].h).toBe(1);

		// Internal faces between the two blocks should be culled
		// Total: top(1) + bottom(1) + front(1 merged) + back(1 merged) + left(1) + right(1) = 6
		// The +X face of block(5,5,5) and -X face of block(6,5,5) are internal → culled
		expect(quads.length).toBeLessThan(12); // Less than 2 separate blocks would give
	});

	test("different block types are NOT merged", () => {
		const chunk = makeChunk();
		chunk[idx(5, 5, 5)] = 1; // stone
		chunk[idx(6, 5, 5)] = 2; // dirt
		const quads = greedyMesh(chunk, W, H, accessor(chunk));

		// Top faces should NOT merge (different block types)
		const topQuads = quads.filter((q) => q.face === FaceDir.PosY);
		expect(topQuads).toHaveLength(2);
		expect(topQuads.map((q) => q.blockId).sort()).toEqual([1, 2]);
	});

	test("internal faces between solid blocks are culled", () => {
		const chunk = makeChunk();
		// 2×2×2 solid cube
		for (let x = 5; x <= 6; x++) for (let y = 5; y <= 6; y++) for (let z = 5; z <= 6; z++) chunk[idx(x, y, z)] = 1;

		const quads = greedyMesh(chunk, W, H, accessor(chunk));
		// 2×2×2 cube should have 6 faces × 1 merged quad each = 6 quads
		expect(quads).toHaveLength(6);
		for (const q of quads) {
			expect(q.w).toBe(2);
			expect(q.h).toBe(2);
		}
	});

	test("air blocks (0) produce no faces", () => {
		const chunk = makeChunk();
		// Explicitly setting air (already 0 by default, but be explicit)
		chunk[idx(5, 5, 5)] = 0;
		const quads = greedyMesh(chunk, W, H, accessor(chunk));
		expect(quads).toHaveLength(0);
	});

	test("block at chunk edge has exposed face", () => {
		const chunk = makeChunk();
		chunk[idx(0, 5, 0)] = 1; // corner block
		const quads = greedyMesh(chunk, W, H, accessor(chunk));
		// Should have 6 exposed faces (all neighbors are air/out of chunk)
		expect(quads).toHaveLength(6);
	});

	test("L-shaped arrangement does not over-merge", () => {
		const chunk = makeChunk();
		// L-shape: 3 blocks in a row, plus 1 off to the side
		chunk[idx(5, 5, 5)] = 1;
		chunk[idx(6, 5, 5)] = 1;
		chunk[idx(7, 5, 5)] = 1;
		chunk[idx(5, 5, 6)] = 1;
		const quads = greedyMesh(chunk, W, H, accessor(chunk));

		// Top face: cannot be 1 big quad (L-shape), should be 2 rectangles
		const topQuads = quads.filter((q) => q.face === FaceDir.PosY);
		expect(topQuads.length).toBeGreaterThanOrEqual(2);
	});

	test("rune-aware: inscribed face is NOT merged", () => {
		const chunk = makeChunk();
		// 3×1 row of same block
		chunk[idx(5, 5, 5)] = 1;
		chunk[idx(6, 5, 5)] = 1;
		chunk[idx(7, 5, 5)] = 1;

		// Mark the +Z face of block (6,5,5) as rune-inscribed
		const runeFaces = new Set<string>();
		runeFaces.add("6,5,5,4"); // face 4 = PosZ

		const quads = greedyMesh(chunk, W, H, accessor(chunk), runeFaces);
		// The +Z face row should split: block 5 alone, block 6 alone (rune), block 7 alone
		const posZQuads = quads.filter((q) => q.face === FaceDir.PosZ);
		const runeQuad = posZQuads.find((q) => q.x === 6 && q.y === 5 && q.z === 5);
		expect(runeQuad).toBeDefined();
		expect(runeQuad?.w).toBe(1);
		expect(runeQuad?.h).toBe(1);
	});

	test("quad positions are in world-local chunk coordinates", () => {
		const chunk = makeChunk();
		chunk[idx(3, 7, 9)] = 5;
		const quads = greedyMesh(chunk, W, H, accessor(chunk));
		const posYQuad = quads.find((q) => q.face === FaceDir.PosY);
		expect(posYQuad).toBeDefined();
		expect(posYQuad?.x).toBe(3);
		expect(posYQuad?.y).toBe(7);
		expect(posYQuad?.z).toBe(9);
	});

	test("large flat layer merges efficiently", () => {
		const chunk = makeChunk();
		// Fill entire bottom layer with stone
		for (let x = 0; x < W; x++) for (let z = 0; z < W; z++) chunk[idx(x, 0, z)] = 1;

		const quads = greedyMesh(chunk, W, H, accessor(chunk));
		// Top face should merge into 1 large 16×16 quad
		const topQuads = quads.filter((q) => q.face === FaceDir.PosY);
		expect(topQuads).toHaveLength(1);
		expect(topQuads[0].w).toBe(W);
		expect(topQuads[0].h).toBe(W);
	});
});
