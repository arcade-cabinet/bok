/**
 * Particle system — InstancedMesh-based particles for mining, sprinting, enemy death.
 * Standalone renderer (no Jolly Pixel dependency).
 */

import * as THREE from "three";
import { cosmeticRng } from "../world/noise.ts";

interface Particle {
	x: number;
	y: number;
	z: number;
	vx: number;
	vy: number;
	vz: number;
	life: number;
	color: THREE.Color;
}

const DEFAULT_MAX_PARTICLES = 500;
const GRAVITY = 28;

export class ParticlesRenderer {
	private particles: Particle[] = [];
	private particleMesh: THREE.InstancedMesh | null = null;
	private dummy = new THREE.Object3D();
	private maxParticles = DEFAULT_MAX_PARTICLES;
	private scene: THREE.Scene | null = null;

	setup(scene: THREE.Scene, budget = DEFAULT_MAX_PARTICLES) {
		this.scene = scene;
		this.maxParticles = budget;
		this.particleMesh = new THREE.InstancedMesh(
			new THREE.BoxGeometry(0.1, 0.1, 0.1),
			new THREE.MeshLambertMaterial({ color: 0xffffff }),
			this.maxParticles,
		);
		this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		this.particleMesh.count = 0;
		scene.add(this.particleMesh);
	}

	spawn(x: number, y: number, z: number, colorHex: string | number, count = 5) {
		for (let i = 0; i < count; i++) {
			if (this.particles.length >= this.maxParticles) this.particles.shift();
			this.particles.push({
				x: x + 0.5 + (cosmeticRng() - 0.5) * 0.8,
				y: y + 0.5 + (cosmeticRng() - 0.5) * 0.8,
				z: z + 0.5 + (cosmeticRng() - 0.5) * 0.8,
				vx: (cosmeticRng() - 0.5) * 6,
				vy: cosmeticRng() * 4 + 2,
				vz: (cosmeticRng() - 0.5) * 6,
				life: 1.0,
				color: new THREE.Color(colorHex),
			});
		}
	}

	update(dt: number) {
		if (!this.particleMesh) return;
		let activeCount = 0;
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life -= dt * 1.5;
			if (p.life <= 0) {
				this.particles.splice(i, 1);
				continue;
			}

			p.vy -= GRAVITY * dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.z += p.vz * dt;

			this.dummy.position.set(p.x, p.y, p.z);
			this.dummy.scale.setScalar(p.life);
			this.dummy.updateMatrix();
			this.particleMesh.setMatrixAt(activeCount, this.dummy.matrix);
			this.particleMesh.setColorAt(activeCount, p.color);
			activeCount++;
		}

		this.particleMesh.count = activeCount;
		this.particleMesh.instanceMatrix.needsUpdate = true;
		if (this.particleMesh.instanceColor) {
			this.particleMesh.instanceColor.needsUpdate = true;
		}
	}

	dispose() {
		if (this.particleMesh) {
			this.scene?.remove(this.particleMesh);
			this.particleMesh.geometry.dispose();
			(this.particleMesh.material as THREE.Material).dispose();
			this.particleMesh = null;
		}
		this.particles.length = 0;
		this.scene = null;
	}
}
