import type { Vec3 } from '../shared/types';
import type { TerrainData } from './TerrainBuilder';
import { PRNG } from './noise';

export interface EnemySpawn {
  position: Vec3;
  enemyId: string;
}

/**
 * Places enemy spawn points on valid terrain, biased toward interior areas.
 * Difficulty scales the number of spawns.
 */
export class EnemyPlacer {
  static place(
    terrain: TerrainData,
    enemyWeights: Array<{ enemyId: string; weight: number }>,
    difficulty: number,
    seed: string,
  ): EnemySpawn[] {
    const rng = new PRNG(`enemies:${seed}`);
    const spawns: EnemySpawn[] = [];
    const baseCount = 8;
    const count = baseCount + Math.floor(difficulty * 3);
    const center = terrain.width / 2;
    const totalWeight = enemyWeights.reduce((s, e) => s + e.weight, 0);

    for (let i = 0; i < count; i++) {
      // Try to find a valid position (above water, inside island)
      for (let attempt = 0; attempt < 20; attempt++) {
        const x = rng.nextInt(4, terrain.width - 5);
        const z = rng.nextInt(4, terrain.depth - 5);
        const height = terrain.heightmap[x][z];

        // Skip water/edge tiles
        if (height <= 3) continue;

        // Bias toward interior: reject positions too far from center more often
        const dx = x - center;
        const dz = z - center;
        const dist = Math.sqrt(dx * dx + dz * dz) / center;
        if (dist > 0.7 && rng.next() > 0.3) continue;

        // Pick enemy type by weighted random
        let roll = rng.next() * totalWeight;
        let enemyId = enemyWeights[0].enemyId;
        for (const entry of enemyWeights) {
          roll -= entry.weight;
          if (roll <= 0) {
            enemyId = entry.enemyId;
            break;
          }
        }

        spawns.push({ position: { x, y: height, z }, enemyId });
        break;
      }
    }

    return spawns;
  }
}
