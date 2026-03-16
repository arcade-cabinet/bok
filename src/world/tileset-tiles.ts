/**
 * Tile definitions for the procedural tileset.
 * Each tile specifies its grid position, base color, and optional draw callback.
 *
 * Layout (8 cols × 6 rows) — see block-definitions.ts for coordinate map.
 * Colors comply with Scandinavian palette (docs/design/art-direction.md).
 * Stone/dirt baseColors include +8 red channel for warm bias.
 */

import type { DrawFn } from "./tileset-draw-helpers.ts";
import {
	addNoise,
	addWarmNoise,
	drawBeechGrain,
	drawBeechRings,
	drawBirchBark,
	drawBirchRings,
	drawMossTexture,
	drawPeatTexture,
	drawPineGrain,
	drawPineRings,
	drawSootTexture,
	drawWoodGrain,
	drawWoodRings,
	withLeaves,
	withOreSparke,
} from "./tileset-draw-helpers.ts";

export interface TileDef {
	col: number;
	row: number;
	baseColor: string;
	draw?: DrawFn;
}

// ─── Tile Definitions ───

export const tiles: TileDef[] = [
	// Row 0 — base terrain + wood + leaves + planks
	// Grass top: muted Mossa-adjacent green
	{ col: 0, row: 0, baseColor: "#4a7a42", draw: addNoise },
	// Grass side: dirt with green top strip (warm-biased dirt)
	{
		col: 1,
		row: 0,
		baseColor: "#7f5b4e",
		draw: (ctx, s, rng) => {
			ctx.fillStyle = "#4a7a42";
			ctx.fillRect(0, 0, s, s * 0.25);
			addWarmNoise(ctx, s, rng);
		},
	},
	// Dirt: warm-biased brown (+8 red)
	{ col: 2, row: 0, baseColor: "#7f5b4e", draw: addWarmNoise },
	// Stone: warm-biased grey (+8 red = 0xA6 from 0x9E)
	{ col: 3, row: 0, baseColor: "#a6989a", draw: addWarmNoise },
	// Generic wood side/top
	{ col: 4, row: 0, baseColor: "#5D4037", draw: drawWoodGrain },
	{ col: 5, row: 0, baseColor: "#6D4C41", draw: drawWoodRings },
	// Leaves: Mossa palette
	{ col: 6, row: 0, baseColor: "#3a5a40", draw: withLeaves("rgba(100,255,100,0.15)") },
	// Planks
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
	// Snow: warm tint (no pure white per art direction)
	{
		col: 3,
		row: 1,
		baseColor: "#f0eae4",
		draw: (ctx, s, rng) => {
			for (let i = 0; i < 80; i++) {
				ctx.fillStyle = "rgba(200,220,255,0.15)";
				ctx.fillRect(rng() * s, rng() * s, 2, 2);
			}
		},
	},
	// Snow side: warm tint top over dirt
	{
		col: 4,
		row: 1,
		baseColor: "#7f5b4e",
		draw: (ctx, s, rng) => {
			ctx.fillStyle = "#f0eae4";
			ctx.fillRect(0, 0, s, s * 0.4);
			addWarmNoise(ctx, s, rng);
		},
	},
	// Stone bricks: warm-biased (+8 red)
	{
		col: 5,
		row: 1,
		baseColor: "#7d7577",
		draw: (ctx, s, rng) => {
			addWarmNoise(ctx, s, rng);
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
	// Glass
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
	// Birch wood side — white bark with horizontal lenticels
	{ col: 7, row: 1, baseColor: "#ddd0ba", draw: drawBirchBark },
	// Row 2 — biome wood types + leaves
	// Birch wood top — light cross section
	{ col: 0, row: 2, baseColor: "#d0c4a8", draw: drawBirchRings },
	// Birch leaves — lighter Mossa-adjacent green
	{ col: 1, row: 2, baseColor: "#5a8a4a", draw: withLeaves("rgba(150,255,100,0.15)") },
	// Beech wood side — smooth grey-brown
	{ col: 2, row: 2, baseColor: "#7a6548", draw: drawBeechGrain },
	// Beech wood top
	{ col: 3, row: 2, baseColor: "#6a5838", draw: drawBeechRings },
	// Beech leaves — deep Mossa
	{ col: 4, row: 2, baseColor: "#3a5a40", draw: withLeaves("rgba(80,180,60,0.15)") },
	// Pine wood side — dark, pronounced vertical grain
	{ col: 5, row: 2, baseColor: "#6a3a20", draw: drawPineGrain },
	// Pine wood top
	{ col: 6, row: 2, baseColor: "#5a3018", draw: drawPineRings },
	// Pine leaves — dark green
	{ col: 7, row: 2, baseColor: "#2a5030", draw: withLeaves("rgba(60,150,60,0.15)") },
	// Row 3 — spruce, dead wood, moss, mushroom, peat, ice, smooth stone
	// Spruce leaves — darkest green
	{ col: 0, row: 3, baseColor: "#1a4a3a", draw: withLeaves("rgba(40,120,80,0.15)") },
	// Dead wood side — grey-brown with crack
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
	// Dead wood top
	{ col: 2, row: 3, baseColor: "#7a6a5a", draw: drawWoodRings },
	// Moss — deep green, soft blotchy (Mossa palette)
	{ col: 3, row: 3, baseColor: "#3a5a40", draw: drawMossTexture },
	// Mushroom — Glöd palette with Björk stem
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
	// Peat — dark brown, fibrous
	{ col: 5, row: 3, baseColor: "#3a2a20", draw: drawPeatTexture },
	// Ice
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
	// Smooth stone — warm-biased Sten (+8 red)
	{
		col: 7,
		row: 3,
		baseColor: "#736b6b",
		draw: (ctx, s, rng) => {
			for (let i = 0; i < 100; i++) {
				ctx.fillStyle = rng() > 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,240,230,0.06)";
				ctx.fillRect(rng() * s, rng() * s, 2, 2);
			}
		},
	},
	// Row 4 — soot, corrupted stone, ores, crystal, falu red, wildflower, cranberry
	// Soot — black, ashy with ember specks
	{ col: 0, row: 4, baseColor: "#2a2a3e", draw: drawSootTexture },
	// Corrupted stone
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
	// Iron ore — warm stone + metallic sparkle
	{ col: 2, row: 4, baseColor: "#a6989a", draw: withOreSparke("rgba(160,100,60,0.6)") },
	// Copper ore — warm stone + green-tinted metallic sparkle
	{ col: 3, row: 4, baseColor: "#a6989a", draw: withOreSparke("rgba(60,160,80,0.5)") },
	// Crystal — Guld palette with light sparkle lines
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
			// Crystal sparkle highlights
			ctx.fillStyle = "rgba(255,255,240,0.7)";
			for (let i = 0; i < 4; i++) {
				ctx.fillRect(rng() * (s - 2), rng() * (s - 2), 1.5, 1.5);
			}
		},
	},
	// Falu red — exact palette
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
	// Wildflower
	{
		col: 6,
		row: 4,
		baseColor: "#4a7a42",
		draw: (ctx, s, rng) => {
			ctx.fillStyle = "#3a6a3a";
			ctx.fillRect(s * 0.45, s * 0.4, s * 0.1, s * 0.6);
			const colors = ["#d4a0d4", "#e8c840", "#e06040", "#80a0e0"];
			for (let i = 0; i < 5; i++) {
				ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
				ctx.fillRect(s * 0.25 + rng() * s * 0.5, s * 0.15 + rng() * s * 0.35, 4, 4);
			}
		},
	},
	// Cranberry
	{
		col: 7,
		row: 4,
		baseColor: "#3a5a40",
		draw: (ctx, s, rng) => {
			ctx.fillStyle = "#2a4a30";
			ctx.fillRect(s * 0.45, s * 0.45, s * 0.1, s * 0.55);
			ctx.fillStyle = "#8a2030";
			for (let i = 0; i < 4; i++) {
				ctx.beginPath();
				ctx.arc(s * 0.3 + rng() * s * 0.4, s * 0.2 + rng() * s * 0.3, 3, 0, Math.PI * 2);
				ctx.fill();
			}
		},
	},
	// Row 5 — landmarks + workstations + crafted building
	// Rune stone — Sten palette with Björk-tinted rune carvings
	{
		col: 0,
		row: 5,
		baseColor: "#5a5a6a",
		draw: (ctx, s, rng) => {
			addNoise(ctx, s, rng);
			// Elder Futhark-style angular rune carvings
			ctx.strokeStyle = "rgba(200,180,140,0.6)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(s * 0.5, s * 0.15);
			ctx.lineTo(s * 0.5, s * 0.85);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(s * 0.5, s * 0.3);
			ctx.lineTo(s * 0.75, s * 0.2);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(s * 0.5, s * 0.5);
			ctx.lineTo(s * 0.75, s * 0.4);
			ctx.stroke();
		},
	},
	// Crafting Bench — wooden planks with tool marks
	{
		col: 1,
		row: 5,
		baseColor: "#8D6E63",
		draw: (ctx, s, rng) => {
			addNoise(ctx, s, rng);
			// Work surface grid
			ctx.strokeStyle = "rgba(0,0,0,0.2)";
			ctx.lineWidth = 2;
			ctx.strokeRect(2, 2, s - 4, s - 4);
			ctx.beginPath();
			ctx.moveTo(s / 2, 2);
			ctx.lineTo(s / 2, s - 2);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(2, s / 2);
			ctx.lineTo(s - 2, s / 2);
			ctx.stroke();
			// Tool marks
			ctx.fillStyle = "rgba(60,40,20,0.3)";
			for (let i = 0; i < 5; i++) {
				ctx.fillRect(rng() * (s - 6) + 3, rng() * (s - 6) + 3, 3, 1);
			}
		},
	},
	// Forge — dark stone with ember glow
	{
		col: 2,
		row: 5,
		baseColor: "#5a4a4a",
		draw: (ctx, s, rng) => {
			addWarmNoise(ctx, s, rng);
			// Brick pattern
			ctx.strokeStyle = "rgba(0,0,0,0.25)";
			ctx.lineWidth = 2;
			ctx.strokeRect(1, 1, s - 2, s - 2);
			ctx.beginPath();
			ctx.moveTo(0, s * 0.33);
			ctx.lineTo(s, s * 0.33);
			ctx.moveTo(0, s * 0.66);
			ctx.lineTo(s, s * 0.66);
			ctx.stroke();
			// Ember glow at center
			ctx.fillStyle = "rgba(255,120,30,0.4)";
			ctx.fillRect(s * 0.3, s * 0.3, s * 0.4, s * 0.4);
			ctx.fillStyle = "rgba(255,200,50,0.3)";
			ctx.fillRect(s * 0.4, s * 0.4, s * 0.2, s * 0.2);
		},
	},
	// Scriptorium — dark blue-grey with rune carving
	{
		col: 3,
		row: 5,
		baseColor: "#4a4a5a",
		draw: (ctx, s, rng) => {
			addNoise(ctx, s, rng);
			// Frame
			ctx.strokeStyle = "rgba(200,180,140,0.3)";
			ctx.lineWidth = 2;
			ctx.strokeRect(3, 3, s - 6, s - 6);
			// Rune inscription (Jera / harvest rune)
			ctx.strokeStyle = "rgba(200,180,140,0.5)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(s * 0.35, s * 0.2);
			ctx.lineTo(s * 0.65, s * 0.5);
			ctx.lineTo(s * 0.35, s * 0.8);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(s * 0.65, s * 0.2);
			ctx.lineTo(s * 0.35, s * 0.5);
			ctx.lineTo(s * 0.65, s * 0.8);
			ctx.stroke();
		},
	},
	// Treated Planks — darker stained wood
	{
		col: 4,
		row: 5,
		baseColor: "#6D5040",
		draw: (ctx, s, rng) => {
			addNoise(ctx, s, rng);
			ctx.strokeStyle = "rgba(0,0,0,0.2)";
			ctx.lineWidth = 2;
			ctx.strokeRect(0, 0, s, s);
			ctx.beginPath();
			ctx.moveTo(0, s / 2);
			ctx.lineTo(s, s / 2);
			ctx.stroke();
			// Treated sheen
			ctx.fillStyle = "rgba(255,240,200,0.06)";
			ctx.fillRect(2, 2, s - 4, s / 2 - 3);
		},
	},
	// Reinforced Bricks — stone bricks with iron rivets
	{
		col: 5,
		row: 5,
		baseColor: "#6a6068",
		draw: (ctx, s, rng) => {
			addWarmNoise(ctx, s, rng);
			// Brick pattern
			ctx.strokeStyle = "rgba(0,0,0,0.25)";
			ctx.lineWidth = 2;
			ctx.strokeRect(1, 1, s - 2, s - 2);
			ctx.beginPath();
			ctx.moveTo(0, s / 2);
			ctx.lineTo(s, s / 2);
			ctx.moveTo(s / 2, 0);
			ctx.lineTo(s / 2, s / 2);
			ctx.moveTo(s / 4, s / 2);
			ctx.lineTo(s / 4, s);
			ctx.moveTo(s * 0.75, s / 2);
			ctx.lineTo(s * 0.75, s);
			ctx.stroke();
			// Iron rivets
			ctx.fillStyle = "rgba(160,130,100,0.6)";
			for (const [x, y] of [
				[s * 0.25, s * 0.25],
				[s * 0.75, s * 0.25],
				[s * 0.5, s * 0.75],
			] as const) {
				ctx.beginPath();
				ctx.arc(x, y, 2, 0, Math.PI * 2);
				ctx.fill();
			}
		},
	},
];
