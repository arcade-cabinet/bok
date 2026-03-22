/**
 * @module engine/lootSetup
 * @role Spawn loot chests on terrain with tiered rewards from content-driven loot tables
 * @input Scene, surface height function, island geometry, seed, chest count
 * @output ChestState array and cleanup function
 */
import * as THREE from 'three';

import { ContentRegistry } from '../content/index.ts';
import type { LootTableConfig } from '../content/types.ts';
import { PRNG } from '../generation/index.ts';
import type { SurfaceHeightFn } from './types.ts';

/** Runtime state for a single chest in the world */
export interface ChestState {
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  opened: boolean;
  tier: 'wooden' | 'iron' | 'crystal';
  id: string;
}

/** A single rolled loot item from a chest */
export interface LootRollItem {
  itemId: string;
  amount: number;
}

export interface LootSetupResult {
  chests: ChestState[];
  cleanup: () => void;
}

const CHEST_COLORS: Record<string, number> = {
  wooden: 0x8b4513,
  iron: 0x808080,
  crystal: 0x9b59b6,
};

const CHEST_LID_COLORS: Record<string, number> = {
  wooden: 0xad6735,
  iron: 0xa2a2a2,
  crystal: 0xbd7bd8,
};

const TIERS: Array<'wooden' | 'iron' | 'crystal'> = ['wooden', 'iron', 'crystal'];

/**
 * Spawn loot chests at valid terrain positions. Chest tier is determined
 * by distance from center — farther out = better loot.
 */
export function spawnChests(
  scene: THREE.Scene,
  getSurfaceY: SurfaceHeightFn,
  islandSize: number,
  seed: string,
  chestCount: number,
): LootSetupResult {
  const chests: ChestState[] = [];
  const prng = new PRNG(`${seed}-chests`);
  const center = islandSize / 2;

  for (let i = 0; i < chestCount; i++) {
    let cx = 0;
    let cz = 0;
    let cy = 0;
    let placed = false;

    // Try up to 30 attempts to find a valid position
    for (let attempt = 0; attempt < 30; attempt++) {
      cx = 5 + Math.floor(prng.next() * (islandSize - 10));
      cz = 5 + Math.floor(prng.next() * (islandSize - 10));
      cy = getSurfaceY(cx, cz);

      // Avoid water (surface <= 2) and very low ground
      if (cy <= 2) continue;

      // Avoid placing too close to other chests
      const tooClose = chests.some((c) => {
        const dx = c.position.x - cx;
        const dz = c.position.z - cz;
        return Math.sqrt(dx * dx + dz * dz) < 8;
      });
      if (tooClose) continue;

      placed = true;
      break;
    }

    if (!placed) continue;

    // Tier based on distance from center — farther = better
    const distFromCenter = Math.sqrt((cx - center) ** 2 + (cz - center) ** 2);
    const normalizedDist = distFromCenter / center;
    const tierIndex = Math.min(2, Math.floor(normalizedDist * 3));
    const tier = TIERS[tierIndex];

    // Create chest mesh (colored box with lid)
    const geometry = new THREE.BoxGeometry(0.6, 0.5, 0.4);
    const material = new THREE.MeshLambertMaterial({ color: CHEST_COLORS[tier] });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(cx, cy + 0.25, cz);

    // Add lid (slightly lighter colored top)
    const lidGeom = new THREE.BoxGeometry(0.65, 0.15, 0.45);
    const lidMat = new THREE.MeshLambertMaterial({ color: CHEST_LID_COLORS[tier] });
    const lid = new THREE.Mesh(lidGeom, lidMat);
    lid.position.set(0, 0.325, 0);
    mesh.add(lid);

    scene.add(mesh);
    chests.push({
      mesh,
      position: new THREE.Vector3(cx, cy + 0.25, cz),
      opened: false,
      tier,
      id: `chest-${i}`,
    });
  }

  return {
    chests,
    cleanup: () => {
      for (const chest of chests) {
        scene.remove(chest.mesh);
      }
    },
  };
}

/**
 * Roll loot items from the loot table for a given chest tier.
 * Each chest tier maps to one or more pools; we pick items from each pool
 * using weighted random selection.
 */
export function rollChestLoot(
  tier: 'wooden' | 'iron' | 'crystal',
  seed: string,
  lootTables: LootTableConfig,
): LootRollItem[] {
  const prng = new PRNG(`${seed}-loot-roll`);
  const items: LootRollItem[] = [];

  const chestTier = lootTables.chestTiers.find((t) => t.id === tier);
  if (!chestTier) return items;

  // Roll from each pool associated with this tier
  for (const poolId of chestTier.pools) {
    const pool = lootTables.pools.find((p) => p.id === poolId);
    if (!pool) continue;

    // Weighted random selection from pool items
    const totalWeight = pool.items.reduce((sum, item) => sum + item.weight, 0);
    let roll = prng.next() * totalWeight;

    for (const poolItem of pool.items) {
      roll -= poolItem.weight;
      if (roll <= 0) {
        const amount = prng.nextInt(poolItem.minAmount, poolItem.maxAmount);
        items.push({ itemId: poolItem.itemId, amount });
        break;
      }
    }
  }

  return items;
}

/**
 * Check if the player is close enough to open an unopened chest.
 * Returns the chest and its loot if interaction occurs, null otherwise.
 */
export function checkChestInteraction(
  playerPos: THREE.Vector3,
  chests: ChestState[],
  lootTables: LootTableConfig,
  seed: string,
): { chest: ChestState; items: LootRollItem[] } | null {
  for (const chest of chests) {
    if (chest.opened) continue;

    const dist = playerPos.distanceTo(chest.position);
    if (dist < 1.5) {
      chest.opened = true;

      // Animate lid opening
      const lid = chest.mesh.children[0];
      if (lid) lid.rotation.x = -Math.PI / 3;

      // Roll loot
      const items = rollChestLoot(chest.tier, `${seed}-${chest.id}`, lootTables);

      return { chest, items };
    }
  }

  return null;
}

/**
 * Create a singleton ContentRegistry for loot table access.
 * Cached to avoid re-parsing JSON on every call.
 */
let _cachedLootTables: LootTableConfig | null = null;
export function getLootTables(): LootTableConfig {
  if (!_cachedLootTables) {
    const registry = new ContentRegistry();
    _cachedLootTables = registry.getLootTables();
  }
  return _cachedLootTables;
}
