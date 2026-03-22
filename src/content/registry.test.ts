import { describe, expect, it } from 'vitest';
import { ContentRegistry } from './index';

describe('ContentRegistry', () => {
  // --- Biomes ---

  it('loads all 8 biomes', () => {
    const registry = new ContentRegistry();
    const biomes = registry.getAllBiomes();
    expect(biomes).toHaveLength(8);
  });

  it('all biome IDs are unique', () => {
    const registry = new ContentRegistry();
    const biomes = registry.getAllBiomes();
    const ids = biomes.map((b) => b.id);
    expect(new Set(ids).size).toBe(8);
  });

  it('getBiome returns valid biome with expected fields', () => {
    const registry = new ContentRegistry();
    const biome = registry.getBiome('forest');
    expect(biome.id).toBe('forest');
    expect(biome.name).toBe('Whispering Woods');
    expect(biome.terrain.noiseOctaves).toBeGreaterThanOrEqual(1);
    expect(biome.enemies.length).toBeGreaterThan(0);
    expect(biome.bossId).toBeTruthy();
    expect(biome.skyColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(biome.fogColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('getBiome throws for unknown biome ID', () => {
    const registry = new ContentRegistry();
    expect(() => registry.getBiome('nonexistent')).toThrow('Unknown biome');
  });

  // --- Enemies ---

  it('loads all 16 enemies', () => {
    const registry = new ContentRegistry();
    const enemies = registry.getAllEnemies();
    expect(enemies).toHaveLength(16);
  });

  it('all enemy IDs are unique', () => {
    const registry = new ContentRegistry();
    const enemies = registry.getAllEnemies();
    const ids = enemies.map((e) => e.id);
    expect(new Set(ids).size).toBe(16);
  });

  it('getEnemy returns valid enemy with expected fields', () => {
    const registry = new ContentRegistry();
    const enemy = registry.getEnemy('slime');
    expect(enemy.id).toBe('slime');
    expect(enemy.health).toBeGreaterThan(0);
    expect(enemy.speed).toBeGreaterThan(0);
    expect(enemy.damage).toBeGreaterThan(0);
    expect(enemy.attacks.length).toBeGreaterThan(0);
  });

  it('getEnemy throws for unknown enemy ID', () => {
    const registry = new ContentRegistry();
    expect(() => registry.getEnemy('nonexistent')).toThrow('Unknown enemy');
  });

  // --- Weapons ---

  it('loads all 15 weapons', () => {
    const registry = new ContentRegistry();
    const weapons = registry.getAllWeapons();
    expect(weapons).toHaveLength(15);
  });

  it('all weapon IDs are unique', () => {
    const registry = new ContentRegistry();
    const weapons = registry.getAllWeapons();
    const ids = weapons.map((w) => w.id);
    expect(new Set(ids).size).toBe(15);
  });

  it('getWeapon returns valid weapon with 3-hit combo', () => {
    const registry = new ContentRegistry();
    const weapon = registry.getWeapon('wooden-sword');
    expect(weapon.id).toBe('wooden-sword');
    expect(weapon.baseDamage).toBeGreaterThan(0);
    expect(weapon.combo).toHaveLength(3);
    for (const hit of weapon.combo) {
      expect(hit.damageMultiplier).toBeGreaterThan(0);
      expect(hit.windowMs).toBeGreaterThan(0);
    }
  });

  it('getWeapon throws for unknown weapon ID', () => {
    const registry = new ContentRegistry();
    expect(() => registry.getWeapon('nonexistent')).toThrow('Unknown weapon');
  });

  // --- Bosses ---

  it('loads all 8 bosses', () => {
    const registry = new ContentRegistry();
    const bosses = registry.getAllBosses();
    expect(bosses).toHaveLength(8);
  });

  it('all boss IDs are unique', () => {
    const registry = new ContentRegistry();
    const bosses = registry.getAllBosses();
    const ids = bosses.map((b) => b.id);
    expect(new Set(ids).size).toBe(8);
  });

  it('getBoss returns valid boss with multiple phases', () => {
    const registry = new ContentRegistry();
    const boss = registry.getBoss('ancient-treant');
    expect(boss.id).toBe('ancient-treant');
    expect(boss.health).toBeGreaterThan(0);
    expect(boss.phases.length).toBeGreaterThanOrEqual(2);
    expect(boss.tomePageDrop).toBeTruthy();
  });

  it('getBoss throws for unknown boss ID', () => {
    const registry = new ContentRegistry();
    expect(() => registry.getBoss('nonexistent')).toThrow('Unknown boss');
  });

  // --- Buildings ---

  it('loads all 5 hub buildings', () => {
    const registry = new ContentRegistry();
    const buildings = registry.getAllBuildings();
    expect(buildings).toHaveLength(5);
  });

  it('all building IDs are unique', () => {
    const registry = new ContentRegistry();
    const buildings = registry.getAllBuildings();
    const ids = buildings.map((b) => b.id);
    expect(new Set(ids).size).toBe(5);
  });

  it('getBuilding returns valid building with levels', () => {
    const registry = new ContentRegistry();
    const buildings = registry.getAllBuildings();
    const building = buildings[0];
    expect(building.id).toBeTruthy();
    expect(building.name).toBeTruthy();
    expect(building.maxLevel).toBeGreaterThanOrEqual(1);
    expect(building.levels.length).toBeGreaterThanOrEqual(1);
  });

  it('getBuilding throws for unknown building ID', () => {
    const registry = new ContentRegistry();
    expect(() => registry.getBuilding('nonexistent')).toThrow('Unknown building');
  });

  // --- NPCs ---

  it('loads all 4 NPCs', () => {
    const registry = new ContentRegistry();
    const npcs = registry.getAllNPCs();
    expect(npcs).toHaveLength(4);
  });

  it('all NPC IDs are unique', () => {
    const registry = new ContentRegistry();
    const npcs = registry.getAllNPCs();
    const ids = npcs.map((n) => n.id);
    expect(new Set(ids).size).toBe(4);
  });

  it('getNPC returns valid NPC with role and dialogue', () => {
    const registry = new ContentRegistry();
    const npcs = registry.getAllNPCs();
    const npc = npcs[0];
    expect(npc.id).toBeTruthy();
    expect(npc.name).toBeTruthy();
    expect(['merchant', 'crafter', 'lore', 'navigation']).toContain(npc.role);
    expect(npc.dialogue.greeting).toBeTruthy();
    expect(npc.dialogue.farewell).toBeTruthy();
  });

  it('getNPC throws for unknown NPC ID', () => {
    const registry = new ContentRegistry();
    expect(() => registry.getNPC('nonexistent')).toThrow('Unknown NPC');
  });

  // --- Loot Tables ---

  it('getLootTables returns valid config with chest tiers and pools', () => {
    const registry = new ContentRegistry();
    const loot = registry.getLootTables();
    expect(loot.chestTiers.length).toBeGreaterThan(0);
    expect(loot.pools.length).toBeGreaterThan(0);
  });

  it('loot table chest tiers have valid pool references', () => {
    const registry = new ContentRegistry();
    const loot = registry.getLootTables();
    const poolIds = new Set(loot.pools.map((p) => p.id));
    for (const tier of loot.chestTiers) {
      for (const poolRef of tier.pools) {
        expect(poolIds.has(poolRef)).toBe(true);
      }
    }
  });

  // --- Crafting Recipes ---

  it('getCraftingRecipe returns valid recipe for known ID', () => {
    const registry = new ContentRegistry();
    const recipe = registry.getCraftingRecipe('wooden-planks');
    expect(recipe.id).toBe('wooden-planks');
    expect(recipe.name).toBeTruthy();
    expect(recipe.ingredients.length).toBeGreaterThan(0);
    expect(recipe.output.amount).toBeGreaterThan(0);
  });

  it('getCraftingRecipe throws for unknown recipe ID', () => {
    const registry = new ContentRegistry();
    expect(() => registry.getCraftingRecipe('nonexistent')).toThrow('Unknown crafting recipe');
  });

  it('all crafting recipes have valid categories', () => {
    const registry = new ContentRegistry();
    const recipes = registry.getAllCraftingRecipes();
    const validCategories = new Set(['basic', 'weapon', 'consumable']);
    for (const recipe of recipes) {
      expect(validCategories.has(recipe.category)).toBe(true);
    }
  });

  // --- Cross-domain consistency ---

  it('every biome boss ID references a valid boss config', () => {
    const registry = new ContentRegistry();
    const biomes = registry.getAllBiomes();
    for (const biome of biomes) {
      expect(() => registry.getBoss(biome.bossId)).not.toThrow();
    }
  });

  it('every biome enemy ID references a valid enemy config', () => {
    const registry = new ContentRegistry();
    const biomes = registry.getAllBiomes();
    for (const biome of biomes) {
      for (const enemyRef of biome.enemies) {
        expect(() => registry.getEnemy(enemyRef.enemyId)).not.toThrow();
      }
    }
  });
});
