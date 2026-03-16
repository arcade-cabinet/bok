/**
 * Ambient floating particles — drift upward, change color with time of day.
 * Ported from box.html's ambientParticles.
 */

import { Behavior } from "@jolly-pixel/engine";
import * as THREE from "three";
import { cosmeticRng } from "../../world/noise.ts";

const PARTICLE_COUNT = 300;

export class AmbientParticlesBehavior extends Behavior {
	private particles!: THREE.Points;
	private mat!: THREE.PointsMaterial;

	// Set externally each frame
	public timeOfDay = 0.25;
	public playerX = 0;
	public playerY = 0;
	public playerZ = 0;

	setup(scene: THREE.Scene) {
		const geo = new THREE.BufferGeometry();
		const pos: number[] = [];
		for (let i = 0; i < PARTICLE_COUNT; i++) {
			pos.push((cosmeticRng() - 0.5) * 40, (cosmeticRng() - 0.5) * 40, (cosmeticRng() - 0.5) * 40);
		}
		geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));

		this.mat = new THREE.PointsMaterial({
			color: 0xffffff,
			size: 0.1,
			transparent: true,
			opacity: 0.3,
		});

		this.particles = new THREE.Points(geo, this.mat);
		// Fixed conservative bounding sphere to prevent frustum culling after position mutations
		this.particles.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 50);
		scene.add(this.particles);
	}

	awake() {
		this.needUpdate = true;
	}

	update(dt: number) {
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
		for (let i = 0; i < PARTICLE_COUNT; i++) {
			positions[i * 3 + 1] += dt * 0.5;
			if (positions[i * 3 + 1] - this.playerY > 20) positions[i * 3 + 1] -= 40;
			if (positions[i * 3 + 1] - this.playerY < -20) positions[i * 3 + 1] += 40;
			if (positions[i * 3] - this.playerX > 20) positions[i * 3] -= 40;
			if (positions[i * 3] - this.playerX < -20) positions[i * 3] += 40;
			if (positions[i * 3 + 2] - this.playerZ > 20) positions[i * 3 + 2] -= 40;
			if (positions[i * 3 + 2] - this.playerZ < -20) positions[i * 3 + 2] += 40;
		}
		this.particles.geometry.attributes.position.needsUpdate = true;
	}
}
