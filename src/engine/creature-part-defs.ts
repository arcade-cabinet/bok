/**
 * Creature part definition data — arrays of geometric primitives per species.
 * Pure data, no Three.js. Consumed by creature-parts.ts for assembly.
 */

import type { SpeciesId } from "../ecs/traits/index.ts";
import type { CreaturePartDef } from "./creature-parts.ts";

// ─── Mörker ───

const MORKER_PARTS: CreaturePartDef[] = [
	// 0: body
	{ geometry: "box", size: [0.6, 1.0, 0.5], offset: [0, 0.5, 0], jointParent: -1, jointAxis: null, color: 0x1a1a2e },
	// 1: head
	{ geometry: "box", size: [0.4, 0.35, 0.35], offset: [0, 0.85, 0], jointParent: 0, jointAxis: "y", color: 0x1a1a2e },
	// 2: left eye
	{
		geometry: "sphere",
		size: [0.06, 0.06, 0.06],
		offset: [-0.1, 0.06, -0.16],
		jointParent: 1,
		jointAxis: null,
		color: 0xff4444,
		emissive: 0xff4444,
	},
	// 3: right eye
	{
		geometry: "sphere",
		size: [0.06, 0.06, 0.06],
		offset: [0.1, 0.06, -0.16],
		jointParent: 1,
		jointAxis: null,
		color: 0xff4444,
		emissive: 0xff4444,
	},
	// 4: left arm
	{
		geometry: "box",
		size: [0.18, 0.55, 0.18],
		offset: [-0.39, -0.1, 0],
		jointParent: 0,
		jointAxis: "x",
		color: 0x1a1a2e,
	},
	// 5: right arm
	{
		geometry: "box",
		size: [0.18, 0.55, 0.18],
		offset: [0.39, -0.1, 0],
		jointParent: 0,
		jointAxis: "x",
		color: 0x1a1a2e,
	},
];

// ─── Lyktgubbe ───

const LYKTGUBBE_PARTS: CreaturePartDef[] = [
	{
		geometry: "sphere",
		size: [0.2, 0.2, 0.2],
		offset: [0, 0.4, 0],
		jointParent: -1,
		jointAxis: null,
		color: 0xffd700,
		emissive: 0xffd700,
		additive: true,
	},
];

// ─── Skogssnigel ───
// Base capsule (body) + 5 stacked box segments (shell) + 4 stubby legs

const SKOGSSNIGEL_PARTS: CreaturePartDef[] = [
	// 0: body
	{ geometry: "box", size: [0.5, 0.3, 0.7], offset: [0, 0.15, 0], jointParent: -1, jointAxis: null, color: 0x6b6b6b },
	// 1-5: shell segments (stacked, each slightly smaller)
	{ geometry: "box", size: [0.4, 0.12, 0.5], offset: [0, 0.25, 0], jointParent: 0, jointAxis: null, color: 0x3a5a40 },
	{ geometry: "box", size: [0.36, 0.12, 0.44], offset: [0, 0.12, 0], jointParent: 1, jointAxis: null, color: 0x6b6b6b },
	{ geometry: "box", size: [0.32, 0.12, 0.38], offset: [0, 0.12, 0], jointParent: 2, jointAxis: null, color: 0x3a5a40 },
	{ geometry: "box", size: [0.28, 0.12, 0.32], offset: [0, 0.12, 0], jointParent: 3, jointAxis: null, color: 0x6b6b6b },
	{ geometry: "box", size: [0.24, 0.1, 0.26], offset: [0, 0.12, 0], jointParent: 4, jointAxis: null, color: 0x3a5a40 },
	// 6-9: four stubby legs
	{
		geometry: "box",
		size: [0.08, 0.12, 0.08],
		offset: [-0.2, -0.12, -0.2],
		jointParent: 0,
		jointAxis: "x",
		color: 0x6b6b6b,
	},
	{
		geometry: "box",
		size: [0.08, 0.12, 0.08],
		offset: [0.2, -0.12, -0.2],
		jointParent: 0,
		jointAxis: "x",
		color: 0x6b6b6b,
	},
	{
		geometry: "box",
		size: [0.08, 0.12, 0.08],
		offset: [-0.2, -0.12, 0.2],
		jointParent: 0,
		jointAxis: "x",
		color: 0x6b6b6b,
	},
	{
		geometry: "box",
		size: [0.08, 0.12, 0.08],
		offset: [0.2, -0.12, 0.2],
		jointParent: 0,
		jointAxis: "x",
		color: 0x6b6b6b,
	},
];

