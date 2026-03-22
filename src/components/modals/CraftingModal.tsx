import { useCallback, useEffect, useMemo } from 'react';
import type { CraftingRecipeConfig } from '../../content/types.ts';

interface Props {
  recipes: CraftingRecipeConfig[];
  resources: Record<string, number>;
  onCraft: (recipeId: string) => void;
  onClose: () => void;
}

/** Category labels for display. */
const CATEGORY_LABELS: Record<string, string> = {
  basic: 'Building Materials',
  weapon: 'Weapons',
  consumable: 'Consumables',
};

/** Category order for display. */
const CATEGORY_ORDER = ['basic', 'weapon', 'consumable'] as const;

/** Format an item ID into a display name (kebab-case to Title Case). */
function formatItemName(itemId: string): string {
  return itemId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Check whether the player has enough of every ingredient for a recipe. */
function canAffordRecipe(recipe: CraftingRecipeConfig, resources: Record<string, number>): boolean {
  return recipe.ingredients.every((ing) => (resources[ing.itemId] ?? 0) >= ing.amount);
}

/**
 * CraftingModal — modal overlay for the Forge building crafting interface.
 * Lists all available recipes grouped by category with ingredient requirements
 * and a Craft button that is disabled when the player lacks materials.
 * Uses daisyUI modal/card components with the parchment theme.
 */
export function CraftingModal({ recipes, resources, onCraft, onClose }: Props) {
  const grouped = useMemo(() => {
    const groups = new Map<string, CraftingRecipeConfig[]>();
    for (const recipe of recipes) {
      const list = groups.get(recipe.category) ?? [];
      list.push(recipe);
      groups.set(recipe.category, list);
    }
    return groups;
  }, [recipes]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="modal modal-open overlay-safe-area">
      <button type="button" className="modal-backdrop bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-box card bg-base-100 border-2 border-secondary max-w-2xl w-[85%] max-h-[80vh] overflow-y-auto">
        <h2
          className="text-2xl sm:text-3xl text-center mb-5 pb-3 border-b-2 border-secondary text-base-content"
          style={{ fontFamily: 'Cinzel, Georgia, serif' }}
        >
          The Forge
        </h2>

        {recipes.length === 0 ? (
          <p
            className="text-center text-base-content/60 italic py-8"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            No recipes available yet.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((category) => {
              const categoryRecipes = grouped.get(category)!;
              return (
                <div key={category}>
                  <h3
                    className="text-lg mb-3 text-secondary tracking-wide"
                    style={{ fontFamily: 'Cinzel, Georgia, serif' }}
                  >
                    {CATEGORY_LABELS[category] ?? category}
                  </h3>

                  <div className="flex flex-col gap-2">
                    {categoryRecipes.map((recipe) => {
                      const affordable = canAffordRecipe(recipe, resources);
                      return (
                        <div
                          key={recipe.id}
                          className="card bg-base-200/60 border border-secondary/40 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div
                                className="font-bold text-base-content mb-1"
                                style={{ fontFamily: 'Cinzel, Georgia, serif' }}
                              >
                                {recipe.name}
                              </div>

                              {/* Ingredients */}
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {recipe.ingredients.map((ing) => {
                                  const have = resources[ing.itemId] ?? 0;
                                  const enough = have >= ing.amount;
                                  return (
                                    <span
                                      key={ing.itemId}
                                      className={`badge badge-sm badge-outline gap-1 ${enough ? 'badge-success' : 'badge-error'}`}
                                    >
                                      {formatItemName(ing.itemId)}: {have}/{ing.amount}
                                    </span>
                                  );
                                })}
                              </div>

                              {/* Output */}
                              <div
                                className="text-xs text-base-content/70"
                                style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
                              >
                                Produces: {recipe.output.amount}x {formatItemName(recipe.output.itemId)}
                              </div>
                            </div>

                            <button
                              type="button"
                              className={`btn btn-sm ${affordable ? 'btn-primary' : 'btn-disabled'}`}
                              onClick={() => affordable && onCraft(recipe.id)}
                              tabIndex={affordable ? 0 : -1}
                              data-testid={`craft-${recipe.id}`}
                            >
                              Craft
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 text-center">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
