/**
 * Creature part definitions and assembly functions.
 * Defines creatures as arrays of geometric primitives with joint hierarchy.
 * Assembly creates Three.js mesh groups; variation applies per-individual noise.
 */

import * as THREE from "three";
import type { SpeciesId } from "../ecs/traits/index.ts";

// ─── Types ───

export type GeometryType = "box" | "sphere" | "cone";
export type JointAxis = "x" | "y" | "z" | null;

export interface CreaturePartDef {
	geometry: GeometryType;
	size: [number, number, number];
	offset: [number, number, number];
	jointParent: number; // -1 = root
	jointAxis: JointAxis;
	color: number;
	emissive?: number;
}

export interface AssembledCreature {
	root: THREE.Group;
	parts: THREE.Group[];
	lodMesh: THREE.Mesh;
}

// ─── Constants ───

/** Distance in blocks beyond which creatures switch to LOD mesh */
export const LOD_DISTANCE = 30;
export const LOD_DISTANCE_SQ = LOD_DISTANCE * LOD_DISTANCE;

// ─── Part Definitions ───

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

const SPECIES_PARTS: Partial<Record<SpeciesId, CreaturePartDef[]>> = {
	morker: MORKER_PARTS,
};

// ─── Variation ───

/** Apply ±10% scale variation. variant is [0,1], centered at 0.5. */
export function applyScaleVariation(base: number, variant: number): number {
	return base * (1 + (variant - 0.5) * 0.2);
}

/** Apply ±5% hue shift. Works in HSL space. */
export function applyHueVariation(hexColor: number, variant: number): number {
	const r = (hexColor >> 16) & 0xff;
	const g = (hexColor >> 8) & 0xff;
	const b = hexColor & 0xff;

	const c = new THREE.Color(r / 255, g / 255, b / 255);
	const hsl = { h: 0, s: 0, l: 0 };
	c.getHSL(hsl);

	hsl.h = (((hsl.h + (variant - 0.5) * 0.1) % 1) + 1) % 1;
	c.setHSL(hsl.h, hsl.s, hsl.l);

	return (Math.round(c.r * 255) << 16) | (Math.round(c.g * 255) << 8) | Math.round(c.b * 255);
}

// ─── Geometry Factory ───

function createGeometry(type: GeometryType, size: [number, number, number]): THREE.BufferGeometry {
	switch (type) {
		case "box":
			return new THREE.BoxGeometry(size[0], size[1], size[2]);
		case "sphere":
			return new THREE.SphereGeometry(size[0], 6, 4);
		case "cone":
			return new THREE.ConeGeometry(size[0], size[1], 6);
	}
}

// ─── Assembly ───

/** Look up part definitions for a species. Falls back to Mörker. */
export function getPartDefs(species: SpeciesId): CreaturePartDef[] {
	return SPECIES_PARTS[species] ?? MORKER_PARTS;
}

/** Validate part definitions: all jointParent refs are in range. */
export function validatePartDefs(parts: CreaturePartDef[]): boolean {
	for (let i = 0; i < parts.length; i++) {
		const p = parts[i].jointParent;
		if (p !== -1 && (p < 0 || p >= i)) return false;
	}
	return parts.length > 0;
}

/** Build joint parent→children adjacency list from part defs. */
export function buildJointHierarchy(parts: CreaturePartDef[]): number[][] {
	const children: number[][] = Array.from({ length: parts.length }, () => []);
	for (let i = 0; i < parts.length; i++) {
		const p = parts[i].jointParent;
		if (p >= 0) children[p].push(i);
	}
	return children;
}

/**
 * Assemble a creature from part definitions into a Three.js Group hierarchy.
 * Each part becomes a Group (for joint rotation) containing a Mesh.
 * Children are nested under their parent's Group.
 */
export function assembleCreature(species: SpeciesId, variant: number): AssembledCreature {
	const defs = getPartDefs(species);
	const partGroups: THREE.Group[] = [];
	const root = new THREE.Group();

	for (let i = 0; i < defs.length; i++) {
		const def = defs[i];
		const group = new THREE.Group();
		group.position.set(...def.offset);
		group.userData = { jointAxis: def.jointAxis, partIndex: i, originalY: def.offset[1] };

		const scaledSize: [number, number, number] = [
			applyScaleVariation(def.size[0], variant),
			applyScaleVariation(def.size[1], variant),
			applyScaleVariation(def.size[2], variant),
		];

		const geo = createGeometry(def.geometry, scaledSize);
		const color = applyHueVariation(def.color, variant);
		const mat = def.emissive ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color });

		if (def.emissive) {
			(mat as THREE.MeshBasicMaterial).color.setHex(applyHueVariation(def.emissive, variant));
		}

		const mesh = new THREE.Mesh(geo, mat);
		mesh.castShadow = !def.emissive;
		group.add(mesh);

		if (def.jointParent === -1) {
			root.add(group);
		} else {
			partGroups[def.jointParent].add(group);
		}

		partGroups.push(group);
	}

	const lodMesh = createLodMesh(defs, variant);
	lodMesh.visible = false;
	root.add(lodMesh);

	return { root, parts: partGroups, lodMesh };
}

/** Create a single-box LOD mesh using the first part's color. */
function createLodMesh(defs: CreaturePartDef[], variant: number): THREE.Mesh {
	const primaryColor = defs.length > 0 ? applyHueVariation(defs[0].color, variant) : 0x888888;
	const geo = new THREE.BoxGeometry(0.6, 1.0, 0.6);
	const mat = new THREE.MeshLambertMaterial({ color: primaryColor });
	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.y = 0.5;
	mesh.castShadow = true;
	return mesh;
}

/**
 * Update LOD visibility based on distance squared to camera.
 * Returns true if showing LOD (distant), false if showing full parts.
 */
export function updateLod(assembled: AssembledCreature, distSq: number): boolean {
	const isLod = distSq > LOD_DISTANCE_SQ;
	assembled.lodMesh.visible = isLod;
	for (const part of assembled.parts) {
		part.visible = !isLod;
	}
	return isLod;
}
