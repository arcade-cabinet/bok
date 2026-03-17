/**
 * Ambient floating particles — drift upward, change color with time of day.
 * Standalone renderer (no Jolly Pixel dependency).
 */

import * as THREE from "three";
import { cosmeticRng } from "../world/noise.ts";

const DEFAULT_PARTICLE_COUNT = 300;

/** Wrap-around radius — particles recycle when this far from the player. */
const HALF_EXTENT = 20;
const FULL_EXTENT = HALF_EXTENT * 2;

/** Conservative bounding sphere radius to prevent frustum culling. */
const BOUNDING_RADIUS = 50;

export class AmbientParticlesRenderer {
	private particles!: THREE.Points;
	private mat!: THREE.PointsMaterial;
	private particleCount = DEFAULT_PARTICLE_COUNT;
	private scene: THREE.Scene | null = null;

	/** Set externally each frame by the game bridge. */
	public timeOfDay = 0.25;
	public playerX = 0;
	public playerY = 0;
	public playerZ = 0;

	setup(scene: THREE.Scene, count = DEFAULT_PARTICLE_COUNT): void {
		this.scene = scene;
		this.particleCount = count;

		const geo = new THREE.BufferGeometry();
		const pos: number[] = [];
		for (let i = 0; i < this.particleCount; i++) {
			pos.push(
				(cosmeticRng() - 0.5) * FULL_EXTENT,
				(cosmeticRng() - 0.5) * FULL_EXTENT,
				(cosmeticRng() - 0.5) * FULL_EXTENT,
			);
		}
		geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));

		this.mat = new THREE.PointsMaterial({
			color: 0xffffff,
			size: 0.1,
			transparent: true,
			opacity: 0.3,
		});

		this.particles = new THREE.Points(geo, this.mat);
		this.particles.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), BOUNDING_RADIUS);
		scene.add(this.particles);
	}

	update(dt: number): void {
		const timePI = this.timeOfDay * Math.PI * 2;
		const sunHeight = Math.sin(timePI);

		let partColor: THREE.Color;
		let partOp: number;

		if (sunHeight > 0.4) {
			partColor = new THREE.Color(0xffffff);
			partOp = 0.3;
		} else if (sunHeight > 0) {
			partColor = new THREE.Color(0xffddaa);
			partOp = 0.3;
		} else {
			partColor = new THREE.Color(0x88ff00);
			partOp = 0.6;
		}

		const lerpFactor = Math.min(1, dt * 2);
		this.mat.color.lerp(partColor, lerpFactor);
		this.mat.opacity = THREE.MathUtils.lerp(this.mat.opacity, partOp, lerpFactor);

		const positions = this.particles.geometry.attributes.position.array as Float32Array;
		for (let i = 0; i < this.particleCount; i++) {
			const ix = i * 3;
			const iy = ix + 1;
			const iz = ix + 2;
			positions[iy] += dt * 0.5;
			if (positions[iy] - this.playerY > HALF_EXTENT) positions[iy] -= FULL_EXTENT;
			if (positions[iy] - this.playerY < -HALF_EXTENT) positions[iy] += FULL_EXTENT;
			if (positions[ix] - this.playerX > HALF_EXTENT) positions[ix] -= FULL_EXTENT;
			if (positions[ix] - this.playerX < -HALF_EXTENT) positions[ix] += FULL_EXTENT;
			if (positions[iz] - this.playerZ > HALF_EXTENT) positions[iz] -= FULL_EXTENT;
			if (positions[iz] - this.playerZ < -HALF_EXTENT) positions[iz] += FULL_EXTENT;
		}
		this.particles.geometry.attributes.position.needsUpdate = true;
	}

	dispose(): void {
		if (this.scene && this.particles) {
			this.scene.remove(this.particles);
		}
		this.particles?.geometry.dispose();
		this.mat?.dispose();
		this.scene = null;
	}
}
