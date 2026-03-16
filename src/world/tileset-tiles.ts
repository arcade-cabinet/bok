/**
 * Tile definitions for the procedural tileset.
 * Each tile specifies its grid position, base color, and optional draw callback.
 * Draw callbacks receive a seeded PRNG for deterministic texture generation.
 *
 * Layout (8 cols × 5 rows) — see block-definitions.ts for coordinate map.
 */

type DrawFn = (ctx: CanvasRenderingContext2D, s: number, rng: () => number) => void;

export interface TileDef {
	col: number;
	row: number;
	baseColor: string;
	draw?: DrawFn;
}

// ─── Drawing Primitives ───

function addNoise(ctx: CanvasRenderingContext2D, s: number, rng: () => number) {
	for (let i = 0; i < 200; i++) {
		ctx.fillStyle = rng() > 0.5 ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
		ctx.fillRect(rng() * s, rng() * s, 2, 2);
	}
}

function drawWoodGrain(ctx: CanvasRenderingContext2D, s: number, rng: () => number) {
	addNoise(ctx, s, rng);
	ctx.strokeStyle = "rgba(0,0,0,0.15)";
	ctx.lineWidth = 1;
	for (let i = 0; i < 6; i++) {
		const x = (i + 0.5) * (s / 6);
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, s);
		ctx.stroke();
	}
}

function drawWoodRings(ctx: CanvasRenderingContext2D, s: number, rng: () => number) {
	addNoise(ctx, s, rng);
	ctx.strokeStyle = "rgba(0,0,0,0.2)";
	ctx.lineWidth = 1;
	for (const r of [s / 4, s / 6]) {
		ctx.beginPath();
		ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
		ctx.stroke();
	}
}

// ─── Partial Application Helpers ───

function withLeaves(highlight: string): DrawFn {
	return (ctx, s, rng) => {
		for (let i = 0; i < 100; i++) {
			ctx.fillStyle = rng() > 0.5 ? "rgba(0,0,0,0.15)" : highlight;
			ctx.fillRect(rng() * s, rng() * s, 3, 3);
		}
	};
}

function withOre(oreColor: string): DrawFn {
	return (ctx, s, rng) => {
		addNoise(ctx, s, rng);
		ctx.fillStyle = oreColor;
		for (let i = 0; i < 8; i++) {
			ctx.fillRect(rng() * (s - 4), rng() * (s - 4), 3 + rng() * 3, 3 + rng() * 3);
		}
	};
}

// ─── Tile Definitions ───

