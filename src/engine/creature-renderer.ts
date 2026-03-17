/**
 * CreatureRenderer — manages multi-part creature meshes via a pool.
 * Uses creature-parts.ts for assembly; each creature is a joint hierarchy
 * of geometric primitives with per-individual scale/color variation.
 * LOD switches to single box beyond 30 blocks.
 *
 * Plain class — no Jolly Pixel dependency. Call update(dt) from GameBridge.
 */

import * as THREE from "three";
import type { AnimStateId, SpeciesId } from "../ecs/traits/index.ts";
import { type CreatureAnimState, animateJoints, disposeAssembled } from "./creature-anim.ts";
import { type AssembledCreature, assembleCreature, updateLod } from "./creature-parts.ts";

const MAX_POOL = 16;

interface PoolEntry extends CreatureAnimState {
	assembled: AssembledCreature | null;
	active: boolean;
	variant: number;
	targetX: number;
	targetY: number;
	targetZ: number;
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
		prevAnimState: "idle",
		blendProgress: 1,
		isDaytime: false,
	};
}

export class CreatureRenderer {
	private scene: THREE.Scene | null = null;
	private pool: PoolEntry[] = [];
	private camX = 0;
	private camY = 0;
	private camZ = 0;

	setup(scene: THREE.Scene): void {
		this.scene = scene;
		for (let i = 0; i < MAX_POOL; i++) {
			this.pool.push(createEmptyEntry());
		}
	}

	setCameraPosition(x: number, y: number, z: number): void {
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

	releaseMesh(entityId: number): void {
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

	updatePosition(entityId: number, x: number, y: number, z: number, animState: AnimStateId, isDaytime: boolean): void {
		for (const entry of this.pool) {
			if (entry.entityId === entityId && entry.active) {
				entry.targetX = x;
				entry.targetY = y;
				entry.targetZ = z;
				if (entry.animState !== animState) {
					entry.prevAnimState = entry.animState;
					entry.blendProgress = 0;
				}
				entry.animState = animState;
				entry.isDaytime = isDaytime;
				break;
			}
		}
	}

	update(dt: number): void {
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
				animateJoints(entry, entry.assembled, now, dt);
			}
		}
	}

	dispose(): void {
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
