/**
 * @module systems/spawn-props
 * @role Deterministic environment prop spawning per biome
 * @input Seed, biome ID, terrain region, surface-height lookup
 * @output PropPlacement descriptors + scene-placement helpers
 * @depends generation/noise (PRNG), engine/models (spawnModelActor)
 * @tested spawn-props.test.ts
 *
 * Places 3D glTF models (trees, bushes, rocks, crystals, mushrooms)
 * on the terrain as decorative props. Placement is deterministic from
 * seed + world position, so the same island always looks the same.
 *
 * Three-phase API:
 *   1. `generatePropPlacements()` — pure, testable, returns data descriptors
 *   2. `spawnPropActors()` — creates JollyPixel actors with ModelRenderer (preferred)
 *   3. `spawnPropsInScene()` — legacy fallback using raw GLTFLoader
 */
import type * as THREE from 'three';
import { type ModelActorResult, spawnModelActor } from '../engine/models.ts';
import type { JpWorld } from '../engine/types.ts';
import { PRNG } from '../generation/index';
import { loadGLTF } from './load-model';

// ---------------------------------------------------------------------------
// Biome prop configuration
// ---------------------------------------------------------------------------

export interface PropConfig {
  /** Model filename without extension (matches public/assets/models/Environment/*.gltf). */
  modelFile: string;
  /** Probability [0,1] that this prop appears at any grid cell. */
  density: number;
  /** Optional uniform scale override (default 1). */
  scale?: number;
}

/** Biome-specific prop palettes. Every biome JSON id must have an entry. */
export const BIOME_PROPS: Record<string, PropConfig[]> = {
  forest: [
    { modelFile: 'Tree_1', density: 0.04 },
    { modelFile: 'Tree_2', density: 0.03 },
    { modelFile: 'Tree_3', density: 0.02 },
    { modelFile: 'Bush', density: 0.05 },
    { modelFile: 'Flowers_1', density: 0.03 },
    { modelFile: 'Flowers_2', density: 0.02 },
    { modelFile: 'Mushroom', density: 0.02 },
    { modelFile: 'Rock1', density: 0.01 },
  ],
  desert: [
    { modelFile: 'Rock1', density: 0.03 },
    { modelFile: 'Rock2', density: 0.02 },
    { modelFile: 'Grass_Small', density: 0.01 },
  ],
  tundra: [
    { modelFile: 'Rock1', density: 0.02 },
    { modelFile: 'Rock2', density: 0.01 },
    { modelFile: 'DeadTree_1', density: 0.01 },
    { modelFile: 'DeadTree_2', density: 0.005 },
  ],
  volcanic: [
    { modelFile: 'Crystal_Big', density: 0.02 },
    { modelFile: 'Crystal_Small', density: 0.03 },
    { modelFile: 'Rock2', density: 0.02 },
    { modelFile: 'Rock1', density: 0.01 },
  ],
  swamp: [
    { modelFile: 'DeadTree_1', density: 0.03 },
    { modelFile: 'DeadTree_2', density: 0.02 },
    { modelFile: 'DeadTree_3', density: 0.01 },
    { modelFile: 'Mushroom', density: 0.04 },
    { modelFile: 'Bush', density: 0.02 },
  ],
  'crystal-caves': [
    { modelFile: 'Crystal_Big', density: 0.05 },
    { modelFile: 'Crystal_Small', density: 0.06 },
    { modelFile: 'Rock1', density: 0.01 },
  ],
  'sky-ruins': [
    { modelFile: 'Rock1', density: 0.02 },
    { modelFile: 'Rock2', density: 0.01 },
  ],
  'deep-ocean': [
    { modelFile: 'Plant_2', density: 0.03 },
    { modelFile: 'Plant_3', density: 0.02 },
  ],
};

/** All biome IDs that must be present in BIOME_PROPS. */
export const ALL_BIOME_IDS = [
  'forest',
  'desert',
  'tundra',
  'volcanic',
  'swamp',
  'crystal-caves',
  'sky-ruins',
  'deep-ocean',
] as const;

// ---------------------------------------------------------------------------
// Data descriptor (pure, testable)
// ---------------------------------------------------------------------------

/** A single prop placement — position + model info. */
export interface PropPlacement {
  modelFile: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  scale: number;
}

