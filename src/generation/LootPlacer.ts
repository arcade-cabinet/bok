import type { Vec3 } from '../shared/index';
import { PRNG } from './noise';
import type { TerrainData } from './TerrainBuilder';

export interface ChestPlacement {
  position: Vec3;
  tier: number;
}

/**
 * Places loot chests on valid terrain. Higher difficulty tiers get more/better chests.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: namespace for pure loot placement functions
export class LootPlacer {
  static place(terrain: TerrainData, difficulty: number, seed: string): ChestPlacement[] {
    const rng = new PRNG(`loot:${seed}`);
    const chests: ChestPlacement[] = [];
    const baseCount = 3;
    const count = baseCount + Math.floor(difficulty * 0.5);
    const center = terrain.width / 2;

    for (let i = 0; i < count; i++) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const x = rng.nextInt(6, terrain.width - 7);
        const z = rng.nextInt(6, terrain.depth - 7);
        const height = terrain.heightmap[x][z];

        // Only on solid ground
        if (height <= 3) continue;

        // Avoid placing too close to center (boss area) or too close to edge
        const dx = x - center;
        const dz = z - center;
        const dist = Math.sqrt(dx * dx + dz * dz) / center;
        if (dist < 0.15 || dist > 0.75) continue;

        // Avoid duplicates in same area
        const tooClose = chests.some((c) => {
          const cdx = c.position.x - x;
          const cdz = c.position.z - z;
          return Math.sqrt(cdx * cdx + cdz * cdz) < 8;
        });
        if (tooClose) continue;

        const tier = rng.nextInt(1, Math.min(3, difficulty));
        chests.push({ position: { x, y: height + 1, z }, tier });
        break;
      }
    }

    return chests;
  }
}
