/**
 * Part definitions for neutral/boss creatures — Vittra, Nacken, Jatten.
 * Pure data, no Three.js. Consumed by creature-parts.ts for assembly.
 */

import type { CreaturePartDef } from "./creature-parts.ts";

// ─── Vittra (Underground Folk) ───
// Small humanoid (1 block tall), earthy colors, semi-transparent when passive.
// Box torso, sphere head, stubby limbs. Simple, toy-like.

export const VITTRA_PARTS: CreaturePartDef[] = [
	// 0: torso — small box
	{ geometry: "box", size: [0.3, 0.35, 0.2], offset: [0, 0.35, 0], jointParent: -1, jointAxis: null, color: 0x6b5b4b },
	// 1: head — sphere
	{
		geometry: "sphere",
		size: [0.18, 0.18, 0.18],
		offset: [0, 0.3, 0],
		jointParent: 0,
		jointAxis: null,
		color: 0x7b6b5b,
	},
	// 2-3: eyes (small, dim)
	{
		geometry: "sphere",
		size: [0.04, 0.04, 0.04],
		offset: [-0.06, 0.02, -0.15],
		jointParent: 1,
		jointAxis: null,
		color: 0x3a5a40,
		emissive: 0x3a5a40,
	},
	{
		geometry: "sphere",
		size: [0.04, 0.04, 0.04],
		offset: [0.06, 0.02, -0.15],
		jointParent: 1,
		jointAxis: null,
		color: 0x3a5a40,
		emissive: 0x3a5a40,
	},
	// 4-5: arms — stubby
	{
		geometry: "box",
		size: [0.1, 0.25, 0.1],
		offset: [-0.22, -0.05, 0],
		jointParent: 0,
		jointAxis: "x",
		color: 0x6b5b4b,
	},
	{
		geometry: "box",
		size: [0.1, 0.25, 0.1],
		offset: [0.22, -0.05, 0],
		jointParent: 0,
		jointAxis: "x",
		color: 0x6b5b4b,
	},
	// 6-7: legs — stubby
	{ geometry: "box", size: [0.1, 0.2, 0.1], offset: [-0.08, -0.3, 0], jointParent: 0, jointAxis: "x", color: 0x5b4b3b },
	{ geometry: "box", size: [0.1, 0.2, 0.1], offset: [0.08, -0.3, 0], jointParent: 0, jointAxis: "x", color: 0x5b4b3b },
];

// ─── Nacken (Water Spirit) ───
// Humanoid sitting pose. Translucent green-blue emissive.
// Box torso, capsule limbs, sphere head, fiddle instrument.

