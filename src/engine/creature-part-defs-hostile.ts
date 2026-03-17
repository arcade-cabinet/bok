/**
 * Part definitions for hostile creatures — Runväktare, Lindorm, Draugar.
 * Pure data, no Three.js. Consumed by creature-parts.ts for assembly.
 */

import type { CreaturePartDef } from "./creature-parts.ts";

// ─── Runväktare (Rune Warden) ───
// Tall stone column (2 wide, 4 tall), flat slab head, ember eyes, segmented stone arms.

export const RUNVAKTARE_PARTS: CreaturePartDef[] = [
	// 0: main body column — tall stone pillar
	{ geometry: "box", size: [1.0, 2.0, 0.6], offset: [0, 1.0, 0], jointParent: -1, jointAxis: null, color: 0x6b6b6b },
	// 1: upper body column
	{ geometry: "box", size: [0.9, 1.5, 0.5], offset: [0, 1.8, 0], jointParent: 0, jointAxis: null, color: 0x6b6b6b },
	// 2: flat slab head
	{ geometry: "box", size: [1.2, 0.3, 0.7], offset: [0, 1.0, 0], jointParent: 1, jointAxis: null, color: 0x5a5a6a },
	// 3-4: ember eyes
	{
		geometry: "sphere",
		size: [0.08, 0.08, 0.08],
		offset: [-0.25, 0, -0.36],
		jointParent: 2,
		jointAxis: null,
		color: 0xc9a84c,
		emissive: 0xc9a84c,
	},
	{
		geometry: "sphere",
		size: [0.08, 0.08, 0.08],
		offset: [0.25, 0, -0.36],
		jointParent: 2,
		jointAxis: null,
		color: 0xc9a84c,
		emissive: 0xc9a84c,
	},
	// 5-6: rune glow planes on body
	{
		geometry: "box",
		size: [0.1, 0.6, 0.02],
		offset: [-0.3, 0.2, -0.32],
		jointParent: 0,
		jointAxis: null,
		color: 0xc9a84c,
		emissive: 0xc9a84c,
	},
	{
		geometry: "box",
		size: [0.1, 0.6, 0.02],
		offset: [0.3, 0.2, -0.32],
		jointParent: 0,
		jointAxis: null,
		color: 0xc9a84c,
		emissive: 0xc9a84c,
	},
	// 7-8: left arm (segmented stone)
	{ geometry: "box", size: [0.3, 0.8, 0.3], offset: [-0.65, 0.5, 0], jointParent: 1, jointAxis: "x", color: 0x6b6b6b },
	{ geometry: "box", size: [0.4, 0.15, 0.5], offset: [0, -0.5, 0], jointParent: 7, jointAxis: "x", color: 0x5a5a6a },
	// 9-10: right arm (segmented stone)
	{ geometry: "box", size: [0.3, 0.8, 0.3], offset: [0.65, 0.5, 0], jointParent: 1, jointAxis: "x", color: 0x6b6b6b },
	{ geometry: "box", size: [0.4, 0.15, 0.5], offset: [0, -0.5, 0], jointParent: 9, jointAxis: "x", color: 0x5a5a6a },
];

// ─── Lindorm (Wyrm) ───
// 12-segment chain of rounded boxes, head with cone snout and horns.
// Pale birch-bark color with ember rune markings.

