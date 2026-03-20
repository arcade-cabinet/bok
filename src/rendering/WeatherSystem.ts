import * as THREE from 'three';

/** Weather effect descriptor for a biome. */
interface WeatherEffect {
  /** Particle color. */
  color: THREE.Color;
  /** Particles per second emission rate. */
  rate: number;
  /** Individual particle lifetime in seconds. */
  life: number;
  /** Velocity applied to each particle. */
  velocity: THREE.Vector3;
  /** Spread radius around the camera for spawning. */
  spread: number;
  /** Gravity applied per second. */
  gravity: number;
  /** Additional fog density to layer on top of the scene fog. */
  fogDensityBoost: number;
}

/** Internal weather particle. */
interface WeatherParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  active: boolean;
}

const MAX_WEATHER_PARTICLES = 300;
const DUMMY = new THREE.Object3D();
const PARTICLE_SIZE = 0.06;

/**
 * Per-biome weather effects: sandstorms, blizzards, fog, ember rain.
 * Manages its own InstancedMesh independently of ParticleSystem.
 */
export class WeatherSystem {
  readonly #mesh: THREE.InstancedMesh;
  readonly #particles: WeatherParticle[] = [];
  #effect: WeatherEffect | null = null;
  #emitAccum = 0;
  #active = false;

  /** Reference position (camera) for centering weather around the player. */
  cameraPosition: THREE.Vector3 = new THREE.Vector3();

  constructor() {
    const geometry = new THREE.BoxGeometry(PARTICLE_SIZE, PARTICLE_SIZE, PARTICLE_SIZE);
    const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.7 });

    this.#mesh = new THREE.InstancedMesh(geometry, material, MAX_WEATHER_PARTICLES);
    this.#mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.#mesh.frustumCulled = false;
    this.#mesh.visible = false;

    for (let i = 0; i < MAX_WEATHER_PARTICLES; i++) {
      this.#particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        active: false,
      });
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

  /** Whether weather is currently active. */
  get active(): boolean {
    return this.#active;
  }

  /**
   * Set the weather effect for a biome. Pass a biome ID to activate
   * the corresponding weather, or a biome with no special weather to deactivate.
   */
  setWeather(biomeId: string): void {
    const effect = BIOME_WEATHER[biomeId];
    if (!effect) {
      this.clear();
      return;
    }

    this.#effect = effect;
    this.#active = true;
    this.#emitAccum = 0;
    this.#mesh.visible = true;

    // Apply weather color to material
    const mat = this.#mesh.material as THREE.MeshBasicMaterial;
    mat.color.copy(effect.color);
  }

  /** Advance weather particles by dt seconds. */
  update(dt: number): void {
    if (!this.#active || !this.#effect) return;

    const effect = this.#effect;

    // Emit new particles
    this.#emitAccum += effect.rate * dt;
    while (this.#emitAccum >= 1) {
      this.#emitAccum -= 1;
      this.#emitParticle(effect);
    }

    // Update existing particles
    let needsUpdate = false;
    for (let i = 0; i < MAX_WEATHER_PARTICLES; i++) {
      const p = this.#particles[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        DUMMY.position.set(0, -1000, 0);
        DUMMY.scale.set(0, 0, 0);
        DUMMY.updateMatrix();
        this.#mesh.setMatrixAt(i, DUMMY.matrix);
        needsUpdate = true;
        continue;
      }

      p.velocity.y += effect.gravity * dt;
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.z += p.velocity.z * dt;

      DUMMY.position.copy(p.position);
      DUMMY.scale.set(1, 1, 1);
      DUMMY.updateMatrix();
      this.#mesh.setMatrixAt(i, DUMMY.matrix);
      needsUpdate = true;
    }

    if (needsUpdate) {
      this.#mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** Stop all weather effects and hide particles. */
  clear(): void {
    this.#active = false;
    this.#effect = null;
    this.#mesh.visible = false;

    for (let i = 0; i < MAX_WEATHER_PARTICLES; i++) {
      this.#particles[i].active = false;
      DUMMY.position.set(0, -1000, 0);
      DUMMY.scale.set(0, 0, 0);
      DUMMY.updateMatrix();
      this.#mesh.setMatrixAt(i, DUMMY.matrix);
    }
    this.#mesh.instanceMatrix.needsUpdate = true;
  }

  #emitParticle(effect: WeatherEffect): void {
    const p = this.#findDead();
    if (!p) return;

    p.active = true;
    p.life = effect.life + (Math.random() - 0.5) * effect.life * 0.3;

    // Spawn around camera position
    p.position.set(
      this.cameraPosition.x + (Math.random() - 0.5) * effect.spread * 2,
      this.cameraPosition.y + Math.random() * effect.spread,
      this.cameraPosition.z + (Math.random() - 0.5) * effect.spread * 2,
    );

    p.velocity.copy(effect.velocity);
    // Add slight randomness
    p.velocity.x += (Math.random() - 0.5) * 0.5;
    p.velocity.z += (Math.random() - 0.5) * 0.5;
  }

  #findDead(): WeatherParticle | null {
    for (const p of this.#particles) {
      if (!p.active) return p;
    }
    return null;
  }
}

// --- Biome weather configs ---

const BIOME_WEATHER: Record<string, WeatherEffect> = {
  desert: {
    color: new THREE.Color(0xd2b48c), // Tan sandstorm
    rate: 80,
    life: 2.0,
    velocity: new THREE.Vector3(6, -0.5, 2), // Horizontal driven
    spread: 15,
    gravity: -0.5,
    fogDensityBoost: 0.03,
  },
  tundra: {
    color: new THREE.Color(0xeeeeff), // White blizzard
    rate: 100,
    life: 3.0,
    velocity: new THREE.Vector3(2, -1.5, 1), // Diagonal fall
    spread: 20,
    gravity: -0.3,
    fogDensityBoost: 0.02,
  },
  swamp: {
    color: new THREE.Color(0x556b2f), // Green-grey fog
    rate: 20,
    life: 5.0,
    velocity: new THREE.Vector3(0.1, 0.05, 0.1),
    spread: 25,
    gravity: 0,
    fogDensityBoost: 0.06, // Heavy volumetric fog
  },
  volcanic: {
    color: new THREE.Color(0xff6600), // Orange ember rain
    rate: 40,
    life: 2.5,
    velocity: new THREE.Vector3(0.3, -3, 0.2), // Falling embers
    spread: 15,
    gravity: -1,
    fogDensityBoost: 0.01,
  },
};