export const NACKEN_PARTS: CreaturePartDef[] = [
	// 0: torso — seated
	{
		geometry: "box",
		size: [0.4, 0.5, 0.25],
		offset: [0, 0.6, 0],
		jointParent: -1,
		jointAxis: null,
		color: 0x44aaaa,
		emissive: 0x44aaaa,
	},
	// 1: head — sphere
	{
		geometry: "sphere",
		size: [0.2, 0.2, 0.2],
		offset: [0, 0.4, 0],
		jointParent: 0,
		jointAxis: null,
		color: 0x44aaaa,
		emissive: 0x44aaaa,
	},
	// 2-3: hair (trailing chain, 2 segments)
	{
		geometry: "box",
		size: [0.15, 0.15, 0.08],
		offset: [0, -0.1, 0.12],
		jointParent: 1,
		jointAxis: "x",
		color: 0x228888,
		emissive: 0x228888,
	},
	{
		geometry: "box",
		size: [0.12, 0.15, 0.06],
		offset: [0, -0.15, 0],
		jointParent: 2,
		jointAxis: "x",
		color: 0x228888,
		emissive: 0x228888,
	},
	// 4: left arm (holding fiddle)
	{
		geometry: "box",
		size: [0.12, 0.4, 0.12],
		offset: [-0.3, 0.0, -0.1],
		jointParent: 0,
		jointAxis: "x",
		color: 0x44aaaa,
		emissive: 0x44aaaa,
	},
	// 5: right arm (holding bow)
	{
		geometry: "box",
		size: [0.12, 0.4, 0.12],
		offset: [0.3, 0.0, -0.1],
		jointParent: 0,
		jointAxis: "x",
		color: 0x44aaaa,
		emissive: 0x44aaaa,
	},
	// 6: fiddle body
	{
		geometry: "box",
		size: [0.12, 0.2, 0.06],
		offset: [-0.1, -0.15, -0.15],
		jointParent: 4,
		jointAxis: null,
		color: 0x8b6914,
	},
	// 7: fiddle bow
	{
		geometry: "box",
		size: [0.03, 0.3, 0.03],
		offset: [0.1, -0.1, -0.15],
		jointParent: 5,
		jointAxis: null,
		color: 0x8b6914,
	},
	// 8-9: legs — seated (bent)
	{
		geometry: "box",
		size: [0.14, 0.35, 0.14],
		offset: [-0.1, -0.4, -0.1],
		jointParent: 0,
		jointAxis: "x",
		color: 0x44aaaa,
		emissive: 0x44aaaa,
	},
	{
		geometry: "box",
		size: [0.14, 0.35, 0.14],
		offset: [0.1, -0.4, -0.1],
		jointParent: 0,
		jointAxis: "x",
		color: 0x44aaaa,
		emissive: 0x44aaaa,
	},
];

// ─── Tomte (House Gnome / Tutorial Companion) ───
// Small stocky gnome (0.5 blocks tall), pointed Falu-red hat, bushy white beard.
// Singleton companion, not a spawned species. Building-block aesthetic.

export const TOMTE_PARTS: CreaturePartDef[] = [
	// 0: torso — stocky, wider than tall
	{ geometry: "box", size: [0.4, 0.5, 0.3], offset: [0, 0.25, 0], jointParent: -1, jointAxis: null, color: 0x6b4b3b },
	// 1: head — oversized sphere relative to body
	{
		geometry: "sphere",
		size: [0.2, 0.2, 0.2],
		offset: [0, 0.38, 0],
		jointParent: 0,
		jointAxis: null,
		color: 0xd4a37a,
	},
	// 2: hat — pointed cone, Falu red
	{
		geometry: "cone",
		size: [0.15, 0.3, 0.15],
		offset: [0, 0.22, 0],
		jointParent: 1,
		jointAxis: null,
		color: 0x8b2500,
	},
	// 3: beard (upper) — bushy box
	{
		geometry: "box",
		size: [0.22, 0.12, 0.1],
		offset: [0, -0.1, -0.12],
		jointParent: 1,
		jointAxis: null,
		color: 0xe0d5c1,
	},
	// 4: beard (lower) — trailing tuft
	{
		geometry: "box",
		size: [0.16, 0.1, 0.08],
		offset: [0, -0.1, 0],
		jointParent: 3,
		jointAxis: null,
		color: 0xe0d5c1,
	},
	// 5-6: eyes — small dark
	{
		geometry: "sphere",
		size: [0.03, 0.03, 0.03],
		offset: [-0.06, 0.04, -0.17],
		jointParent: 1,
		jointAxis: null,
		color: 0x1a1a2e,
	},
	{
		geometry: "sphere",
		size: [0.03, 0.03, 0.03],
		offset: [0.06, 0.04, -0.17],
		jointParent: 1,
		jointAxis: null,
		color: 0x1a1a2e,
	},
	// 7-8: arms — stubby
	{
		geometry: "box",
		size: [0.1, 0.25, 0.1],
		offset: [-0.28, -0.05, 0],
		jointParent: 0,
		jointAxis: "x",
		color: 0x6b4b3b,
	},
	{
		geometry: "box",
		size: [0.1, 0.25, 0.1],
		offset: [0.28, -0.05, 0],
		jointParent: 0,
		jointAxis: "x",
		color: 0x6b4b3b,
	},
	// 9-10: legs — short and stocky
	{
		geometry: "box",
		size: [0.12, 0.18, 0.12],
		offset: [-0.1, -0.3, 0],
		jointParent: 0,
		jointAxis: "x",
		color: 0x5b4b3b,
	},
	{
		geometry: "box",
		size: [0.12, 0.18, 0.12],
		offset: [0.1, -0.3, 0],
		jointParent: 0,
		jointAxis: "x",
		color: 0x5b4b3b,
	},
];

