/**
 * @module systems/spawn-structures
 * @role Deterministic structure placement per biome using StructureTemplates
 * @input Seed, biome ID, terrain region, surface-height lookup
 * @output StructurePlacement descriptors + scene-placement helpers
 * @depends generation/noise (PRNG), generation/StructureTemplates, engine/models
 * @tested spawn-structures.test.ts
 *
 * Places multi-piece glTF structures (ruins, dungeons, shrines, markets,
 * towers, houses) on the terrain. Placement is deterministic from seed +
 * biome, so the same island always has the same structures.
 *
 * Three-phase API:
 *   1. `generateStructurePlacements()` — pure, testable, returns data descriptors
 *   2. `spawnStructureActors()` — creates JollyPixel actors with ModelRenderer (preferred)
 *   3. `spawnStructuresInScene()` — legacy fallback using raw GLTFLoader
 */
import type * as THREE from 'three';
import { type ModelActorResult, spawnModelActor } from '../engine/models.ts';
import type { JpWorld } from '../engine/types.ts';
import { PRNG } from '../generation/index';
import { getTemplatesForBiome, type StructureTemplate } from '../generation/StructureTemplates';
import { loadGLTF } from './load-model';

// ---------------------------------------------------------------------------
// Data descriptor (pure, testable)
// ---------------------------------------------------------------------------

/** A single structure placement — template + world position. */
export interface StructurePlacement {
  template: StructureTemplate;
  worldX: number;
  worldZ: number;
}

/** Minimum spacing between structure origins (world units). */
const MIN_SPACING = 15;

/** Minimum surface height — skip water/shoreline. */
const MIN_SURFACE_Y = 3;

/**
 * Generate structure placements for a biome area.
 * Deterministic from seed — same seed always places structures at same positions.
 *
 * @param seed         World seed for determinism.
 * @param biomeId      Biome identifier (filters StructureTemplates).
 * @param minX         Region start X (world units).
 * @param minZ         Region start Z (world units).
 * @param maxX         Region end X (world units).
 * @param maxZ         Region end Z (world units).
 * @param getSurfaceY  Returns terrain surface height at (x, z).
 * @param count        Maximum structures to attempt placing (default 4).
 * @returns Array of structure placements.
 */
export function generateStructurePlacements(
  seed: string,
  biomeId: string,
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
  getSurfaceY: (x: number, z: number) => number,
  count = 4,
): StructurePlacement[] {
  const templates = getTemplatesForBiome(biomeId);
  if (templates.length === 0) return [];

  const rng = new PRNG(`structures:${seed}`);
  const placements: StructurePlacement[] = [];

  for (let i = 0; i < count; i++) {
    const template = templates[Math.floor(rng.next() * templates.length)];
    const x = minX + rng.next() * (maxX - minX);
    const z = minZ + rng.next() * (maxZ - minZ);
    const y = getSurfaceY(Math.round(x), Math.round(z));

    // Skip water/shoreline positions
    if (y <= MIN_SURFACE_Y) continue;

    // Check spacing from existing placements
    const tooClose = placements.some(
      (p) => Math.abs(p.worldX - x) < MIN_SPACING && Math.abs(p.worldZ - z) < MIN_SPACING,
    );
    if (tooClose) continue;

    placements.push({ template, worldX: x, worldZ: z });
  }

  return placements;
}

/**
 * Extract shrine placements from a list of structure placements.
 * Returns world positions of all shrines — used by the goal system to
 * track 'discover' type goals (landmarksDiscovered).
 */
export function getShrineLandmarks(placements: StructurePlacement[]): Array<{ x: number; z: number }> {
  return placements.filter((p) => p.template.id === 'shrine').map((p) => ({ x: p.worldX, z: p.worldZ }));
}

// ---------------------------------------------------------------------------
// JollyPixel actor integration (preferred)
// ---------------------------------------------------------------------------

/**
 * Create JollyPixel actors with ModelRenderer for structure placements.
 *
 * Each piece of each structure gets its own actor. Models are enqueued
 * for batch loading via the AssetManager. Actual geometry appears after
 * `loadRuntime()` triggers `awake()`.
 *
 * @param jpWorld      JollyPixel World instance.
 * @param placements   Output of `generateStructurePlacements()`.
 * @param getSurfaceY  Returns terrain surface height at (x, z).
 * @returns Array of actor results (for cleanup via `actor.destroy()`).
 */
export function spawnStructureActors(
  jpWorld: JpWorld,
  placements: StructurePlacement[],
  getSurfaceY: (x: number, z: number) => number,
): ModelActorResult[] {
  const results: ModelActorResult[] = [];

  for (const placement of placements) {
    const baseY = getSurfaceY(Math.round(placement.worldX), Math.round(placement.worldZ));

    for (const piece of placement.template.pieces) {
      const actorName = `structure-${placement.template.id}-${Math.round(placement.worldX)}-${Math.round(placement.worldZ)}-${piece.model.split('/').pop()}`;
      const result = spawnModelActor(
        jpWorld,
        actorName,
        piece.model,
        {
          x: placement.worldX + piece.x,
          y: baseY + piece.y,
          z: placement.worldZ + piece.z,
        },
        piece.scale ?? 1,
      );
      if (piece.rotY) result.object3D.rotation.y = piece.rotY;
      results.push(result);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Legacy scene integration (raw GLTFLoader fallback)
// ---------------------------------------------------------------------------

/**
 * Load and place structure models into a Three.js scene.
 *
 * @deprecated Prefer `spawnStructureActors()` when a JpWorld is available.
 *
 * @param scene        Three.js scene to add models to.
 * @param placements   Output of `generateStructurePlacements()`.
 * @param getSurfaceY  Returns terrain surface height at (x, z).
 * @returns Array of loaded Three.js objects (for later cleanup).
 */
export async function spawnStructuresInScene(
  scene: THREE.Scene,
  placements: StructurePlacement[],
  getSurfaceY: (x: number, z: number) => number,
): Promise<THREE.Object3D[]> {
  const objects: THREE.Object3D[] = [];

  for (const placement of placements) {
    const baseY = getSurfaceY(Math.round(placement.worldX), Math.round(placement.worldZ));

    for (const piece of placement.template.pieces) {
      try {
        const model = await loadGLTF(piece.model);
        model.position.set(placement.worldX + piece.x, baseY + piece.y, placement.worldZ + piece.z);
        if (piece.rotY) model.rotation.y = piece.rotY;
        if (piece.scale) model.scale.setScalar(piece.scale);
        model.name = `structure-${placement.template.id}-${piece.model.split('/').pop()}`;
        scene.add(model);
        objects.push(model);
      } catch (err) {
        console.warn(`[Bok] Failed to load structure piece: ${piece.model}`, err);
      }
    }
  }

  return objects;
}