/**
 * Generate deterministic prop placements for a rectangular terrain region.
 *
 * @param seed      World seed for determinism.
 * @param biomeId   Biome identifier (key into BIOME_PROPS).
 * @param minX      Region start X (world units).
 * @param minZ      Region start Z (world units).
 * @param maxX      Region end X (world units).
 * @param maxZ      Region end Z (world units).
 * @param getSurfaceY  Returns terrain surface height at (x, z).
 * @param spacing   Grid spacing in world units (default 2). Smaller = denser scan.
 * @returns Array of prop placements.
 */
export function generatePropPlacements(
  seed: string,
  biomeId: string,
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
  getSurfaceY: (x: number, z: number) => number,
  spacing = 2,
): PropPlacement[] {
  const configs = BIOME_PROPS[biomeId];
  if (!configs || configs.length === 0) return [];

  const placements: PropPlacement[] = [];

  for (let x = minX; x < maxX; x += spacing) {
    for (let z = minZ; z < maxZ; z += spacing) {
      // Deterministic RNG per grid cell
      const rng = new PRNG(`${seed}:prop:${x}:${z}`);

      for (const cfg of configs) {
        if (rng.next() < cfg.density) {
          // Jitter within the grid cell so placement isn't perfectly grid-aligned
          const jitterX = x + rng.nextFloat(-spacing * 0.4, spacing * 0.4);
          const jitterZ = z + rng.nextFloat(-spacing * 0.4, spacing * 0.4);
          const surfaceY = getSurfaceY(Math.round(jitterX), Math.round(jitterZ));

          placements.push({
            modelFile: cfg.modelFile,
            x: jitterX,
            y: surfaceY,
            z: jitterZ,
            rotationY: rng.nextFloat(0, Math.PI * 2),
            scale: (cfg.scale ?? 1) * rng.nextFloat(0.8, 1.2),
          });

          // Only one prop per grid cell to avoid overlap
          break;
        }
      }
    }
  }

  return placements;
}

// ---------------------------------------------------------------------------
// JollyPixel actor integration (preferred)
// ---------------------------------------------------------------------------

/** Asset base path for environment models. */
const MODELS_PATH = '/assets/models/Environment';

/**
 * Create JollyPixel actors with ModelRenderer for prop placements.
 *
 * Models are enqueued for batch loading via the AssetManager. Actual geometry
 * appears after `loadRuntime()` triggers `awake()`. The actors' object3D groups
 * are positioned immediately.
 *
 * @param jpWorld     JollyPixel World instance.
 * @param placements  Output of `generatePropPlacements()`.
 * @returns Array of actor results (for cleanup via `actor.destroy()`).
 */
export function spawnPropActors(jpWorld: JpWorld, placements: PropPlacement[]): ModelActorResult[] {
  const results: ModelActorResult[] = [];

  for (const p of placements) {
    const actorName = `prop-${p.modelFile}-${Math.round(p.x)}-${Math.round(p.z)}`;
    const result = spawnModelActor(
      jpWorld,
      actorName,
      `${MODELS_PATH}/${p.modelFile}.gltf`,
      { x: p.x, y: p.y, z: p.z },
      p.scale,
    );
    result.object3D.rotation.y = p.rotationY;
    results.push(result);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Legacy scene integration (raw GLTFLoader fallback)
// ---------------------------------------------------------------------------

/**
 * Load and place prop models into a Three.js scene from placement descriptors.
 *
 * @deprecated Prefer `spawnPropActors()` when a JpWorld is available.
 *
 * @param scene       Three.js scene to add models to.
 * @param placements  Output of `generatePropPlacements()`.
 * @returns Array of loaded Three.js objects (for later cleanup).
 */
export async function spawnPropsInScene(scene: THREE.Scene, placements: PropPlacement[]): Promise<THREE.Object3D[]> {
  const objects: THREE.Object3D[] = [];

  // Load models in parallel, batched to avoid overwhelming the loader
  const BATCH_SIZE = 20;
  for (let i = 0; i < placements.length; i += BATCH_SIZE) {
    const batch = placements.slice(i, i + BATCH_SIZE);
    const models = await Promise.all(
      batch.map(async (p) => {
        const model = await loadGLTF(`${MODELS_PATH}/${p.modelFile}.gltf`);
        model.position.set(p.x, p.y, p.z);
        model.rotation.y = p.rotationY;
        model.scale.setScalar(p.scale);
        model.name = `prop-${p.modelFile}-${Math.round(p.x)}-${Math.round(p.z)}`;
        scene.add(model);
        return model;
      }),
    );
    objects.push(...models);
  }

  return objects;
}
