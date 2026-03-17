/**
 * Block highlight renderer — wireframe box on the block the player is looking at.
 * Uses voxel-stepping raycast from camera center.
 *
 * Plain TS class (no Jolly Pixel Behavior/Actor dependency).
 */

import * as THREE from "three";
import { BlockId } from "../world/blocks.ts";
import { CRACK_STAGES, computeCrackStage } from "./mining-crack-renderer.ts";

export class BlockHighlightRenderer {
	private highlight!: THREE.LineSegments;
	private crackOverlay!: THREE.Mesh;
	private crackMaterial!: THREE.MeshBasicMaterial;
	private camera!: THREE.PerspectiveCamera;
	private getVoxelFn!: (x: number, y: number, z: number) => number;

	private raycaster = new THREE.Raycaster();
	private center = new THREE.Vector2(0, 0);

	/** Current mining progress [0, 1]. Set externally from game-bridge. */
	public miningProgress = 0;

	/** Exposed for external reads (mining system, block placement). */
	public lastHit: { x: number; y: number; z: number; id: number } | null = null;
	public lastPrev: { x: number; y: number; z: number } | null = null;

	setup(scene: THREE.Scene, camera: THREE.PerspectiveCamera, getVoxel: (x: number, y: number, z: number) => number) {
		this.camera = camera;
		this.getVoxelFn = getVoxel;
		this.raycaster.far = 6;

		this.highlight = new THREE.LineSegments(
			new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)),
			new THREE.LineBasicMaterial({
				color: 0xffffff,
				linewidth: 2,
				transparent: true,
				opacity: 0.5,
			}),
		);
		this.highlight.visible = false;
		scene.add(this.highlight);

		// Mining crack overlay — semi-transparent dark plane on the block face
		this.crackMaterial = new THREE.MeshBasicMaterial({
			color: 0x000000,
			transparent: true,
			opacity: 0,
			side: THREE.DoubleSide,
			depthWrite: false,
		});
		this.crackOverlay = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 1.02), this.crackMaterial);
		this.crackOverlay.visible = false;
		scene.add(this.crackOverlay);
	}

	update(_dt: number) {
		this.raycaster.setFromCamera(this.center, this.camera);
		let t = 0;
		const step = 0.05;
		const ray = this.raycaster.ray;
		const pos = new THREE.Vector3();

		this.lastHit = null;
		this.lastPrev = null;

		while (t < 6) {
			ray.at(t, pos);
			const vx = Math.floor(pos.x);
			const vy = Math.floor(pos.y);
			const vz = Math.floor(pos.z);
			const blockId = this.getVoxelFn(vx, vy, vz);
			if (blockId > 0 && blockId !== BlockId.Water) {
				this.lastHit = { x: vx, y: vy, z: vz, id: blockId };
				break;
			}
			this.lastPrev = { x: vx, y: vy, z: vz };
			t += step;
		}

		if (this.lastHit) {
			this.highlight.position.set(this.lastHit.x + 0.5, this.lastHit.y + 0.5, this.lastHit.z + 0.5);
			this.highlight.visible = true;

			// Mining crack overlay
			if (this.miningProgress > 0) {
				const stage = computeCrackStage(this.miningProgress);
				this.crackMaterial.opacity = CRACK_STAGES[stage].opacity;
				this.crackOverlay.position.copy(this.highlight.position);
				// Face the overlay toward the camera
				this.crackOverlay.lookAt(this.camera.position);
				this.crackOverlay.visible = true;
			} else {
				this.crackOverlay.visible = false;
			}
		} else {
			this.highlight.visible = false;
			this.crackOverlay.visible = false;
		}
	}

	dispose() {
		this.highlight.geometry.dispose();
		(this.highlight.material as THREE.Material).dispose();
		this.highlight.removeFromParent();
		this.crackOverlay.geometry.dispose();
		this.crackMaterial.dispose();
		this.crackOverlay.removeFromParent();
	}
}
