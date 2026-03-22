import type { Inventory } from './Inventory.ts';

/** A crafting recipe definition. */
export interface Recipe {
  id: string;
  ingredients: Array<{ itemId: string; amount: number }>;
  output: { itemId: string; amount: number };
}

/**
 * Checks recipe requirements against inventory contents and produces output items.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: namespace for crafting functions
export class CraftingSystem {
  static canCraft(recipe: Recipe, inventory: Inventory, holder: string): boolean {
    return recipe.ingredients.every((ing) => inventory.hasItem(holder, ing.itemId, ing.amount));
  }

  static craft(recipe: Recipe, inventory: Inventory, holder: string): boolean {
    if (!CraftingSystem.canCraft(recipe, inventory, holder)) return false;

    for (const ing of recipe.ingredients) {
      inventory.removeItem(holder, ing.itemId, ing.amount);
    }
    inventory.addItem(holder, recipe.output.itemId, recipe.output.amount);
    return true;
  }
}
