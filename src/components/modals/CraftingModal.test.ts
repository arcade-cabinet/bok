import { describe, expect, it } from 'vitest';
import { ContentRegistry } from '../../content/index.ts';

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
    const resources: Record<string, number> = { 'iron-ore': 2, wood: 1 };

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

    expect(grouped.get('basic')).toBe(3); // planks, bricks, torches
    expect(grouped.get('weapon')).toBe(2); // iron sword, fire staff
    expect(grouped.get('consumable')).toBe(2); // health potion, stamina elixir
  });
});
