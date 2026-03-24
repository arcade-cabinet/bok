/**
 * @module engine/npcEntities
 * @role Spawn NPC character models on the hub island and provide entity data for React overlay
 * @input THREE.Scene, NPC definitions from content, surface height lookup
 * @output NPCEntity[] with world positions, names, roles, and mesh references
 */
import * as THREE from 'three';
import type { NPCConfig } from '../content/index';
import { CHARACTER_MODELS, loadModel } from './models.ts';
import type { SurfaceHeightFn } from './types.ts';

/** Runtime NPC entity with world position and mesh reference. */
export interface NPCEntity {
  id: string;
  name: string;
  role: NPCConfig['role'];
  worldPos: THREE.Vector3;
  mesh: THREE.Object3D;
  dialogue: { greeting: string; farewell: string };
  inventory: NPCConfig['inventory'];
  requiredBuilding: string | null;
}

/** Hub size used for converting NPC content positions to world positions. */
const HUB_HALF = 16; // HUB_SIZE / 2

/** Map NPC IDs to CubeWorld character model paths. */
const NPC_MODELS: Record<string, string> = {
  guide: CHARACTER_MODELS.male1,
  blacksmith: CHARACTER_MODELS.male2,
  scholar: CHARACTER_MODELS.female1,
};

/** NPC model scale by ID — adjust per-character for visual consistency. */
const NPC_SCALES: Record<string, number> = {
  guide: 0.9,
  blacksmith: 1.0,
  scholar: 0.85,
};

/**
 * Spawn CubeWorld character models for each NPC on the hub terrain.
 *
 * NPC positions in content JSON are relative to the hub center (offset from 0,0).
 * We convert them to world coordinates by adding HUB_SIZE/2 (same convention
 * as useHubBuildings).
 *
 * Character models are loaded asynchronously. The function returns immediately
 * with placeholder meshes; they are replaced in-place once models load.
 */
export function spawnHubNPCs(scene: THREE.Scene, npcs: NPCConfig[], getSurfaceY: SurfaceHeightFn): NPCEntity[] {
  const entities: NPCEntity[] = [];

  for (const npc of npcs) {
    const worldX = npc.position.x + HUB_HALF;
    const worldZ = npc.position.z + HUB_HALF;
    const surfaceY = getSurfaceY(Math.round(worldX), Math.round(worldZ));

    // Create a container group — model will be loaded into it asynchronously
    const container = new THREE.Group();
    container.position.set(worldX, surfaceY, worldZ);
    container.name = `npc-${npc.id}`;
    scene.add(container);

    // Load character model — FAIL HARD if missing
    const modelPath = NPC_MODELS[npc.id];
    if (!modelPath) {
      throw new Error(`[Bok] No model mapping for NPC "${npc.id}". Add it to NPC_MODELS in npcEntities.ts`);
    }
    const scale = NPC_SCALES[npc.id] ?? 0.9;

    loadModel(modelPath)
      .then((model) => {
        model.scale.setScalar(scale);
        container.add(model);
      })
      .catch((err) => {
        throw new Error(`[Bok] Failed to load NPC model for "${npc.id}" at "${modelPath}": ${err}`);
      });

    entities.push({
      id: npc.id,
      name: npc.name,
      role: npc.role,
      worldPos: new THREE.Vector3(worldX, surfaceY, worldZ),
      mesh: container,
      dialogue: npc.dialogue,
      inventory: npc.inventory,
      requiredBuilding: npc.requiredBuilding,
    });
  }

  return entities;
}