export const tiles: TileDef[] = [
	// Row 0 — base terrain + wood + leaves + planks
	{ col: 0, row: 0, baseColor: "#4CAF50", draw: addNoise },
	{
		col: 1,
		row: 0,
		baseColor: "#795548",
		draw: (ctx, s, rng) => {
			ctx.fillStyle = "#4CAF50";
			ctx.fillRect(0, 0, s, s * 0.25);
			addNoise(ctx, s, rng);
		},
	},
	{ col: 2, row: 0, baseColor: "#795548", draw: addNoise },
	{ col: 3, row: 0, baseColor: "#9E9E9E", draw: addNoise },
	{ col: 4, row: 0, baseColor: "#5D4037", draw: drawWoodGrain },
	{ col: 5, row: 0, baseColor: "#6D4C41", draw: drawWoodRings },
	{ col: 6, row: 0, baseColor: "#2E7D32", draw: withLeaves("rgba(100,255,100,0.15)") },
	{
		col: 7,
		row: 0,
		baseColor: "#8D6E63",
		draw: (ctx, s, rng) => {
			addNoise(ctx, s, rng);
			ctx.strokeStyle = "#3e2a23";
			ctx.lineWidth = 2;
			ctx.strokeRect(0, 0, s, s);
			ctx.beginPath();
			ctx.moveTo(0, s / 2);
			ctx.lineTo(s, s / 2);
			ctx.stroke();
		},
	},
	// Row 1 — water, torch, sand, snow, stone bricks, glass, birch wood side
	{
		col: 0,
		row: 1,
		baseColor: "#1E90FF",
		draw: (ctx, s) => {
			ctx.globalAlpha = 0.7;
			ctx.fillStyle = "#1E90FF";
			ctx.fillRect(0, 0, s, s);
			ctx.globalAlpha = 1;
			ctx.strokeStyle = "rgba(255,255,255,0.3)";
			ctx.lineWidth = 1;
			for (let y = 0; y < s; y += 8) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.quadraticCurveTo(s / 4, y - 2, s / 2, y);
				ctx.quadraticCurveTo((3 * s) / 4, y + 2, s, y);
				ctx.stroke();
			}
		},
	},
	{
		col: 1,
		row: 1,
		baseColor: "#5D4037",
		draw: (ctx, s) => {
			ctx.fillStyle = "#FFD700";
			ctx.fillRect(s / 3, s / 6, s / 3, s * 0.6);
			ctx.fillStyle = "#ffaa00";
			ctx.fillRect(s / 3 + 2, s / 6 - 4, s / 3 - 4, 6);
		},
	},
	{ col: 2, row: 1, baseColor: "#E2C275", draw: addNoise },
	{
		col: 3,
		row: 1,
		baseColor: "#FFFFFF",
		draw: (ctx, s, rng) => {
			for (let i = 0; i < 80; i++) {
				ctx.fillStyle = "rgba(200,220,255,0.15)";
				ctx.fillRect(rng() * s, rng() * s, 2, 2);
			}
		},
	},
	{
		col: 4,
		row: 1,
		baseColor: "#795548",
		draw: (ctx, s, rng) => {
			ctx.fillStyle = "#FFFFFF";
			ctx.fillRect(0, 0, s, s * 0.4);
			addNoise(ctx, s, rng);
		},
	},
	{
		col: 5,
		row: 1,
		baseColor: "#757575",
		draw: (ctx, s, rng) => {
			addNoise(ctx, s, rng);
			ctx.strokeStyle = "#444";
			ctx.lineWidth = 2;
			ctx.strokeRect(1, 1, s - 2, s - 2);
			for (const [x1, y1, x2, y2] of [
				[0, s / 2, s, s / 2],
				[s / 2, 0, s / 2, s / 2],
				[s / 4, s / 2, s / 4, s],
				[(s * 3) / 4, s / 2, (s * 3) / 4, s],
			]) {
				ctx.beginPath();
				ctx.moveTo(x1, y1);
				ctx.lineTo(x2, y2);
				ctx.stroke();
			}
		},
	},
	{
		col: 6,
		row: 1,
		baseColor: "rgba(136,204,255,0.3)",
		draw: (ctx, s) => {
			ctx.strokeStyle = "rgba(255,255,255,0.7)";
			ctx.lineWidth = 3;
			ctx.strokeRect(2, 2, s - 4, s - 4);
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(s / 3, s / 3);
			ctx.stroke();
		},
	},
	{ col: 7, row: 1, baseColor: "#d4c4a8", draw: drawWoodGrain },
	// Row 2 — biome wood types + leaves
	{ col: 0, row: 2, baseColor: "#c8b898", draw: drawWoodRings },
	{ col: 1, row: 2, baseColor: "#5a8a4a", draw: withLeaves("rgba(150,255,100,0.15)") },
	{ col: 2, row: 2, baseColor: "#6e5439", draw: drawWoodGrain },
	{ col: 3, row: 2, baseColor: "#5e4429", draw: drawWoodRings },
	{ col: 4, row: 2, baseColor: "#3a5a40", draw: withLeaves("rgba(80,180,60,0.15)") },
	{ col: 5, row: 2, baseColor: "#7a4a30", draw: drawWoodGrain },
	{ col: 6, row: 2, baseColor: "#6a3a20", draw: drawWoodRings },
	{ col: 7, row: 2, baseColor: "#2a5030", draw: withLeaves("rgba(60,150,60,0.15)") },
	// Row 3 — spruce, dead wood, moss, mushroom, peat, ice, smooth stone
	{ col: 0, row: 3, baseColor: "#1a4a3a", draw: withLeaves("rgba(40,120,80,0.15)") },
	{
		col: 1,
		row: 3,
		baseColor: "#8a7a6a",
		draw: (ctx, s, rng) => {
			drawWoodGrain(ctx, s, rng);
			ctx.strokeStyle = "rgba(0,0,0,0.2)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(s * 0.3, 0);
			ctx.lineTo(s * 0.4, s);
			ctx.stroke();
		},
	},
	{ col: 2, row: 3, baseColor: "#7a6a5a", draw: drawWoodRings },
	{
		col: 3,
		row: 3,
		baseColor: "#3a5a40",
		draw: (ctx, s, rng) => {
			for (let i = 0; i < 150; i++) {
				ctx.fillStyle = rng() > 0.6 ? "rgba(60,120,50,0.2)" : "rgba(0,0,0,0.08)";
				ctx.fillRect(rng() * s, rng() * s, 2 + rng() * 2, 2 + rng() * 2);
			}
		},
	},
	{
		col: 4,
		row: 3,
		baseColor: "#a3452a",
		draw: (ctx, s, rng) => {
			ctx.fillStyle = "#e0d5c1";
			ctx.fillRect(s * 0.35, s * 0.4, s * 0.3, s * 0.6);
			addNoise(ctx, s, rng);
		},
	},
	{
		col: 5,
		row: 3,
		baseColor: "#3a2a20",
		draw: (ctx, s, rng) => {
			addNoise(ctx, s, rng);
			ctx.fillStyle = "rgba(60,40,20,0.2)";
			for (let i = 0; i < 40; i++) ctx.fillRect(rng() * s, rng() * s, 3, 3);
		},
	},
	{
		col: 6,
		row: 3,
		baseColor: "#b0d8ef",
		draw: (ctx, s) => {
			ctx.globalAlpha = 0.85;
			ctx.fillStyle = "#b0d8ef";
			ctx.fillRect(0, 0, s, s);
			ctx.globalAlpha = 1;
			ctx.strokeStyle = "rgba(255,255,255,0.4)";
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(0, s * 0.3);
			ctx.lineTo(s * 0.6, s * 0.5);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(s * 0.4, s * 0.7);
			ctx.lineTo(s, s * 0.6);
			ctx.stroke();
		},
	},
	{
		col: 7,
		row: 3,
		baseColor: "#6b6b6b",
		draw: (ctx, s, rng) => {
			for (let i = 0; i < 100; i++) {
				ctx.fillStyle = rng() > 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
				ctx.fillRect(rng() * s, rng() * s, 2, 2);
			}
		},
	},
	// Row 4 — soot, corrupted stone, ores, crystal, falu red
	{
		col: 0,
		row: 4,
		baseColor: "#2a2a3e",
		draw: (ctx, s, rng) => {
			for (let i = 0; i < 120; i++) {
				ctx.fillStyle = rng() > 0.5 ? "rgba(0,0,0,0.15)" : "rgba(50,50,80,0.12)";
				ctx.fillRect(rng() * s, rng() * s, 2, 2);
			}
		},
	},
	{
		col: 1,
		row: 4,
		baseColor: "#4a3a5a",
		draw: (ctx, s, rng) => {
			addNoise(ctx, s, rng);
			ctx.fillStyle = "rgba(100,50,150,0.2)";
			for (let i = 0; i < 12; i++) ctx.fillRect(rng() * s, rng() * s, 4, 4);
		},
	},
	{ col: 2, row: 4, baseColor: "#6b6b6b", draw: withOre("rgba(160,100,60,0.6)") },
	{ col: 3, row: 4, baseColor: "#6b6b6b", draw: withOre("rgba(60,160,80,0.5)") },
	{
		col: 4,
		row: 4,
		baseColor: "#c9a84c",
		draw: (ctx, s, rng) => {
			addNoise(ctx, s, rng);
			ctx.strokeStyle = "rgba(255,255,200,0.5)";
			ctx.lineWidth = 1;
			for (let i = 0; i < 5; i++) {
				ctx.beginPath();
				ctx.moveTo(rng() * s, rng() * s);
				ctx.lineTo(rng() * s, rng() * s);
				ctx.stroke();
			}
		},
	},
	{
		col: 5,
		row: 4,
		baseColor: "#8b2500",
		draw: (ctx, s, rng) => {
			addNoise(ctx, s, rng);
			ctx.strokeStyle = "rgba(0,0,0,0.15)";
			ctx.lineWidth = 2;
			ctx.strokeRect(0, 0, s, s);
			ctx.beginPath();
			ctx.moveTo(0, s / 2);
			ctx.lineTo(s, s / 2);
			ctx.stroke();
		},
	},
	{
		col: 6,
		row: 4,
		baseColor: "#4CAF50",
		draw: (ctx, s, rng) => {
			ctx.fillStyle = "#3a7a3a";
			ctx.fillRect(s * 0.45, s * 0.4, s * 0.1, s * 0.6);
			const colors = ["#d4a0d4", "#e8c840", "#e06040", "#80a0e0"];
			for (let i = 0; i < 5; i++) {
				ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
				ctx.fillRect(s * 0.25 + rng() * s * 0.5, s * 0.15 + rng() * s * 0.35, 4, 4);
			}
		},
	},
];
