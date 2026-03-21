import type { ChestPlacement } from '../../generation/LootPlacer.ts';
import type { Vec3 } from '../../shared/types.ts';

/** Data for a spawned loot chest, ready for Koota entity creation. */
export interface SpawnedChest {
  position: Vec3;
  tier: number;
}

/**
 * Creates loot entity descriptors at chest positions from island generation.
 */
export class LootSpawner {
  static spawn(chests: ChestPlacement[]): SpawnedChest[] {
    return chests.map((c) => ({
      position: c.position,
      tier: c.tier,
    }));
  }
}
