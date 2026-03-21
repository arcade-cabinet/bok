import * as THREE from 'three';

/** Time-of-day period. */
export type TimeOfDay = 'morning' | 'midday' | 'dusk' | 'night';

/** Full day/night cycle duration in seconds. */
const CYCLE_DURATION = 240;

/** Sky color keyframes mapped to normalized time (0–1). */
const SKY_KEYFRAMES: Array<{ t: number; color: THREE.Color }> = [
  { t: 0.0, color: new THREE.Color(0x0a0a2e) }, // Midnight
  { t: 0.2, color: new THREE.Color(0x0a0a2e) }, // Late night
  { t: 0.25, color: new THREE.Color(0x87ceeb) }, // Morning
  { t: 0.4, color: new THREE.Color(0x4a90d9) }, // Midday
  { t: 0.6, color: new THREE.Color(0x4a90d9) }, // Afternoon
  { t: 0.75, color: new THREE.Color(0xff6b35) }, // Dusk
  { t: 0.85, color: new THREE.Color(0x0a0a2e) }, // Night
  { t: 1.0, color: new THREE.Color(0x0a0a2e) }, // Midnight (wraps)
];

const STARFIELD_COUNT = 500;
const SUN_RADIUS = 3;
const MOON_RADIUS = 2;
const ORBIT_RADIUS = 80;

/**
 * 240-second day/night cycle with orbiting sun/moon,
 * sky color transitions, directional light tracking, and starfield.
 */
export class DayNightCycle {
  /** Normalized time in the cycle (0 = midnight, 0.5 = noon). */
  #time = 0.4; // Start near midday (0.5 = noon) for bright lighting

  readonly #sun: THREE.Mesh;
  readonly #moon: THREE.Mesh;
  readonly #directionalLight: THREE.DirectionalLight;
  readonly #ambientLight: THREE.AmbientLight;
  readonly #starfield: THREE.Points;
  readonly #skyColor = new THREE.Color(0x87ceeb);

  constructor() {
    // Sun — emissive yellow sphere
    const sunGeo = new THREE.SphereGeometry(SUN_RADIUS, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
    this.#sun = new THREE.Mesh(sunGeo, sunMat);

    // Moon — emissive pale sphere
    const moonGeo = new THREE.SphereGeometry(MOON_RADIUS, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xccccdd });
    this.#moon = new THREE.Mesh(moonGeo, moonMat);

    // Directional light tracks the sun
    this.#directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.#directionalLight.castShadow = false;

    // Ambient fill light — dimmer at night
    this.#ambientLight = new THREE.AmbientLight(0x8090a0, 0.6);

    // Starfield — visible only at night
    const starPositions = new Float32Array(STARFIELD_COUNT * 3);
    for (let i = 0; i < STARFIELD_COUNT; i++) {
      // Distribute on a large sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 150 + Math.random() * 50;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = Math.abs(r * Math.cos(phi)); // Upper hemisphere only
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0 });
    this.#starfield = new THREE.Points(starGeo, starMat);
  }

  /** Objects to add to the Three.js scene. */
  get sceneObjects(): THREE.Object3D[] {
    return [this.#sun, this.#moon, this.#directionalLight, this.#ambientLight, this.#starfield];
  }

  /** Current interpolated sky color. */
  get skyColor(): THREE.Color {
    return this.#skyColor;
  }

  /** Current directional light reference. */
  get directionalLight(): THREE.DirectionalLight {
    return this.#directionalLight;
  }

  /** Current ambient light reference. */
  get ambientLight(): THREE.AmbientLight {
    return this.#ambientLight;
  }

  /** Advance the cycle by dt seconds. */
  update(dt: number): void {
    this.#time = (this.#time + dt / CYCLE_DURATION) % 1.0;

    this.#updateOrbits();
    this.#updateSkyColor();
    this.#updateLighting();
    this.#updateStarfield();
  }

  /** Get the current time-of-day period. */
  getTimeOfDay(): TimeOfDay {
    const t = this.#time;
    if (t >= 0.2 && t < 0.35) return 'morning';
    if (t >= 0.35 && t < 0.65) return 'midday';
    if (t >= 0.65 && t < 0.85) return 'dusk';
    return 'night';
  }

  /** Get the sun's direction vector (normalized, pointing from origin toward sun). */
  getSunDirection(): THREE.Vector3 {
    return this.#sun.position.clone().normalize();
  }

  /** Get the current normalized cycle time (0 = midnight, 0.5 = noon). */
  get normalizedTime(): number {
    return this.#time;
  }

  #updateOrbits(): void {
    // Sun orbits: angle 0 = horizon (dawn), PI/2 = zenith (noon), PI = horizon (dusk)
    const sunAngle = this.#time * Math.PI * 2;
    this.#sun.position.set(Math.cos(sunAngle) * ORBIT_RADIUS, Math.sin(sunAngle) * ORBIT_RADIUS, 0);

    // Moon is opposite the sun
    this.#moon.position.set(-Math.cos(sunAngle) * ORBIT_RADIUS, -Math.sin(sunAngle) * ORBIT_RADIUS, 0);

    // Hide sun/moon when below horizon
    this.#sun.visible = this.#sun.position.y > -5;
    this.#moon.visible = this.#moon.position.y > -5;
  }

  #updateSkyColor(): void {
    const t = this.#time;

    // Find the two keyframes we're between
    let lower = SKY_KEYFRAMES[0];
    let upper = SKY_KEYFRAMES[1];
    for (let i = 0; i < SKY_KEYFRAMES.length - 1; i++) {
      if (t >= SKY_KEYFRAMES[i].t && t <= SKY_KEYFRAMES[i + 1].t) {
        lower = SKY_KEYFRAMES[i];
        upper = SKY_KEYFRAMES[i + 1];
        break;
      }
    }

    const range = upper.t - lower.t;
    const alpha = range > 0 ? (t - lower.t) / range : 0;
    this.#skyColor.copy(lower.color).lerp(upper.color, alpha);
  }

  #updateLighting(): void {
    // Directional light follows sun
    const sunDir = this.getSunDirection();
    this.#directionalLight.position.copy(sunDir.multiplyScalar(50));

    // Light intensity based on sun height
    const sunHeight = Math.max(0, this.#sun.position.y / ORBIT_RADIUS);
    this.#directionalLight.intensity = sunHeight * 1.2;

    // Warm color at dawn/dusk, white at noon
    const tod = this.getTimeOfDay();
    if (tod === 'morning' || tod === 'dusk') {
      this.#directionalLight.color.setHex(0xffaa66);
    } else {
      this.#directionalLight.color.setHex(0xffffff);
    }

    // Ambient light — bright white during day, dim blue at night
    this.#ambientLight.intensity = 0.5 + sunHeight * 0.5;
    if (tod === 'night') {
      this.#ambientLight.color.setHex(0x334466);
    } else {
      this.#ambientLight.color.setHex(0xc0c0d0);
    }
  }

  #updateStarfield(): void {
    const mat = this.#starfield.material as THREE.PointsMaterial;
    // Stars visible only at night — fade in/out
    const tod = this.getTimeOfDay();
    if (tod === 'night') {
      mat.opacity = Math.min(1, mat.opacity + 0.02);
    } else {
      mat.opacity = Math.max(0, mat.opacity - 0.02);
    }
    this.#starfield.visible = mat.opacity > 0.01;
  }
}
