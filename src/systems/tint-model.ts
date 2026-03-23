/**
 * @module systems/tint-model
 * @role Apply biome-specific color tints to 3D models for visual variety
 *
 * Same enemy model gets different color in each biome:
 * Forest skeleton = green-mossy, Volcanic skeleton = red-ember
 */
import * as THREE from 'three';

/** Biome color tints — multiplied with model material colors. */
export const BIOME_TINTS: Record<string, THREE.Color> = {
  forest: new THREE.Color(0.7, 0.9, 0.6),
  desert: new THREE.Color(0.95, 0.85, 0.6),
  tundra: new THREE.Color(0.8, 0.85, 1.0),
  volcanic: new THREE.Color(1.0, 0.5, 0.3),
  swamp: new THREE.Color(0.5, 0.7, 0.4),
  'crystal-caves': new THREE.Color(0.7, 0.4, 1.0),
  'sky-ruins': new THREE.Color(0.85, 0.9, 1.0),
  'deep-ocean': new THREE.Color(0.3, 0.5, 0.8),
};

/** Apply a biome color tint to all meshes in a model. */
export function applyBiomeTint(model: THREE.Object3D, biomeId: string): void {
  const tint = BIOME_TINTS[biomeId];
  if (!tint) return;

  model.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of materials) {
        if ('color' in mat && mat.color instanceof THREE.Color) {
          mat.color.multiply(tint);
        }
      }
    }
  });
}

/** Apply a stronger boss tint with emissive glow. */
export function applyBossTint(model: THREE.Object3D, biomeId: string): void {
  const tint = BIOME_TINTS[biomeId];
  if (!tint) return;

  model.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of materials) {
        if ('color' in mat && mat.color instanceof THREE.Color) {
          mat.color.multiply(tint);
        }
        if ('emissive' in mat && mat.emissive instanceof THREE.Color) {
          mat.emissive.copy(tint).multiplyScalar(0.3);
        }
      }
    }
  });
}
