/**
 * @module content
 * @role Data-driven game content definitions validated by Zod schemas
 * @input JSON config files (biomes, enemies, weapons, bosses, hub buildings, NPCs, loot tables, crafting recipes)
 * @output Typed, validated config objects via ContentRegistry
 * @depends zod
 * @tested registry.test.ts
 */
export { ContentRegistry } from './registry.ts';
export {
  BiomeConfigSchema, EnemyConfigSchema, WeaponConfigSchema, BossConfigSchema,
  HubBuildingConfigSchema, NPCConfigSchema, LootTableConfigSchema, CraftingRecipeConfigSchema,
  type BiomeConfig, type EnemyConfig, type WeaponConfig, type BossConfig,
  type HubBuildingConfig, type NPCConfig, type LootTableConfig, type CraftingRecipeConfig,
  type AttackPattern, type BossPhase, type ComboHit, type TerrainConfig,
} from './types.ts';
