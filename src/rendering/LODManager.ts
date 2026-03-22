/**
 * @module rendering/LODManager
 * @role Distance-based level-of-detail manager for 3D objects
 * @input Camera position, tracked Three.js objects
 * @output Visibility toggling and material complexity reduction based on distance
 */

import * as THREE from 'three';

export interface LODConfig {
  /** Distance at which models switch to low detail (simplified material) */
  lowDetailDistance: number;
  /** Distance at which models are hidden entirely */
  cullDistance: number;
  /** How often to update LOD (in seconds) */
  updateInterval: number;
}

const DEFAULT_CONFIG: LODConfig = {
  lowDetailDistance: 30,
  cullDistance: 50,
  updateInterval: 0.5,
};

/**
 * Manages distance-based LOD for tracked Three.js objects.
 *
 * Objects beyond `cullDistance` are hidden. Objects between `lowDetailDistance`
 * and `cullDistance` have their material complexity reduced. Objects within
 * `lowDetailDistance` are rendered at full quality.
 *
 * Updates are throttled to `updateInterval` seconds to avoid per-frame overhead.
 */
export class LODManager {
  #config: LODConfig;
  #trackedObjects: Map<string, THREE.Object3D> = new Map();
  #elapsed = 0;

  constructor(config?: Partial<LODConfig>) {
    this.#config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Register an object for LOD management. */
  track(id: string, object: THREE.Object3D): void {
    this.#trackedObjects.set(id, object);
  }

  /** Remove an object from LOD management. */
  untrack(id: string): void {
    this.#trackedObjects.delete(id);
  }

  /** Returns the number of currently tracked objects. */
  get trackedCount(): number {
    return this.#trackedObjects.size;
  }

  /** Returns the current config (read-only copy). */
  get config(): Readonly<LODConfig> {
    return { ...this.#config };
  }

  /** Update config dynamically (e.g., when quality settings change). */
  setConfig(config: Partial<LODConfig>): void {
    this.#config = { ...this.#config, ...config };
  }

  /**
   * Evaluate LOD for all tracked objects based on distance to camera.
   * Throttled by `updateInterval` — accumulates dt and only runs when enough time has passed.
   */
  update(dt: number, cameraPosition: THREE.Vector3): void {
    this.#elapsed += dt;
    if (this.#elapsed < this.#config.updateInterval) return;
    this.#elapsed = 0;

    for (const [_id, obj] of this.#trackedObjects) {
      const dist = obj.position.distanceTo(cameraPosition);

      if (dist > this.#config.cullDistance) {
        // Beyond cull distance — hide entirely
        obj.visible = false;
      } else if (dist > this.#config.lowDetailDistance) {
        // Between low-detail and cull — visible but reduce material complexity
        obj.visible = true;
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material;
            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
              mat.flatShading = true;
              mat.needsUpdate = true;
            }
          }
        });
      } else {
        // Close — full quality
        obj.visible = true;
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material;
            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
              mat.flatShading = false;
              mat.needsUpdate = true;
            }
          }
        });
      }
    }
  }

  /** Cleanup all tracked references. */
  dispose(): void {
    this.#trackedObjects.clear();
    this.#elapsed = 0;
  }
}