export const LINDORM_PARTS: CreaturePartDef[] = [
	// 0: head — larger box with rune markings
	{ geometry: "box", size: [0.5, 0.4, 0.6], offset: [0, 0.3, 0], jointParent: -1, jointAxis: "y", color: 0xc9b896 },
	// 1: snout cone
	{ geometry: "cone", size: [0.15, 0.3, 0.15], offset: [0, 0, -0.4], jointParent: 0, jointAxis: null, color: 0xc9b896 },
	// 2-3: small horn cones
	{
		geometry: "cone",
		size: [0.05, 0.15, 0.05],
		offset: [-0.15, 0.25, -0.1],
		jointParent: 0,
		jointAxis: null,
		color: 0xa3452a,
	},
	{
		geometry: "cone",
		size: [0.05, 0.15, 0.05],
		offset: [0.15, 0.25, -0.1],
		jointParent: 0,
		jointAxis: null,
		color: 0xa3452a,
	},
	// 4-5: eyes
	{
		geometry: "sphere",
		size: [0.06, 0.06, 0.06],
		offset: [-0.15, 0.1, -0.28],
		jointParent: 0,
		jointAxis: null,
		color: 0xa3452a,
		emissive: 0xa3452a,
	},
	{
		geometry: "sphere",
		size: [0.06, 0.06, 0.06],
		offset: [0.15, 0.1, -0.28],
		jointParent: 0,
		jointAxis: null,
		color: 0xa3452a,
		emissive: 0xa3452a,
	},
	// 6-16: 11 body segments (follow-the-leader chain), each slightly narrower
	{ geometry: "box", size: [0.45, 0.35, 0.5], offset: [0, 0, 0.5], jointParent: 0, jointAxis: "y", color: 0xc9b896 },
	{ geometry: "box", size: [0.42, 0.33, 0.5], offset: [0, 0, 0.5], jointParent: 6, jointAxis: "y", color: 0xc9b896 },
	{ geometry: "box", size: [0.4, 0.31, 0.5], offset: [0, 0, 0.5], jointParent: 7, jointAxis: "y", color: 0xc9b896 },
	{ geometry: "box", size: [0.38, 0.29, 0.5], offset: [0, 0, 0.5], jointParent: 8, jointAxis: "y", color: 0xc9b896 },
	{ geometry: "box", size: [0.35, 0.27, 0.5], offset: [0, 0, 0.5], jointParent: 9, jointAxis: "y", color: 0xc9b896 },
	{ geometry: "box", size: [0.32, 0.25, 0.5], offset: [0, 0, 0.5], jointParent: 10, jointAxis: "y", color: 0xc9b896 },
	{ geometry: "box", size: [0.3, 0.23, 0.5], offset: [0, 0, 0.5], jointParent: 11, jointAxis: "y", color: 0xc9b896 },
	{ geometry: "box", size: [0.27, 0.21, 0.5], offset: [0, 0, 0.5], jointParent: 12, jointAxis: "y", color: 0xc9b896 },
	{ geometry: "box", size: [0.24, 0.19, 0.5], offset: [0, 0, 0.5], jointParent: 13, jointAxis: "y", color: 0xc9b896 },
	{ geometry: "box", size: [0.2, 0.17, 0.5], offset: [0, 0, 0.5], jointParent: 14, jointAxis: "y", color: 0xc9b896 },
	{ geometry: "box", size: [0.16, 0.14, 0.4], offset: [0, 0, 0.4], jointParent: 15, jointAxis: "y", color: 0xc9b896 },
];

// ─── Draugar (Restless Dead) ───
// Wireframe humanoid, semi-transparent, frost blue emissive.
// Featureless box head with two dark eye voids.

export const DRAUGAR_PARTS: CreaturePartDef[] = [
	// 0: torso
	{
		geometry: "box",
		size: [0.5, 0.7, 0.3],
		offset: [0, 0.8, 0],
		jointParent: -1,
		jointAxis: null,
		color: 0xaaccee,
		emissive: 0xaaccee,
	},
	// 1: head — featureless box
	{
		geometry: "box",
		size: [0.35, 0.35, 0.3],
		offset: [0, 0.55, 0],
		jointParent: 0,
		jointAxis: null,
		color: 0xaaccee,
		emissive: 0xaaccee,
	},
	// 2-3: dark eye voids
	{
		geometry: "sphere",
		size: [0.06, 0.06, 0.06],
		offset: [-0.08, 0.05, -0.16],
		jointParent: 1,
		jointAxis: null,
		color: 0x1a1a2e,
	},
	{
		geometry: "sphere",
		size: [0.06, 0.06, 0.06],
		offset: [0.08, 0.05, -0.16],
		jointParent: 1,
		jointAxis: null,
		color: 0x1a1a2e,
	},
	// 4-5: arms
	{
		geometry: "box",
		size: [0.15, 0.6, 0.15],
		offset: [-0.35, -0.1, 0],
		jointParent: 0,
		jointAxis: "x",
		color: 0xaaccee,
		emissive: 0xaaccee,
	},
	{
		geometry: "box",
		size: [0.15, 0.6, 0.15],
		offset: [0.35, -0.1, 0],
		jointParent: 0,
		jointAxis: "x",
		color: 0xaaccee,
		emissive: 0xaaccee,
	},
	// 6-7: legs
	{
		geometry: "box",
		size: [0.17, 0.7, 0.17],
		offset: [-0.12, -0.7, 0],
		jointParent: 0,
		jointAxis: "x",
		color: 0xaaccee,
		emissive: 0xaaccee,
	},
	{
		geometry: "box",
		size: [0.17, 0.7, 0.17],
		offset: [0.12, -0.7, 0],
		jointParent: 0,
		jointAxis: "x",
		color: 0xaaccee,
		emissive: 0xaaccee,
	},
];
