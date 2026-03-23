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

/** NPC model height — approximate CubeWorld character standing height. */
const NPC_HEIGHT = 1.8;

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

/** Role-based fallback colors for placeholder boxes when model loading fails. */
const ROLE_COLORS: Record<string, number> = {
  merchant: 0xd4a574, // warm tan
  crafter: 0x8b4513, // saddle brown
  lore: 0x4a6fa5, // scholarly blue
  navigation: 0x2e8b57, // sea green
  guide: 0x2e8b57, // sea green
};

/**
 * Create a colored box fallback mesh for an NPC when model loading fails.
 */
function createFallbackMesh(color: number): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(0.6, NPC_HEIGHT, 0.6);
  const material = new THREE.MeshLambertMaterial({ color });
  return new THREE.Mesh(geometry, material);
}

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

    // Start async model load; add fallback box until it resolves
    const modelPath = NPC_MODELS[npc.id];
    const scale = NPC_SCALES[npc.id] ?? 0.9;

    if (modelPath) {
      loadModel(modelPath)
        .then((model) => {
          model.scale.setScalar(scale);
          // Clear any fallback children
          while (container.children.length > 0) {
            container.remove(container.children[0]);
          }
          container.add(model);
        })
        .catch((err) => {
          console.warn(`[Bok] Failed to load NPC model for "${npc.id}", using fallback:`, err);
          const color = ROLE_COLORS[npc.role] ?? 0x888888;
          const fallback = createFallbackMesh(color);
          fallback.position.y = NPC_HEIGHT / 2;
          container.add(fallback);
        });
    } else {
      // No model mapped — use colored box
      const color = ROLE_COLORS[npc.role] ?? 0x888888;
      const fallback = createFallbackMesh(color);
      fallback.position.y = NPC_HEIGHT / 2;
      container.add(fallback);
    }

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
