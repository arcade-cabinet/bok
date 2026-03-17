/**
 * EnemyRendererBehavior — manages Three.js meshes for ECS enemies.
 * Uses a pool of reusable enemy meshes (red/dark boxes with glowing eyes).
 */

import * as THREE from "three";
import { Behavior } from "../behavior.ts";

const MAX_POOL = 16;

interface EnemyMeshData {
	group: THREE.Group;
	bodyMesh: THREE.Mesh;
	eyeLeft: THREE.Mesh;
	eyeRight: THREE.Mesh;
	active: boolean;
	entityId: number;
	targetX: number;
	targetY: number;
	targetZ: number;
}

export class EnemyRendererBehavior extends Behavior {
	private scene: THREE.Scene | null = null;
	private pool: EnemyMeshData[] = [];

	setup(scene: THREE.Scene) {
		this.scene = scene;
		this.needUpdate = true;

		// Pre-create mesh pool
		const bodyGeo = new THREE.BoxGeometry(0.8, 1.8, 0.8);
		const eyeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.05);

		for (let i = 0; i < MAX_POOL; i++) {
			const group = new THREE.Group();
			group.visible = false;

			const bodyMat = new THREE.MeshLambertMaterial({ color: 0x8b0000 });
			const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
			bodyMesh.position.y = 0.9;
			bodyMesh.castShadow = true;
			group.add(bodyMesh);

			// Glowing eyes
			const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
			const eyeLeft = new THREE.Mesh(eyeGeo, eyeMat);
			eyeLeft.position.set(-0.15, 1.5, -0.38);
			group.add(eyeLeft);

			const eyeRight = new THREE.Mesh(eyeGeo, eyeMat);
			eyeRight.position.set(0.15, 1.5, -0.38);
			group.add(eyeRight);

			scene.add(group);

			this.pool.push({
				group,
				bodyMesh,
				eyeLeft,
				eyeRight,
				active: false,
				entityId: -1,
				targetX: 0,
				targetY: 0,
				targetZ: 0,
			});
		}
	}

	/** Assign a mesh from the pool to a new enemy entity. Returns pool index. */
	assignMesh(entityId: number): number {
		for (let i = 0; i < this.pool.length; i++) {
			if (!this.pool[i].active) {
				this.pool[i].active = true;
				this.pool[i].entityId = entityId;
				this.pool[i].group.visible = true;
				return i;
			}
		}
		return -1; // Pool exhausted
	}

	/** Release a mesh back to the pool when an enemy dies/despawns. */
	releaseMesh(entityId: number) {
		for (const entry of this.pool) {
			if (entry.entityId === entityId) {
				entry.active = false;
				entry.entityId = -1;
				entry.group.visible = false;
				return;
			}
		}
	}

	/** Update the target position for an enemy's mesh (called from game bridge). */
	updatePosition(entityId: number, x: number, y: number, z: number, aiState: number, isDaytime: boolean) {
		for (const entry of this.pool) {
			if (entry.entityId === entityId && entry.active) {
				entry.targetX = x;
				entry.targetY = y;
				entry.targetZ = z;

				// Tint orange when burning in daylight
				const mat = entry.bodyMesh.material as THREE.MeshLambertMaterial;
				mat.color.setHex(isDaytime ? 0xff6600 : 0x8b0000);

				// Eyes glow brighter when chasing/attacking
				const eyeMat = entry.eyeLeft.material as THREE.MeshBasicMaterial;
				eyeMat.color.setHex(aiState >= 1 ? 0xff0000 : 0xff4444);
				break;
			}
		}
	}

	update(dt: number) {
		// Smooth interpolation of mesh positions + idle animation
		for (const entry of this.pool) {
			if (!entry.active) continue;

			const g = entry.group;
			const lerp = Math.min(1, dt * 10);
			g.position.x += (entry.targetX - g.position.x) * lerp;
			g.position.y += (entry.targetY - g.position.y) * lerp;
			g.position.z += (entry.targetZ - g.position.z) * lerp;

			// Face toward target direction (look at player roughly via movement delta)
			const dx = entry.targetX - g.position.x;
			const dz = entry.targetZ - g.position.z;
			if (dx * dx + dz * dz > 0.001) {
				g.rotation.y = Math.atan2(dx, dz);
			}

			// Idle bob
			entry.bodyMesh.position.y = 0.9 + Math.sin(performance.now() * 0.003 + entry.entityId) * 0.05;
		}
	}

	dispose() {
		if (!this.scene) return;
		for (const entry of this.pool) {
			this.scene.remove(entry.group);
			entry.bodyMesh.geometry.dispose();
			(entry.bodyMesh.material as THREE.Material).dispose();
			entry.eyeLeft.geometry.dispose();
			(entry.eyeLeft.material as THREE.Material).dispose();
			entry.eyeRight.geometry.dispose();
			(entry.eyeRight.material as THREE.Material).dispose();
		}
		this.pool.length = 0;
	}
}
