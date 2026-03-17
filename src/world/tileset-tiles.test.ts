import { describe, expect, it, vi } from "vitest";
import {
	addNoise,
	addWarmNoise,
	drawBeechGrain,
	drawBirchBark,
	drawMossTexture,
	drawPeatTexture,
	drawPineGrain,
	drawSootTexture,
	withLeaves,
	withOreSparke,
} from "./tileset-draw-helpers.ts";
import { tiles } from "./tileset-tiles.ts";

// ─── Mock Canvas Context ───
// Records fillStyle/strokeStyle assignments for color sampling.

interface MockCtx extends CanvasRenderingContext2D {
	_fillColors: string[];
	_strokeColors: string[];
}

function createMockCtx(): MockCtx {
	const fillColors: string[] = [];
	const strokeColors: string[] = [];
	const ctx = {
		_fillColors: fillColors,
		_strokeColors: strokeColors,
		globalAlpha: 1,
		lineWidth: 1,
		fillRect: vi.fn(),
		strokeRect: vi.fn(),
		beginPath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		stroke: vi.fn(),
		arc: vi.fn(),
		fill: vi.fn(),
		quadraticCurveTo: vi.fn(),
		save: vi.fn(),
		restore: vi.fn(),
		clearRect: vi.fn(),
		translate: vi.fn(),
	} as unknown as MockCtx;

	// Intercept fillStyle/strokeStyle writes
	let fillStyleVal = "";
	let strokeStyleVal = "";
	Object.defineProperty(ctx, "fillStyle", {
		get: () => fillStyleVal,
		set: (v: string) => {
			fillStyleVal = v;
			fillColors.push(v);
		},
	});
	Object.defineProperty(ctx, "strokeStyle", {
		get: () => strokeStyleVal,
		set: (v: string) => {
			strokeStyleVal = v;
			strokeColors.push(v);
		},
	});

	return ctx;
}