// ─── Trana (Crane) ───
// Elongated torso, 8-segment chain neck, cone beak, flat wings, 2 reverse-knee legs

const TRANA_PARTS: CreaturePartDef[] = [
	// 0: torso
	{ geometry: "box", size: [0.4, 0.35, 0.8], offset: [0, 0.9, 0], jointParent: -1, jointAxis: null, color: 0xe0d5c1 },
	// 1-8: neck chain (8 segments)
	{ geometry: "box", size: [0.1, 0.12, 0.1], offset: [0, 0.2, -0.3], jointParent: 0, jointAxis: "x", color: 0xe0d5c1 },
	{ geometry: "box", size: [0.1, 0.12, 0.1], offset: [0, 0.12, 0], jointParent: 1, jointAxis: "x", color: 0xe0d5c1 },
	{ geometry: "box", size: [0.1, 0.12, 0.1], offset: [0, 0.12, 0], jointParent: 2, jointAxis: "x", color: 0xe0d5c1 },
	{ geometry: "box", size: [0.1, 0.12, 0.1], offset: [0, 0.12, 0], jointParent: 3, jointAxis: "x", color: 0xe0d5c1 },
	{ geometry: "box", size: [0.1, 0.12, 0.1], offset: [0, 0.12, 0], jointParent: 4, jointAxis: "x", color: 0xe0d5c1 },
	{ geometry: "box", size: [0.1, 0.12, 0.1], offset: [0, 0.12, 0], jointParent: 5, jointAxis: "x", color: 0xe0d5c1 },
	{ geometry: "box", size: [0.1, 0.12, 0.1], offset: [0, 0.12, 0], jointParent: 6, jointAxis: "x", color: 0xe0d5c1 },
	{ geometry: "box", size: [0.09, 0.12, 0.09], offset: [0, 0.12, 0], jointParent: 7, jointAxis: "x", color: 0xe0d5c1 },
	// 9: beak
	{ geometry: "cone", size: [0.04, 0.15, 0.04], offset: [0, 0.1, 0], jointParent: 8, jointAxis: null, color: 0x1a1a2e },
	// 10-11: wings
	{ geometry: "box", size: [0.6, 0.04, 0.4], offset: [-0.5, 0.05, 0], jointParent: 0, jointAxis: "z", color: 0xe0d5c1 },
	{ geometry: "box", size: [0.6, 0.04, 0.4], offset: [0.5, 0.05, 0], jointParent: 0, jointAxis: "z", color: 0xe0d5c1 },
	// 12-13: legs
	{
		geometry: "box",
		size: [0.06, 0.5, 0.06],
		offset: [-0.12, -0.5, 0],
		jointParent: 0,
		jointAxis: "x",
		color: 0x1a1a2e,
	},
	{
		geometry: "box",
		size: [0.06, 0.5, 0.06],
		offset: [0.12, -0.5, 0],
		jointParent: 0,
		jointAxis: "x",
		color: 0x1a1a2e,
	},
];

// ─── Species → Parts lookup ───

export const SPECIES_PARTS: Partial<Record<SpeciesId, CreaturePartDef[]>> = {
	morker: MORKER_PARTS,
	lyktgubbe: LYKTGUBBE_PARTS,
	skogssnigle: SKOGSSNIGEL_PARTS,
	trana: TRANA_PARTS,
};

export const DEFAULT_PARTS = MORKER_PARTS;
