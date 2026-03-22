/**
 * @module engine/npcEntities
 * @role Spawn NPC meshes on the hub island and provide entity data for React overlay
 * @input THREE.Scene, NPC definitions from content, surface height lookup
 * @output NPCEntity[] with world positions, names, roles, and mesh references
 */
import * as THREE from 'three';
import type { NPCConfig } from '../content/index';
import type { SurfaceHeightFn } from './types.ts';

/** Runtime NPC entity with world position and mesh reference. */
export interface NPCEntity {
  id: string;
  name: string;
  role: NPCConfig['role'];
  worldPos: THREE.Vector3;
  mesh: THREE.Mesh;
  dialogue: { greeting: string; farewell: string };
  inventory: NPCConfig['inventory'];
  requiredBuilding: string | null;
}

/** Hub size used for converting NPC content positions to world positions. */
const HUB_HALF = 16; // HUB_SIZE / 2

/** NPC body dimensions (voxel-style colored box). */
const NPC_WIDTH = 0.6;
const NPC_HEIGHT = 1.8;
const NPC_DEPTH = 0.6;

/** Role-based NPC colors. */
const ROLE_COLORS: Record<string, number> = {
  merchant: 0xd4a574, // warm tan
  crafter: 0x8b4513, // saddle brown
  lore: 0x4a6fa5, // scholarly blue
  navigation: 0x2e8b57, // sea green
};

/**
 * Spawn colored box meshes for each NPC on the hub terrain.
 *
 * NPC positions in content JSON are relative to the hub center (offset from 0,0).
 * We convert them to world coordinates by adding HUB_SIZE/2 (same convention
 * as useHubBuildings).
 */
export function spawnHubNPCs(scene: THREE.Scene, npcs: NPCConfig[], getSurfaceY: SurfaceHeightFn): NPCEntity[] {
  const geometry = new THREE.BoxGeometry(NPC_WIDTH, NPC_HEIGHT, NPC_DEPTH);
  const entities: NPCEntity[] = [];

  for (const npc of npcs) {
    const worldX = npc.position.x + HUB_HALF;
    const worldZ = npc.position.z + HUB_HALF;
    const surfaceY = getSurfaceY(Math.round(worldX), Math.round(worldZ));

    const color = ROLE_COLORS[npc.role] ?? 0x888888;
    const material = new THREE.MeshLambertMaterial({ color });

    const mesh = new THREE.Mesh(geometry, material);
    // Position bottom of box on terrain surface
    mesh.position.set(worldX, surfaceY + NPC_HEIGHT / 2, worldZ);
    mesh.name = `npc-${npc.id}`;
    scene.add(mesh);

    entities.push({
      id: npc.id,
      name: npc.name,
      role: npc.role,
      worldPos: new THREE.Vector3(worldX, surfaceY, worldZ),
      mesh,
      dialogue: npc.dialogue,
      inventory: npc.inventory,
      requiredBuilding: npc.requiredBuilding,
    });
  }

  return entities;
}