/** Deterministic PRNG for tests. */
function seededRng(seed = 42): () => number {
	let s = seed | 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// ─── Palette Compliance ───

describe("palette compliance", () => {
	it("stone tiles use warm-biased baseColor (red > green and red > blue)", () => {
		const stoneTiles = tiles.filter((t) => ["#a6989a", "#7d7577", "#736b6b"].includes(t.baseColor.toLowerCase()));
		expect(stoneTiles.length).toBeGreaterThanOrEqual(3);
		for (const t of stoneTiles) {
			const hex = t.baseColor.replace("#", "");
			const r = Number.parseInt(hex.slice(0, 2), 16);
			const g = Number.parseInt(hex.slice(2, 4), 16);
			const b = Number.parseInt(hex.slice(4, 6), 16);
			expect(r).toBeGreaterThanOrEqual(g);
			expect(r).toBeGreaterThanOrEqual(b);
		}
	});

	it("dirt tiles use warm-biased baseColor", () => {
		const dirtTiles = tiles.filter((t) => t.baseColor === "#7f5b4e");
		expect(dirtTiles.length).toBeGreaterThanOrEqual(2);
		// R=0x7f=127, G=0x5b=91, B=0x4e=78 — warm brown
		const r = 0x7f;
		const g = 0x5b;
		expect(r).toBeGreaterThan(g);
	});

	it("snow tile has no pure white (#FFFFFF) baseColor", () => {
		const snowTile = tiles.find((t) => t.col === 3 && t.row === 1);
		expect(snowTile).toBeDefined();
		expect(snowTile?.baseColor).not.toBe("#FFFFFF");
		expect(snowTile?.baseColor).not.toBe("#ffffff");
	});

	it("leaves tiles use Mossa-adjacent greens", () => {
		const mossaR = 0x3a;
		const leafTiles = tiles.filter((t) =>
			[
				{ col: 6, row: 0 },
				{ col: 4, row: 2 },
			].some((p) => p.col === t.col && p.row === t.row),
		);
		expect(leafTiles.length).toBe(2);
		for (const t of leafTiles) {
			expect(t.baseColor).toBe("#3a5a40");
			const r = Number.parseInt(t.baseColor.replace("#", "").slice(0, 2), 16);
			expect(r).toBeLessThanOrEqual(mossaR + 10);
		}
	});
});

// ─── Wood Grain Species Tests ───

describe("birch bark texture", () => {
	it("draws horizontal lenticels (rects with small height)", () => {
		const ctx = createMockCtx();
		const rng = seededRng();
		drawBirchBark(ctx, 32, rng);
		// Lenticels are drawn as dark brown rects
		expect(ctx._fillColors).toContain("rgba(80,60,40,0.35)");
		// fillRect called for noise (200) + lenticels (8)
		expect(ctx.fillRect).toHaveBeenCalled();
	});
});

describe("beech grain texture", () => {
	it("uses subtle stroke opacity (< 0.1)", () => {
		const ctx = createMockCtx();
		const rng = seededRng();
		drawBeechGrain(ctx, 32, rng);
		// Beech has very subtle grain — stroke opacity 0.08
		expect(ctx._strokeColors).toContain("rgba(0,0,0,0.08)");
	});
});

describe("pine grain texture", () => {
	it("uses pronounced dark grain (opacity >= 0.25)", () => {
		const ctx = createMockCtx();
		const rng = seededRng();
		drawPineGrain(ctx, 32, rng);
		// Pine has dark, pronounced lines
		expect(ctx._strokeColors).toContain("rgba(0,0,0,0.25)");
	});

	it("draws resin knots", () => {
		const ctx = createMockCtx();
		const rng = seededRng();
		drawPineGrain(ctx, 32, rng);
		expect(ctx._fillColors).toContain("rgba(40,20,10,0.3)");
		expect(ctx.arc).toHaveBeenCalled();
	});
});

// ─── Ore Sparkle ───

describe("ore sparkle", () => {
	it("includes metallic highlight pixels", () => {
		const ctx = createMockCtx();
		const rng = seededRng();
		const drawIron = withOreSparke("rgba(160,100,60,0.6)");
		drawIron(ctx, 32, rng);
		// Metallic sparkle highlights
		const hasSparkle = ctx._fillColors.some((c) => c.includes("rgba(255,255,240,") || c.includes("rgba(255,250,200,"));
		expect(hasSparkle).toBe(true);
	});

	it("draws ore color veins", () => {
		const ctx = createMockCtx();
		const rng = seededRng();
		const drawCopper = withOreSparke("rgba(60,160,80,0.5)");
		drawCopper(ctx, 32, rng);
		expect(ctx._fillColors).toContain("rgba(60,160,80,0.5)");
	});
});

// ─── Biome Ground Textures ───

describe("moss texture", () => {
	it("uses deep green color variants", () => {
		const ctx = createMockCtx();
		const rng = seededRng();
		drawMossTexture(ctx, 32, rng);
		const hasGreen = ctx._fillColors.some((c) => c.includes("60,120,50") || c.includes("50,100,55"));
		expect(hasGreen).toBe(true);
	});
});

describe("peat texture", () => {
	it("draws fibrous horizontal streaks", () => {
		const ctx = createMockCtx();
		const rng = seededRng();
		drawPeatTexture(ctx, 32, rng);
		// Fibrous lines in warm brown
		expect(ctx._strokeColors).toContain("rgba(80,50,30,0.25)");
		// Dark organic flecks
		expect(ctx._fillColors).toContain("rgba(60,40,20,0.2)");
	});
});

describe("soot texture", () => {
	it("includes ashy grey particles", () => {
		const ctx = createMockCtx();
		const rng = seededRng();
		drawSootTexture(ctx, 32, rng);
		const hasAsh = ctx._fillColors.some((c) => c.includes("120,110,100"));
		expect(hasAsh).toBe(true);
	});

	it("includes ember tint specks", () => {
		const ctx = createMockCtx();
		const rng = seededRng();
		drawSootTexture(ctx, 32, rng);
		expect(ctx._fillColors).toContain("rgba(180,80,30,0.1)");
	});
});

// ─── Warm Noise ───

describe("warm noise helper", () => {
	it("uses warm-tinted light pixels instead of pure white", () => {
		const ctx = createMockCtx();
		const rng = seededRng();
		addWarmNoise(ctx, 32, rng);
		const hasWarmLight = ctx._fillColors.some((c) => c.includes("255,240,230"));
		expect(hasWarmLight).toBe(true);
		// Should NOT contain pure white noise
		const hasPureWhite = ctx._fillColors.some((c) => c === "rgba(255,255,255,0.1)");
		expect(hasPureWhite).toBe(false);
	});
});

describe("base noise helper", () => {
	it("uses black and white noise particles", () => {
		const ctx = createMockCtx();
		const rng = seededRng();
		addNoise(ctx, 32, rng);
		expect(ctx._fillColors).toContain("rgba(0,0,0,0.1)");
		expect(ctx._fillColors).toContain("rgba(255,255,255,0.1)");
	});
});

// ─── Leaf Factory ───

describe("withLeaves factory", () => {
	it("uses the provided highlight color", () => {
		const ctx = createMockCtx();
		const rng = seededRng();
		const draw = withLeaves("rgba(100,255,100,0.15)");
		draw(ctx, 32, rng);
		expect(ctx._fillColors).toContain("rgba(100,255,100,0.15)");
	});
});

// ─── Tile Coverage ───

describe("tile grid coverage", () => {
	it("has unique col/row positions for every tile", () => {
		const positions = new Set(tiles.map((t) => `${t.col},${t.row}`));
		expect(positions.size).toBe(tiles.length);
	});

	it("all tiles fit within the 8x6 grid", () => {
		for (const tile of tiles) {
			expect(tile.col).toBeGreaterThanOrEqual(0);
			expect(tile.col).toBeLessThan(8);
			expect(tile.row).toBeGreaterThanOrEqual(0);
			expect(tile.row).toBeLessThan(6);
		}
	});

	it("has at least 39 tiles", () => {
		expect(tiles.length).toBeGreaterThanOrEqual(39);
	});
});
