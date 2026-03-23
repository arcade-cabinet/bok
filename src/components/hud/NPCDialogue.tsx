/**
 * @module components/hud/NPCDialogue
 * @role HUD overlay for NPC interaction: dialogue, shop, crafting, lore, and navigation
 * @input NPCEntity from proximity hook, crafting recipes, biome list, tome pages, player inventory
 * @output Role-specific interactive panel with dismiss controls and transaction feedback
 */
import { useCallback, useEffect, useState } from 'react';
import type { CraftingRecipeConfig, NPCConfig } from '../../content/types.ts';
import type { NPCEntity } from '../../engine/npcEntities.ts';
import type { PlayerInventory } from '../../hooks/usePlayerInventory.ts';

// --- Sub-panel props ---

interface MerchantPanelProps {
  inventory: NPCConfig['inventory'];
  playerInventory: PlayerInventory | null;
  onBuy: (itemId: string) => void;
}

interface CrafterPanelProps {
  recipes: CraftingRecipeConfig[];
  playerInventory: PlayerInventory | null;
  onCraft: (recipeId: string) => void;
}

interface LorePanelProps {
  unlockedPages: string[];
}

interface NavigatorPanelProps {
  destinations: { id: string; name: string }[];
  onSelect: (biomeId: string) => void;
}

interface GuidePanelProps {
  unlockedBiomes: Set<string>;
  biomeDestinations: { id: string; name: string }[];
}

// --- Sub-panels ---

