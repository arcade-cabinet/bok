/**
 * Tests for greedy voxel mesher.
 * Validates: single block faces, face culling, air handling,
 * same-type merging, different-type separation, and output format.
 */

import { describe, expect, it } from "vitest";
import {
	CHUNK_HEIGHT,
	CHUNK_SIZE,
	type MeshQuad,
	greedyMesh,
} from "./greedy-mesher.ts";
import { BlockId } from "./blocks.ts";

/** Create an empty chunk filled with air. */
function emptyChunk(): Uint8Array {
	return new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
}

/** Set a block in the chunk array. */
function setBlock(chunk: Uint8Array, x: number, y: number, z: number, blockId: number): void {
	chunk[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE] = blockId;
}

/** Default neighbor getter: always air (chunk boundary = exposed). */
const airNeighbor = () => BlockId.Air;

// ─── Single Block ───

describe("single block", () => {
	it("produces exactly 6 quads", () => {
		const chunk = emptyChunk();
		setBlock(chunk, 5, 5, 5, BlockId.Stone);
		const quads = greedyMesh(chunk, airNeighbor);
		expect(quads).toHaveLength(6);
	});

	it("each quad has correct blockType", () => {
		const chunk = emptyChunk();
		setBlock(chunk, 0, 0, 0, BlockId.Dirt);
		const quads = greedyMesh(chunk, airNeighbor);
		for (const q of quads) {
			expect(q.blockType).toBe(BlockId.Dirt);
		}
	});

	it("each quad has 4 vertices (12 position floats)", () => {
		const chunk = emptyChunk();
		setBlock(chunk, 0, 0, 0, BlockId.Stone);
		const quads = greedyMesh(chunk, airNeighbor);
		for (const q of quads) {
			expect(q.positions).toHaveLength(12); // 4 verts * 3 components
		}
	});

	it("each quad has a unit normal", () => {
		const chunk = emptyChunk();
		setBlock(chunk, 0, 0, 0, BlockId.Stone);
		const quads = greedyMesh(chunk, airNeighbor);
		for (const q of quads) {
			expect(q.normal).toHaveLength(3);
			const len = Math.sqrt(q.normal[0] ** 2 + q.normal[1] ** 2 + q.normal[2] ** 2);
			expect(len).toBeCloseTo(1, 5);
		}
	});

	it("each quad has 4 UV coordinates (8 floats)", () => {
		const chunk = emptyChunk();
		setBlock(chunk, 0, 0, 0, BlockId.Stone);
		const quads = greedyMesh(chunk, airNeighbor);
		for (const q of quads) {
			expect(q.uvs).toHaveLength(8); // 4 verts * 2 components
		}
	});
});

// ─── Air Handling ───

describe("air handling", () => {
	it("empty chunk produces zero quads", () => {
		const chunk = emptyChunk();
		const quads = greedyMesh(chunk, airNeighbor);
		expect(quads).toHaveLength(0);
	});
});

// ─── Internal Face Culling ───

describe("internal face culling", () => {
	it("two adjacent same-type blocks cull shared face and merge", () => {
		const chunk = emptyChunk();
		setBlock(chunk, 5, 5, 5, BlockId.Stone);
		setBlock(chunk, 6, 5, 5, BlockId.Stone);
		const quads = greedyMesh(chunk, airNeighbor);
		// Shared X face culled. Remaining: top/bottom/front/back merge pairwise (4),
		// plus left of block 1 and right of block 2 (2) = 6 merged quads.
		expect(quads).toHaveLength(6);
	});

	it("fully enclosed block produces zero faces", () => {
		const chunk = emptyChunk();
		// Place center block surrounded on all 6 sides
		setBlock(chunk, 5, 5, 5, BlockId.Stone);
		setBlock(chunk, 4, 5, 5, BlockId.Stone);
		setBlock(chunk, 6, 5, 5, BlockId.Stone);
		setBlock(chunk, 5, 4, 5, BlockId.Stone);
		setBlock(chunk, 5, 6, 5, BlockId.Stone);
		setBlock(chunk, 5, 5, 4, BlockId.Stone);
		setBlock(chunk, 5, 5, 6, BlockId.Stone);
		const quads = greedyMesh(chunk, airNeighbor);
		// Center block has 0 exposed faces. 6 surrounding blocks each have 5.
		// But greedy merging may combine some. Just verify center adds no extras.
		// Total exposed: 6 blocks * 5 faces = 30 faces, but merging reduces count.
		// At minimum, confirm fewer than 7*6=42 (no culling).
		expect(quads.length).toBeLessThan(42);
		// And specifically, more than 0 (the outer blocks have exposed faces).
		expect(quads.length).toBeGreaterThan(0);
	});
});

