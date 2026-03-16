import { describe, expect, it } from "vitest";
import { Biome } from "../../world/biomes.ts";
import {
	BIOME_COLORS,
	chunkFogState,
	FOG_COLOR,
	LANDMARK_GLYPHS,
	packChunk,
	unpackChunk,
	worldToChunk,
} from "./map-data.ts";

describe("packChunk / unpackChunk", () => {
	it("round-trips positive coords", () => {
		expect(unpackChunk(packChunk(5, 10))).toEqual([5, 10]);
	});

	it("round-trips negative coords", () => {
		expect(unpackChunk(packChunk(-3, -7))).toEqual([-3, -7]);
	});

	it("round-trips zero", () => {
		expect(unpackChunk(packChunk(0, 0))).toEqual([0, 0]);
	});

	it("produces unique keys for different coords", () => {
		const a = packChunk(1, 2);
		const b = packChunk(2, 1);
		expect(a).not.toBe(b);
	});

	it("handles large coords", () => {
		expect(unpackChunk(packChunk(500, -500))).toEqual([500, -500]);
	});
});

describe("worldToChunk", () => {
	it("converts positive world coords", () => {
		expect(worldToChunk(24.5, 32.1)).toEqual([1, 2]);
	});

	it("converts negative world coords", () => {
		expect(worldToChunk(-1, -17)).toEqual([-1, -2]);
	});

	it("converts zero", () => {
		expect(worldToChunk(0, 0)).toEqual([0, 0]);
	});

	it("handles chunk boundary", () => {
		expect(worldToChunk(16, 16)).toEqual([1, 1]);
	});
});

describe("chunkFogState", () => {
	it("returns current for player chunk", () => {
		const visited = new Set([packChunk(3, 4)]);
		expect(chunkFogState(3, 4, 3, 4, visited)).toBe("current");
	});

	it("returns explored for visited non-current chunk", () => {
		const visited = new Set([packChunk(1, 1), packChunk(2, 2)]);
		expect(chunkFogState(1, 1, 2, 2, visited)).toBe("explored");
	});

	it("returns unexplored for unvisited chunk", () => {
		const visited = new Set([packChunk(0, 0)]);
		expect(chunkFogState(5, 5, 0, 0, visited)).toBe("unexplored");
	});

	it("current takes priority over explored", () => {
		const visited = new Set([packChunk(1, 1)]);
		expect(chunkFogState(1, 1, 1, 1, visited)).toBe("current");
	});
});

describe("BIOME_COLORS", () => {
	it("has a color for every biome", () => {
		for (const key of Object.values(Biome)) {
			expect(BIOME_COLORS[key]).toBeDefined();
			expect(BIOME_COLORS[key]).toMatch(/^#[0-9a-f]{6}$/);
		}
	});
});

describe("FOG_COLOR", () => {
	it("is a valid hex color", () => {
		expect(FOG_COLOR).toMatch(/^#[0-9a-f]{6}$/);
	});
});

describe("LANDMARK_GLYPHS", () => {
	it("has a glyph for each landmark type", () => {
		const types = ["runsten", "stenhog", "fornlamning", "kolmila", "offerkalla", "sjomarke", "fjallstuga"] as const;
		for (const t of types) {
			expect(LANDMARK_GLYPHS[t]).toBeDefined();
			expect(typeof LANDMARK_GLYPHS[t]).toBe("string");
		}
	});
});
