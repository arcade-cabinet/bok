import * as THREE from 'three';

/** Supported particle effect types. */
export type ParticleType = 'blockBreak' | 'enemyDeath' | 'sprintDust' | 'ambient' | 'hit';

/** Internal state for a single particle. */
interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
  gravity: number;
  active: boolean;
}

const MAX_PARTICLES = 200;
const DUMMY = new THREE.Object3D();
const PARTICLE_SIZE = 0.08;

/**
 * InstancedMesh-based particle system with a fixed 200-particle budget.
 * Dead particles are recycled for new emissions.
 */
export class ParticleSystem {
  readonly #mesh: THREE.InstancedMesh;
  readonly #particles: Particle[] = [];
  readonly #colorAttr: THREE.InstancedBufferAttribute;

  constructor() {
    const geometry = new THREE.BoxGeometry(PARTICLE_SIZE, PARTICLE_SIZE, PARTICLE_SIZE);
    const material = new THREE.MeshBasicMaterial({ transparent: true, vertexColors: true });

    // Per-instance color buffer (RGB)
    const colors = new Float32Array(MAX_PARTICLES * 3);
    this.#colorAttr = new THREE.InstancedBufferAttribute(colors, 3);
    geometry.setAttribute('instanceColor', this.#colorAttr);
    // Override material to use instance color
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <color_pars_vertex>', 'attribute vec3 instanceColor;\nvarying vec3 vInstanceColor;')
        .replace('#include <color_vertex>', 'vInstanceColor = instanceColor;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <color_pars_fragment>', 'varying vec3 vInstanceColor;')
        .replace('#include <color_fragment>', 'diffuseColor.rgb *= vInstanceColor;');
    };

    this.#mesh = new THREE.InstancedMesh(geometry, material, MAX_PARTICLES);
    this.#mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.#mesh.frustumCulled = false;

    // Initialize particle pool
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.#particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0,
        color: new THREE.Color(1, 1, 1),
        gravity: 0,
        active: false,
      });
      // Start all particles at scale 0 (invisible)
      DUMMY.position.set(0, -1000, 0);
      DUMMY.scale.set(0, 0, 0);
      DUMMY.updateMatrix();
      this.#mesh.setMatrixAt(i, DUMMY.matrix);
    }
    this.#mesh.instanceMatrix.needsUpdate = true;
  }

  /** The Three.js mesh to add to a scene. */
  get mesh(): THREE.InstancedMesh {
    return this.#mesh;
  }

  /**
   * Emit particles of a given type at a position.
   * @param type - The particle effect type
   * @param position - World-space emission point
   * @param count - How many particles to emit
   * @param color - Override color (hex number), or use type default
   */
  emit(type: ParticleType, position: { x: number; y: number; z: number }, count: number, color?: number): void {
    const cfg = PARTICLE_CONFIGS[type];
    const emitColor = color !== undefined ? new THREE.Color(color) : cfg.color.clone();

    for (let i = 0; i < count; i++) {
      const p = this.#findDeadParticle();
      if (!p) break; // Budget exhausted

      p.active = true;
      p.life = cfg.life + (Math.random() - 0.5) * cfg.lifeVariance;
      p.maxLife = p.life;
      p.gravity = cfg.gravity;
      p.color.copy(emitColor);

      // Scatter position slightly
      p.position.set(
        position.x + (Math.random() - 0.5) * cfg.spread,
        position.y + (Math.random() - 0.5) * cfg.spread,
        position.z + (Math.random() - 0.5) * cfg.spread,
      );

      // Randomized velocity
      p.velocity.set(
        (Math.random() - 0.5) * cfg.speed,
        Math.random() * cfg.speed * cfg.upBias,
        (Math.random() - 0.5) * cfg.speed,
      );
    }
  }

  /** Advance all particles by dt seconds. Applies gravity, velocity, and lifetime. */
  update(dt: number): void {
    let needsUpdate = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.#particles[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        // Hide particle
        DUMMY.position.set(0, -1000, 0);
        DUMMY.scale.set(0, 0, 0);
        DUMMY.updateMatrix();
        this.#mesh.setMatrixAt(i, DUMMY.matrix);
        needsUpdate = true;
        continue;
      }

      // Physics
      p.velocity.y += p.gravity * dt;
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.z += p.velocity.z * dt;

      // Fade alpha via scale (shrink as life drains)
      const lifeRatio = p.life / p.maxLife;
      const scale = lifeRatio;

      DUMMY.position.copy(p.position);
      DUMMY.scale.set(scale, scale, scale);
      DUMMY.updateMatrix();
      this.#mesh.setMatrixAt(i, DUMMY.matrix);

      // Update instance color
      this.#colorAttr.setXYZ(i, p.color.r, p.color.g, p.color.b);

      needsUpdate = true;
    }

    if (needsUpdate) {
      this.#mesh.instanceMatrix.needsUpdate = true;
      this.#colorAttr.needsUpdate = true;
    }
  }

  #findDeadParticle(): Particle | null {
    for (const p of this.#particles) {
      if (!p.active) return p;
    }
    return null;
  }
}

// --- Per-type emission configs ---

interface ParticleConfig {
  color: THREE.Color;
  life: number;
  lifeVariance: number;
  speed: number;
  upBias: number;
  gravity: number;
  spread: number;
}

const PARTICLE_CONFIGS: Record<ParticleType, ParticleConfig> = {
  blockBreak: {
    color: new THREE.Color(0x8b6914), // Brown dust default; caller usually overrides
    life: 0.6,
    lifeVariance: 0.2,
    speed: 2.0,
    upBias: 1.5,
    gravity: -6,
    spread: 0.3,
  },
  enemyDeath: {
    color: new THREE.Color(0xcc2222), // Red burst
    life: 0.8,
    lifeVariance: 0.3,
    speed: 3.0,
    upBias: 2.0,
    gravity: -4,
    spread: 0.5,
  },
  sprintDust: {
    color: new THREE.Color(0x8b7355), // Brown ground
    life: 0.4,
    lifeVariance: 0.1,
    speed: 1.0,
    upBias: 0.5,
    gravity: -8,
    spread: 0.2,
  },
  ambient: {
    color: new THREE.Color(0xffffff), // White motes (day); green fireflies via color override
    life: 3.0,
    lifeVariance: 1.0,
    speed: 0.3,
    upBias: 1.0,
    gravity: -0.2,
    spread: 5.0,
  },
  hit: {
    color: new THREE.Color(0xffcc00), // Spark yellow
    life: 0.3,
    lifeVariance: 0.1,
    speed: 4.0,
    upBias: 1.0,
    gravity: -3,
    spread: 0.1,
  },
};
