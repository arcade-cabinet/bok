import { describe, expect, it } from 'vitest';
import { ContentRegistry } from '../../content/index.ts';
import { getUnlockedTier } from './CraftingModal.tsx';

describe('CraftingModal — recipe data', () => {
  it('all crafting recipes load and have valid categories', () => {
    const registry = new ContentRegistry();
    const recipes = registry.getAllCraftingRecipes();
    expect(recipes.length).toBeGreaterThan(0);

    const validCategories = new Set(['basic', 'weapon', 'consumable']);
    for (const recipe of recipes) {
      expect(validCategories.has(recipe.category)).toBe(true);
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      expect(recipe.output.amount).toBeGreaterThan(0);
    }
  });

  it('canAfford logic — returns true when resources are sufficient', () => {
    const registry = new ContentRegistry();
    const recipe = registry.getCraftingRecipe('wooden-planks');
    const resources: Record<string, number> = { wood: 10, stone: 5 };

    const affordable = recipe.ingredients.every((ing) => (resources[ing.itemId] ?? 0) >= ing.amount);
    expect(affordable).toBe(true);
  });

  it('canAfford logic — returns false when resources are insufficient', () => {
    const registry = new ContentRegistry();
    const recipe = registry.getCraftingRecipe('iron-sword-recipe');
    const resources: Record<string, number> = { stone: 2, wood: 1 };

    const affordable = recipe.ingredients.every((ing) => (resources[ing.itemId] ?? 0) >= ing.amount);
    expect(affordable).toBe(false);
  });

  it('recipes group correctly by category', () => {
    const registry = new ContentRegistry();
    const recipes = registry.getAllCraftingRecipes();
    const grouped = new Map<string, number>();
    for (const recipe of recipes) {
      grouped.set(recipe.category, (grouped.get(recipe.category) ?? 0) + 1);
    }

    expect(grouped.get('basic')).toBe(5); // planks, bricks, torches, sandstone-bricks, ice-bricks
    expect(grouped.get('weapon')).toBe(8); // iron sword, fire staff, ice wand, crystal blade, volcanic edge, frost cleaver, trident, lightning rod
    expect(grouped.get('consumable')).toBe(4); // health potion, stamina elixir, frost tonic, fire bomb
  });
});

describe('getUnlockedTier', () => {
  it('returns tier 1 when no bosses defeated', () => {
    expect(getUnlockedTier(0)).toBe(1);
  });

  it('returns tier 2 when 1 boss defeated', () => {
    expect(getUnlockedTier(1)).toBe(2);
  });

  it('returns tier 2 when 2 bosses defeated', () => {
    expect(getUnlockedTier(2)).toBe(2);
  });

  it('returns tier 3 when 3+ bosses defeated', () => {
    expect(getUnlockedTier(3)).toBe(3);
    expect(getUnlockedTier(5)).toBe(3);
    expect(getUnlockedTier(8)).toBe(3);
  });

  it('tier 1 recipes are always available, higher tiers locked by progression', () => {
    const registry = new ContentRegistry();
    const recipes = registry.getAllCraftingRecipes();

    const tier1 = recipes.filter((r) => r.tier === 1);
    const tier2 = recipes.filter((r) => r.tier === 2);
    const tier3 = recipes.filter((r) => r.tier === 3);

    // Tier 1 always available
    expect(tier1.length).toBeGreaterThan(0);

    // At tier unlock 1, only tier 1 should be unlocked
    const unlocked1 = getUnlockedTier(0);
    for (const r of tier1) expect(r.tier).toBeLessThanOrEqual(unlocked1);
    for (const r of tier2) expect(r.tier).toBeGreaterThan(unlocked1);
    for (const r of tier3) expect(r.tier).toBeGreaterThan(unlocked1);

    // At tier unlock 2 (1 boss), tier 1 and 2 should be unlocked
    const unlocked2 = getUnlockedTier(1);
    for (const r of tier1) expect(r.tier).toBeLessThanOrEqual(unlocked2);
    for (const r of tier2) expect(r.tier).toBeLessThanOrEqual(unlocked2);
    for (const r of tier3) expect(r.tier).toBeGreaterThan(unlocked2);

    // At tier unlock 3 (3+ bosses), all tiers unlocked
    const unlocked3 = getUnlockedTier(3);
    for (const r of recipes) expect(r.tier).toBeLessThanOrEqual(unlocked3);
  });
});
