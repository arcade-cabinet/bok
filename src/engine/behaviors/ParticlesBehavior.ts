/**
 * Particle system — InstancedMesh-based particles for mining, sprinting, enemy death.
 * Ported from box.html's particle system.
 */

import * as THREE from "three";
import { Behavior } from "@jolly-pixel/engine";

interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number;
  color: THREE.Color;
}

const MAX_PARTICLES = 500;
const GRAVITY = 28;

export class ParticlesBehavior extends Behavior {
  private particles: Particle[] = [];
  private particleMesh!: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();

  setup(scene: THREE.Scene) {
    this.particleMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
      MAX_PARTICLES,
    );
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.count = 0;
    scene.add(this.particleMesh);
  }

  awake() {
    this.needUpdate = true;
  }

  spawn(x: number, y: number, z: number, colorHex: string | number, count = 5) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      this.particles.push({
        x: x + 0.5 + (Math.random() - 0.5) * 0.8,
        y: y + 0.5 + (Math.random() - 0.5) * 0.8,
        z: z + 0.5 + (Math.random() - 0.5) * 0.8,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 2,
        vz: (Math.random() - 0.5) * 6,
        life: 1.0,
        color: new THREE.Color(colorHex),
      });
    }
  }

  update(dt: number) {
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
}
