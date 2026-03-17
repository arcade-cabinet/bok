/**
 * Creature part assembly and variation functions.
 * Creates Three.js mesh groups from part definitions; variation applies per-individual noise.
 * Part definition data lives in creature-part-defs.ts.
 */

import * as THREE from "three";
import type { SpeciesId } from "../ecs/traits/index.ts";
import { DEFAULT_PARTS, SPECIES_PARTS } from "./creature-part-defs.ts";

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
	/** Use additive blending (for glowing effects like lyktgubbar). */
	additive?: boolean;
}

export interface AssembledCreature {
	root: THREE.Group;
	parts: THREE.Group[];
	lodMesh: THREE.Mesh;
	/** Optional point light for glowing creatures (e.g. Lyktgubbe). */
	pointLight: THREE.PointLight | null;
}

// ─── Constants ───

export const LOD_DISTANCE = 30;
export const LOD_DISTANCE_SQ = LOD_DISTANCE * LOD_DISTANCE;

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
	return SPECIES_PARTS[species] ?? DEFAULT_PARTS;
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

/** Assemble a creature from part definitions into a Three.js Group hierarchy. */
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
		if (def.additive) {
			mat.blending = THREE.AdditiveBlending;
			mat.transparent = true;
			mat.depthWrite = false;
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

	let pointLight: THREE.PointLight | null = null;
	if (defs.some((d) => d.additive)) {
		const lightColor = defs[0].emissive ?? defs[0].color;
		pointLight = new THREE.PointLight(applyHueVariation(lightColor, variant), 1.5, 8);
		pointLight.position.set(0, 0.5, 0);
		root.add(pointLight);
	}

	return { root, parts: partGroups, lodMesh, pointLight };
}

function createLodMesh(defs: CreaturePartDef[], variant: number): THREE.Mesh {
	const primaryColor = defs.length > 0 ? applyHueVariation(defs[0].color, variant) : 0x888888;
	const geo = new THREE.BoxGeometry(0.6, 1.0, 0.6);
	const mat = new THREE.MeshLambertMaterial({ color: primaryColor });
	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.y = 0.5;
	mesh.castShadow = true;
	return mesh;
}

/** Update LOD visibility based on distance squared to camera. */
export function updateLod(assembled: AssembledCreature, distSq: number): boolean {
	const isLod = distSq > LOD_DISTANCE_SQ;
	assembled.lodMesh.visible = isLod;
	for (const part of assembled.parts) {
		part.visible = !isLod;
	}
	return isLod;
}
