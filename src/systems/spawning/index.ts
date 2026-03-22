/**
 * @module spawning
 * @role Entity spawning from island generation blueprints
 * @input IslandBlueprint (enemy spawn points, chest positions), EnemyConfig from content
 * @output SpawnedEnemy and SpawnedChest descriptors for Koota entity creation
 * @depends generation (IslandBlueprint), content (EnemyConfig), traits
 * @tested EnemySpawner.test.ts
 */
export { EnemySpawner, type SpawnedEnemy } from './EnemySpawner.ts';
export { IslandPopulator, type PopulatedIsland } from './IslandPopulator.ts';
export { LootSpawner, type SpawnedChest } from './LootSpawner.ts';