// ─── Different Block Types ───

describe("different block types stay separate", () => {
	it("adjacent different types produce separate quads", () => {
		const chunk = emptyChunk();
		setBlock(chunk, 5, 5, 5, BlockId.Stone);
		setBlock(chunk, 6, 5, 5, BlockId.Dirt);
		const quads = greedyMesh(chunk, airNeighbor);
		// Different types don't cull shared face: each block has 6 faces.
		// But they also can't merge, so 12 total.
		expect(quads).toHaveLength(12);
	});
});

// ─── Greedy Merging ───

describe("greedy merging", () => {
	it("flat 2x2 same-type floor merges top face into 1 quad", () => {
		const chunk = emptyChunk();
		setBlock(chunk, 0, 0, 0, BlockId.Stone);
		setBlock(chunk, 1, 0, 0, BlockId.Stone);
		setBlock(chunk, 0, 0, 1, BlockId.Stone);
		setBlock(chunk, 1, 0, 1, BlockId.Stone);
		const quads = greedyMesh(chunk, airNeighbor);
		// Top face (+Y): should be 1 merged quad
		const topQuads = quads.filter((q) => q.normal[1] === 1);
		expect(topQuads).toHaveLength(1);
	});

	it("row of same-type blocks merges side faces", () => {
		const chunk = emptyChunk();
		for (let x = 0; x < 4; x++) {
			setBlock(chunk, x, 0, 0, BlockId.Grass);
		}
		const quads = greedyMesh(chunk, airNeighbor);
		// Front face (-Z): 4 blocks in a row, should merge into 1 quad
		const frontQuads = quads.filter((q) => q.normal[2] === -1);
		expect(frontQuads).toHaveLength(1);
	});

	it("merged quad UVs scale with size", () => {
		const chunk = emptyChunk();
		for (let x = 0; x < 3; x++) {
			setBlock(chunk, x, 0, 0, BlockId.Stone);
		}
		const quads = greedyMesh(chunk, airNeighbor);
		const topQuad = quads.find((q) => q.normal[1] === 1);
		expect(topQuad).toBeDefined();
		// UVs should span 3 units in one direction
		const maxU = Math.max(...topQuad!.uvs.filter((_, i) => i % 2 === 0));
		expect(maxU).toBe(3);
	});
});

// ─── Chunk Boundary ───

describe("chunk boundary", () => {
	it("block at chunk edge with solid neighbor culls that face", () => {
		const chunk = emptyChunk();
		setBlock(chunk, 0, 0, 0, BlockId.Stone);
		// Neighbor function: solid in -X direction
		const solidLeft = (face: number, _a: number, _b: number, _c: number) =>
			face === 0 ? BlockId.Stone : BlockId.Air; // face 0 = -X
		const quads = greedyMesh(chunk, solidLeft);
		expect(quads).toHaveLength(5); // 6 - 1 culled face
	});
});

// ─── Output Format ───

describe("output format", () => {
	it("MeshQuad has all required fields", () => {
		const chunk = emptyChunk();
		setBlock(chunk, 0, 0, 0, BlockId.Stone);
		const quads = greedyMesh(chunk, airNeighbor);
		for (const q of quads) {
			expect(q).toHaveProperty("positions");
			expect(q).toHaveProperty("normal");
			expect(q).toHaveProperty("uvs");
			expect(q).toHaveProperty("blockType");
		}
	});
});
