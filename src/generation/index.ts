/**
 * @module generation
 * @role Procedural island generation — deterministic from seed
 * @input BiomeConfig + seed + difficulty
 * @output IslandBlueprint (terrain, spawns, chests, boss arena, structures)
 * @depends content (BiomeConfig), shared (Vec3)
 * @tested PRNG.test.ts, TerrainBuilder.test.ts, IslandGenerator.test.ts
 */
export { IslandGenerator, type IslandBlueprint } from './IslandGenerator';
export { TerrainBuilder, type TerrainData } from './TerrainBuilder';
export { EnemyPlacer, type EnemySpawn } from './EnemyPlacer';
export { LootPlacer, type ChestPlacement } from './LootPlacer';
export { StructureGenerator, type Structure } from './StructureGenerator';
export { PRNG, SimplexNoise } from './noise';
