import type { Vec3 } from '../../shared/types.ts';
import type { EnemySpawn } from '../../generation/EnemyPlacer.ts';
import type { EnemyConfig } from '../../content/types.ts';

/** Data for a spawned enemy, ready for Koota entity creation. */
export interface SpawnedEnemy {
  position: Vec3;
  configId: string;
  health: number;
  speed: number;
  damage: number;
}

/**
 * Takes spawn point data from IslandGenerator output + EnemyConfig from ContentRegistry.
 * Produces SpawnedEnemy descriptors for Koota entity creation.
 */
export class EnemySpawner {
  static spawn(
    spawns: EnemySpawn[],
    configs: Map<string, EnemyConfig>,
  ): SpawnedEnemy[] {
    const result: SpawnedEnemy[] = [];

    for (const sp of spawns) {
      const config = configs.get(sp.enemyId);
      if (!config) continue;

      result.push({
        position: sp.position,
        configId: config.id,
        health: config.health,
        speed: config.speed,
        damage: config.damage,
      });
    }

    return result;
  }
}
