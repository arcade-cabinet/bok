/**
 * CreatureRendererBehavior — manages multi-part creature meshes.
 * Uses creature-parts.ts for assembly; each creature is a joint hierarchy
 * of geometric primitives with per-individual scale/color variation.
 * LOD switches to single box beyond 30 blocks.
 */

import { Behavior } from "@jolly-pixel/engine";
import * as THREE from "three";
import type { AnimStateId, SpeciesId } from "../../ecs/traits/index.ts";
import { type AssembledCreature, assembleCreature, LOD_DISTANCE_SQ, updateLod } from "../creature-parts.ts";

const MAX_POOL = 16;

interface PoolEntry {
	assembled: AssembledCreature | null;
	active: boolean;
	entityId: number;
	species: SpeciesId | null;
	variant: number;
	targetX: number;
	targetY: number;
	targetZ: number;
	animState: AnimStateId;
	isDaytime: boolean;
}

function createEmptyEntry(): PoolEntry {
	return {
		assembled: null,
		active: false,
		entityId: -1,
		species: null,
		variant: 0,
		targetX: 0,
		targetY: 0,
		targetZ: 0,
		animState: "idle",
		isDaytime: false,
	};
}

export class CreatureRendererBehavior extends Behavior {
	private scene: THREE.Scene | null = null;
	private pool: PoolEntry[] = [];
	private camX = 0;
	private camY = 0;
	private camZ = 0;

	setup(scene: THREE.Scene) {
		this.scene = scene;
		this.needUpdate = true;
		for (let i = 0; i < MAX_POOL; i++) {
			this.pool.push(createEmptyEntry());
		}
	}

	/** Set camera position for LOD distance calculations. */
	setCameraPosition(x: number, y: number, z: number) {
		this.camX = x;
		this.camY = y;
		this.camZ = z;
	}

	assignMesh(entityId: number, species: SpeciesId = "morker", variant = 0.5): number {
		if (!this.scene) return -1;
		for (let i = 0; i < this.pool.length; i++) {
			const entry = this.pool[i];
			if (!entry.active) {
				const assembled = assembleCreature(species, variant);
				this.scene.add(assembled.root);

				entry.assembled = assembled;
				entry.active = true;
				entry.entityId = entityId;
				entry.species = species;
				entry.variant = variant;
				assembled.root.visible = true;
				return i;
			}
		}
		return -1;
	}

	releaseMesh(entityId: number) {
		for (const entry of this.pool) {
			if (entry.entityId === entityId && entry.assembled) {
				entry.active = false;
				entry.entityId = -1;
				entry.species = null;
				entry.assembled.root.visible = false;
				this.scene?.remove(entry.assembled.root);
				disposeAssembled(entry.assembled);
				entry.assembled = null;
				return;
			}
		}
	}

	updatePosition(entityId: number, x: number, y: number, z: number, animState: AnimStateId, isDaytime: boolean) {
		for (const entry of this.pool) {
			if (entry.entityId === entityId && entry.active) {
				entry.targetX = x;
				entry.targetY = y;
				entry.targetZ = z;
				entry.animState = animState;
				entry.isDaytime = isDaytime;
				break;
			}
		}
	}

	update(dt: number) {
		const now = performance.now();
		for (const entry of this.pool) {
			if (!entry.active || !entry.assembled) continue;

			const root = entry.assembled.root;
			const lerp = Math.min(1, dt * 10);
			root.position.x += (entry.targetX - root.position.x) * lerp;
			root.position.y += (entry.targetY - root.position.y) * lerp;
			root.position.z += (entry.targetZ - root.position.z) * lerp;

			// Face movement direction
			const dx = entry.targetX - root.position.x;
			const dz = entry.targetZ - root.position.z;
			if (dx * dx + dz * dz > 0.001) {
				root.rotation.y = Math.atan2(dx, dz);
			}

			// LOD
			const cx = root.position.x - this.camX;
			const cy = root.position.y - this.camY;
			const cz = root.position.z - this.camZ;
			const distSq = cx * cx + cy * cy + cz * cz;
			const isLod = updateLod(entry.assembled, distSq);

			if (!isLod) {
				animateJoints(entry, now);
			}
		}
	}

	dispose() {
		if (!this.scene) return;
		for (const entry of this.pool) {
			if (entry.assembled) {
				this.scene.remove(entry.assembled.root);
				disposeAssembled(entry.assembled);
				entry.assembled = null;
			}
		}
		this.pool.length = 0;
	}
}

/** Animate joint rotations based on anim state. */
function animateJoints(entry: PoolEntry, now: number) {
	const { assembled, animState, entityId, isDaytime } = entry;
	if (!assembled) return;
	const t = now * 0.003 + entityId;
	const parts = assembled.parts;

	// Body bob (part 0)
	if (parts[0]) {
		const bobAmount = animState === "chase" || animState === "attack" ? 0.08 : 0.04;
		const bobSpeed = animState === "chase" ? 2 : 1;
		parts[0].position.y = getOriginalY(parts[0]) + Math.sin(t * bobSpeed) * bobAmount;
	}

	// Head look (part 1)
	if (parts[1]) {
		parts[1].rotation.y = Math.sin(t * 0.7) * 0.15;
	}

	// Arm swing (parts 4, 5)
	const swingAmp = animState === "chase" ? 0.6 : animState === "attack" ? 0.8 : 0.15;
	const swingSpeed = animState === "chase" ? 3 : animState === "attack" ? 5 : 1;
	if (parts[4]) {
		parts[4].rotation.x = Math.sin(t * swingSpeed) * swingAmp;
	}
	if (parts[5]) {
		parts[5].rotation.x = Math.sin(t * swingSpeed + Math.PI) * swingAmp;
	}

	// Daytime tint: body parts go orange when burning
	if (parts[0]?.children[0]) {
		const bodyMesh = parts[0].children[0] as THREE.Mesh;
		const mat = bodyMesh.material as THREE.MeshLambertMaterial;
		if (isDaytime) {
			mat.color.setHex(0xff6600);
		} else if (mat.color.getHex() === 0xff6600) {
			// Restore original color (approximate: re-read from part defs is too expensive)
			mat.color.setHex(0x1a1a2e);
		}
	}

	// Eye aggro glow (parts 2, 3)
	const isAggro = animState === "chase" || animState === "attack";
	for (const eyeIdx of [2, 3]) {
		if (parts[eyeIdx]?.children[0]) {
			const eyeMesh = parts[eyeIdx].children[0] as THREE.Mesh;
			const eyeMat = eyeMesh.material as THREE.MeshBasicMaterial;
			eyeMat.color.setHex(isAggro ? 0xff0000 : 0xff4444);
		}
	}
}

/** Get original Y offset stored during assembly. */
function getOriginalY(group: THREE.Group): number {
	return (group.userData.originalY as number) ?? group.position.y;
}

/** Recursively dispose all geometries and materials in an assembled creature. */
function disposeAssembled(assembled: AssembledCreature) {
	for (const part of assembled.parts) {
		for (const child of part.children) {
			if (child instanceof THREE.Mesh) {
				child.geometry.dispose();
				if (child.material instanceof THREE.Material) {
					child.material.dispose();
				}
			}
		}
	}
	// Dispose LOD mesh
	if (assembled.lodMesh) {
		assembled.lodMesh.geometry.dispose();
		if (assembled.lodMesh.material instanceof THREE.Material) {
			assembled.lodMesh.material.dispose();
		}
	}
}