function MerchantPanel({ inventory, playerInventory, onBuy }: MerchantPanelProps) {
  const [feedback, setFeedback] = useState<{ itemId: string; message: string; success: boolean } | null>(null);

  const handleBuy = useCallback(
    (itemId: string, basePrice: number) => {
      if (!playerInventory) {
        onBuy(itemId);
        return;
      }

      // Gold-based purchase: check if player has enough gold (basePrice)
      // For now, use wood as currency (since we don't have gold yet)
      const costs: Record<string, number> = { wood: basePrice };

      if (!playerInventory.canAfford(costs)) {
        setFeedback({ itemId, message: 'Not enough resources!', success: false });
        setTimeout(() => setFeedback(null), 2000);
        return;
      }

      playerInventory.removeResource('wood', basePrice);
      playerInventory.addResource(itemId, 1);
      setFeedback({ itemId, message: 'Purchased!', success: true });
      setTimeout(() => setFeedback(null), 2000);
      onBuy(itemId);
    },
    [playerInventory, onBuy],
  );

  if (inventory.length === 0) {
    return (
      <p className="text-sm italic text-base-content/60" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
        Nothing in stock right now.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <h4
        className="text-sm font-bold text-base-content/80 uppercase tracking-wide"
        style={{ fontFamily: 'Cinzel, Georgia, serif' }}
      >
        Wares
      </h4>
      {playerInventory && (
        <div className="text-xs text-base-content/60">Your wood: {playerInventory.getCount('wood')}</div>
      )}
      <div className="space-y-1">
        {inventory.map((item) => {
          const itemFeedback = feedback?.itemId === item.itemId ? feedback : null;
          return (
            <div key={item.itemId} className="flex items-center justify-between bg-base-200/50 rounded px-3 py-2">
              <span className="text-sm text-base-content" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                {formatItemName(item.itemId)}
              </span>
              <div className="flex items-center gap-2">
                {itemFeedback && (
                  <span className={`text-xs ${itemFeedback.success ? 'text-success' : 'text-error'}`} role="status">
                    {itemFeedback.message}
                  </span>
                )}
                <span className="badge badge-sm badge-outline badge-warning">{item.basePrice} wood</span>
                <button
                  type="button"
                  className="btn btn-xs btn-primary"
                  onClick={() => handleBuy(item.itemId, item.basePrice)}
                >
                  Buy
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CrafterPanel({ recipes, playerInventory, onCraft }: CrafterPanelProps) {
  const [feedback, setFeedback] = useState<{ recipeId: string; message: string; success: boolean } | null>(null);

  const handleCraft = useCallback(
    (recipe: CraftingRecipeConfig) => {
      if (!playerInventory) {
        onCraft(recipe.id);
        return;
      }

      // Check all ingredients
      const costs: Record<string, number> = {};
      for (const ing of recipe.ingredients) {
        costs[ing.itemId] = (costs[ing.itemId] ?? 0) + ing.amount;
      }

      if (!playerInventory.canAfford(costs)) {
        setFeedback({ recipeId: recipe.id, message: 'Missing ingredients!', success: false });
        setTimeout(() => setFeedback(null), 2000);
        return;
      }

      // Deduct ingredients
      for (const ing of recipe.ingredients) {
        playerInventory.removeResource(ing.itemId, ing.amount);
      }

      // Add output
      playerInventory.addResource(recipe.output.itemId, recipe.output.amount);
      setFeedback({ recipeId: recipe.id, message: `Crafted ${formatItemName(recipe.output.itemId)}!`, success: true });
      setTimeout(() => setFeedback(null), 2000);
      onCraft(recipe.id);
    },
    [playerInventory, onCraft],
  );

  if (recipes.length === 0) {
    return (
      <p className="text-sm italic text-base-content/60" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
        No recipes available yet. Upgrade the Forge to unlock crafting.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <h4
        className="text-sm font-bold text-base-content/80 uppercase tracking-wide"
        style={{ fontFamily: 'Cinzel, Georgia, serif' }}
      >
        Recipes
      </h4>
      <div className="space-y-1">
        {recipes.map((recipe) => {
          const recipeFeedback = feedback?.recipeId === recipe.id ? feedback : null;
          const canAffordRecipe = playerInventory
            ? recipe.ingredients.every((ing) => playerInventory.getCount(ing.itemId) >= ing.amount)
            : true;

          return (
            <div key={recipe.id} className="bg-base-200/50 rounded px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-sm font-semibold text-base-content"
                  style={{ fontFamily: 'Cinzel, Georgia, serif' }}
                >
                  {recipe.name}
                </span>
                <div className="flex items-center gap-2">
                  {recipeFeedback && (
                    <span className={`text-xs ${recipeFeedback.success ? 'text-success' : 'text-error'}`} role="status">
                      {recipeFeedback.message}
                    </span>
                  )}
                  <button
                    type="button"
                    className={`btn btn-xs ${canAffordRecipe ? 'btn-primary' : 'btn-disabled'}`}
                    onClick={() => handleCraft(recipe)}
                    disabled={!canAffordRecipe}
                  >
                    Craft
                  </button>
                </div>
              </div>
              <div className="flex gap-1 flex-wrap">
                {recipe.ingredients.map((ing) => {
                  const hasEnough = playerInventory ? playerInventory.getCount(ing.itemId) >= ing.amount : true;
                  return (
                    <span
                      key={ing.itemId}
                      className={`badge badge-xs badge-outline ${hasEnough ? 'badge-secondary' : 'badge-error'}`}
                    >
                      {formatItemName(ing.itemId)} x{ing.amount}
                      {playerInventory && ` (${playerInventory.getCount(ing.itemId)})`}
                    </span>
                  );
                })}
                <span className="text-xs text-base-content/50 mx-1">&rarr;</span>
                <span className="badge badge-xs badge-accent">
                  {formatItemName(recipe.output.itemId)} x{recipe.output.amount}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LorePanel({ unlockedPages }: LorePanelProps) {
  if (unlockedPages.length === 0) {
    return (
      <p className="text-sm italic text-base-content/60" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
        You have not yet discovered any tome pages. Venture forth and defeat the island guardians to unlock ancient
        knowledge.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <h4
        className="text-sm font-bold text-base-content/80 uppercase tracking-wide"
        style={{ fontFamily: 'Cinzel, Georgia, serif' }}
      >
        Collected Pages ({unlockedPages.length})
      </h4>
      <div className="flex gap-2 flex-wrap">
        {unlockedPages.map((pageId) => (
          <span key={pageId} className="badge badge-secondary badge-outline">
            {formatItemName(pageId)}
          </span>
        ))}
      </div>
      <p className="text-xs text-base-content/60 mt-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
        Each page grants a unique ability. Study them well, for their power grows with the Library&apos;s level.
      </p>
    </div>
  );
}

/** The forest biome ID — always the starter island. */
const FOREST_BIOME_ID = 'forest';

/**
 * Ordered list of biome IDs for next-island suggestion.
 * After forest, the Guide suggests biomes in this progression order.
 */
const BIOME_PROGRESSION_ORDER = [
  'forest',
  'desert',
  'tundra',
  'volcanic',
  'swamp',
  'crystal-caves',
  'sky-ruins',
  'deep-ocean',
];

function GuidePanel({ unlockedBiomes, biomeDestinations }: GuidePanelProps) {
  // Count completed islands (biomes the player has beaten a boss on)
  const completedCount = unlockedBiomes.size;
  const hasCompletedForest = unlockedBiomes.has(FOREST_BIOME_ID);

  // Find the next uncompleted biome in progression order
  const nextBiomeId = BIOME_PROGRESSION_ORDER.find((id) => !unlockedBiomes.has(id));
  const nextBiomeName = nextBiomeId ? (biomeDestinations.find((b) => b.id === nextBiomeId)?.name ?? nextBiomeId) : null;

  let advice: string;

  if (completedCount === 0) {
    advice = 'Welcome! Head east to the Whispering Woods dock to begin.';
  } else if (completedCount === 1 && hasCompletedForest) {
    advice = 'Well done! The Sunscorched Dunes dock is now open. Head west!';
  } else if (nextBiomeName) {
    advice = `You've conquered ${completedCount} island${completedCount > 1 ? 's' : ''}. ${nextBiomeName} awaits.`;
  } else {
    advice = `You've conquered all ${completedCount} islands. A true Builder! Return anytime to strengthen your gear.`;
  }

  return (
    <div className="space-y-2">
      <h4
        className="text-sm font-bold text-base-content/80 uppercase tracking-wide"
        style={{ fontFamily: 'Cinzel, Georgia, serif' }}
      >
        Guidance
      </h4>
      <p className="text-sm" style={{ fontFamily: 'Crimson Text, Georgia, serif', color: '#2c1e16' }}>
        {advice}
      </p>
      {completedCount > 0 && (
        <div className="flex gap-1 flex-wrap mt-1">
          {[...unlockedBiomes].map((biomeId) => {
            const name = biomeDestinations.find((b) => b.id === biomeId)?.name ?? biomeId;
            return (
              <span key={biomeId} className="badge badge-xs badge-success badge-outline">
                {name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavigatorPanel({ destinations, onSelect }: NavigatorPanelProps) {
  if (destinations.length === 0) {
    return (
      <p className="text-sm italic text-base-content/60" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
        No charted destinations. Upgrade the Docks to unlock new routes.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <h4
        className="text-sm font-bold text-base-content/80 uppercase tracking-wide"
        style={{ fontFamily: 'Cinzel, Georgia, serif' }}
      >
        Charted Destinations
      </h4>
      <div className="space-y-1">
        {destinations.map((dest) => (
          <button
            key={dest.id}
            type="button"
            className="btn btn-sm btn-outline btn-secondary w-full justify-start"
            onClick={() => onSelect(dest.id)}
          >
            {dest.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Main component ---

interface Props {
  npc: NPCEntity;
  craftingRecipes: CraftingRecipeConfig[];
  unlockedPages: string[];
  biomeDestinations: { id: string; name: string }[];
  /** Set of biome IDs the player has completed (for Guide contextual dialogue). */
  unlockedBiomes?: Set<string>;
  playerInventory?: PlayerInventory | null;
  onBuy: (itemId: string) => void;
  onCraft: (recipeId: string) => void;
  onSelectDestination: (biomeId: string) => void;
  onClose: () => void;
}

/**
 * NPCDialogue — floating HUD panel shown when the player is near a hub NPC.
 *
 * Renders a greeting message and role-specific interactive UI:
 * - Merchant: item shop with prices and buy buttons (deducts from player inventory)
 * - Crafter: recipe list with ingredient requirements (checks and deducts inventory)
 * - Lore: collected tome pages and flavor text
 * - Navigation: island destination picker
 *
 * When playerInventory is provided, transactions are validated and feedback is shown.
 * Dismissible via close button or ESC key.
 */
export function NPCDialogue({
  npc,
  craftingRecipes,
  unlockedPages,
  biomeDestinations,
  unlockedBiomes,
  playerInventory,
  onBuy,
  onCraft,
  onSelectDestination,
  onClose,
}: Props) {
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when NPC changes
  const [prevNpcId, setPrevNpcId] = useState(npc.id);
  if (npc.id !== prevNpcId) {
    setPrevNpcId(npc.id);
    setDismissed(false);
  }

  // ESC to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDismissed(true);
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleClose = useCallback(() => {
    setDismissed(true);
    onClose();
  }, [onClose]);

  if (dismissed) return null;

  const inv = playerInventory ?? null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-[90%] max-w-md">
      <div
        className="card border-2 shadow-xl"
        style={{
          background: '#fdf6e3',
          borderColor: '#8b5a2b',
        }}
      >
        <div className="card-body p-4 gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="card-title text-lg" style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#2c1e16' }}>
              {npc.name}
            </h3>
            <button
              type="button"
              className="btn btn-sm btn-circle btn-ghost"
              style={{ color: '#2c1e16' }}
              onClick={handleClose}
              aria-label="Close dialogue"
            >
              &times;
            </button>
          </div>

          {/* Role badge */}
          <span
            className="badge badge-sm badge-outline self-start"
            style={{ borderColor: '#c4a572', color: '#8b5a2b' }}
          >
            {npc.role}
          </span>

          {/* Greeting */}
          <p className="text-sm italic" style={{ fontFamily: 'Crimson Text, Georgia, serif', color: '#2c1e16' }}>
            &ldquo;{npc.dialogue.greeting}&rdquo;
          </p>

          {/* Divider */}
          <div className="border-t" style={{ borderColor: '#c4a572' }} />

          {/* Role-specific panel */}
          {npc.role === 'merchant' && <MerchantPanel inventory={npc.inventory} playerInventory={inv} onBuy={onBuy} />}
          {npc.role === 'crafter' && <CrafterPanel recipes={craftingRecipes} playerInventory={inv} onCraft={onCraft} />}
          {npc.role === 'lore' && <LorePanel unlockedPages={unlockedPages} />}
          {npc.role === 'navigation' && (
            <NavigatorPanel destinations={biomeDestinations} onSelect={onSelectDestination} />
          )}
          {npc.role === 'guide' && (
            <GuidePanel unlockedBiomes={unlockedBiomes ?? new Set()} biomeDestinations={biomeDestinations} />
          )}
        </div>
      </div>
    </div>
  );
}

// --- Helpers ---

/** Convert kebab-case item ID to Title Case display name. */
function formatItemName(id: string): string {
  return id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
