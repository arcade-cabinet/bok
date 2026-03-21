import type { EnemyConfig } from '../../content/types.ts';
import type { IslandBlueprint } from '../../generation/IslandGenerator.ts';
import { EnemySpawner, type SpawnedEnemy } from './EnemySpawner.ts';
import { LootSpawner, type SpawnedChest } from './LootSpawner.ts';

/** Result of populating an island with entities. */
export interface PopulatedIsland {
  enemies: SpawnedEnemy[];
  chests: SpawnedChest[];
}

/**
 * Orchestrates island population: calls EnemySpawner for each spawn point
 * and LootSpawner for each chest position.
 */
export class IslandPopulator {
  static populate(blueprint: IslandBlueprint, enemyConfigs: Map<string, EnemyConfig>): PopulatedIsland {
    const enemies = EnemySpawner.spawn(blueprint.enemySpawns, enemyConfigs);
    const chests = LootSpawner.spawn(blueprint.chestPositions);

    return { enemies, chests };
  }
}