// ─── Jatten (Giant) ───
// 8-block tall humanoid assembled from world blocks (stone, wood, moss).
// Massive body, column arms, glowing runsten core in chest.

export const JATTEN_PARTS: CreaturePartDef[] = [
	// 0: lower torso — massive stone
	{ geometry: "box", size: [2.0, 2.0, 1.5], offset: [0, 2.0, 0], jointParent: -1, jointAxis: null, color: 0x6b6b6b },
	// 1: upper torso — wood/moss mix
	{ geometry: "box", size: [2.2, 1.5, 1.4], offset: [0, 2.0, 0], jointParent: 0, jointAxis: null, color: 0x8b6914 },
	// 2: head — stone slab
	{ geometry: "box", size: [1.0, 0.8, 0.8], offset: [0, 1.2, 0], jointParent: 1, jointAxis: null, color: 0x6b6b6b },
	// 3-4: eyes — ember glow
	{
		geometry: "sphere",
		size: [0.15, 0.15, 0.15],
		offset: [-0.25, 0.05, -0.42],
		jointParent: 2,
		jointAxis: null,
		color: 0xc9a84c,
		emissive: 0xc9a84c,
	},
	{
		geometry: "sphere",
		size: [0.15, 0.15, 0.15],
		offset: [0.25, 0.05, -0.42],
		jointParent: 2,
		jointAxis: null,
		color: 0xc9a84c,
		emissive: 0xc9a84c,
	},
	// 5: runsten core — glowing rune in chest (visible when staggered)
	{
		geometry: "box",
		size: [0.4, 0.4, 0.1],
		offset: [0, 0, -0.72],
		jointParent: 1,
		jointAxis: null,
		color: 0xc9a84c,
		emissive: 0xc9a84c,
	},
	// 6-7: left arm (column of stacked blocks)
	{ geometry: "box", size: [0.6, 1.5, 0.6], offset: [-1.5, 0.2, 0], jointParent: 1, jointAxis: "x", color: 0x6b6b6b },
	{ geometry: "box", size: [0.5, 1.2, 0.5], offset: [0, -1.4, 0], jointParent: 6, jointAxis: "x", color: 0x3a5a40 },
	// 8-9: right arm
	{ geometry: "box", size: [0.6, 1.5, 0.6], offset: [1.5, 0.2, 0], jointParent: 1, jointAxis: "x", color: 0x6b6b6b },
	{ geometry: "box", size: [0.5, 1.2, 0.5], offset: [0, -1.4, 0], jointParent: 8, jointAxis: "x", color: 0x3a5a40 },
	// 10-11: left leg
	{ geometry: "box", size: [0.7, 1.5, 0.7], offset: [-0.5, -1.8, 0], jointParent: 0, jointAxis: "x", color: 0x6b6b6b },
	{ geometry: "box", size: [0.6, 1.0, 0.6], offset: [0, -1.3, 0], jointParent: 10, jointAxis: "x", color: 0x3a5a40 },
	// 12-13: right leg
	{ geometry: "box", size: [0.7, 1.5, 0.7], offset: [0.5, -1.8, 0], jointParent: 0, jointAxis: "x", color: 0x6b6b6b },
	{ geometry: "box", size: [0.6, 1.0, 0.6], offset: [0, -1.3, 0], jointParent: 12, jointAxis: "x", color: 0x3a5a40 },
];
