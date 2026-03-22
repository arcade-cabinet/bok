/**
 * @module systems/load-model
 * @role Cached glTF model loader utility for prop and animal spawning
 * @input Model file path (relative to public/)
 * @output Cloned THREE.Group ready for scene insertion
 * @depends three (GLTFLoader)
 *
 * Wraps Three.js GLTFLoader with a clone-on-hit cache so each model
 * file is fetched from the network exactly once. Every caller gets
 * an independent clone they can position/scale/rotate freely.
 */
import type * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map<string, THREE.Group>();

/**
 * Load a glTF/GLB model and return a clone.
 *
 * The first call for a given path fetches from the network and caches
 * the parsed scene graph. Subsequent calls return `scene.clone()`,
 * giving each consumer an independent Three.js subtree.
 */
export async function loadGLTF(path: string): Promise<THREE.Group> {
  const cached = cache.get(path);
  if (cached) return cached.clone();

  const gltf = await loader.loadAsync(path);
  cache.set(path, gltf.scene);
  return gltf.scene.clone();
}

/**
 * Clear the model cache (useful for level transitions / cleanup).
 */
export function clearModelCache(): void {
  cache.clear();
}

/**
 * Number of unique models currently cached (for debugging / metrics).
 */
export function cachedModelCount(): number {
  return cache.size;
}
