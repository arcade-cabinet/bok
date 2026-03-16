import { RECIPES, type CraftRecipe } from "../../world/blocks.ts";
import type { InventoryData } from "../../ecs/traits/index.ts";

interface CraftingMenuProps {
  isOpen: boolean;
  inventory: InventoryData;
  onCraft: (recipeId: string) => void;
  onClose: () => void;
}

export function CraftingMenu({ isOpen, inventory, onCraft, onClose }: CraftingMenuProps) {
  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Crafting menu"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="w-96 rounded-2xl p-6 text-white shadow-2xl"
        style={{
          background: "rgba(15, 15, 20, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <h2
          className="font-display text-xl tracking-wider border-b border-white/10 pb-3 mb-4"
          style={{ color: "var(--color-bok-parchment)" }}
        >
          Crafting & Inventory
        </h2>

        {/* Inventory grid */}
        <div className="grid grid-cols-2 gap-2 mb-5 text-sm">
          {Object.entries(inventory).map(([key, val]) =>
            val > 0 ? (
              <div
                key={key}
                className="bg-white/5 px-3 py-1.5 rounded text-gray-300"
              >
                {key.toUpperCase()}: <span className="font-bold text-white">{val}</span>
              </div>
            ) : null
          )}
          {Object.values(inventory).every((v) => v === 0) && (
            <div className="col-span-2 text-gray-500 italic text-center py-2">
              Inventory Empty
            </div>
          )}
        </div>

        {/* Recipes */}
        <div className="grid grid-cols-2 gap-2">
          {RECIPES.map((recipe) => (
            <CraftButton
              key={recipe.id}
              recipe={recipe}
              inventory={inventory}
              onCraft={onCraft}
            />
          ))}
        </div>

        <p className="text-center mt-4 text-xs text-gray-600">
          Press [E] to close
        </p>
      </div>
    </div>
  );
}

function CraftButton({
  recipe,
  inventory,
  onCraft,
}: {
  recipe: CraftRecipe;
  inventory: InventoryData;
  onCraft: (id: string) => void;
}) {
  const canAfford = Object.entries(recipe.cost).every(
    ([res, amount]) => (inventory[res as keyof InventoryData] || 0) >= amount
  );

  return (
    <button
      type="button"
      disabled={!canAfford}
      onClick={() => onCraft(recipe.id)}
      className={`
        w-full px-3 py-2.5 rounded-lg border text-left text-sm font-semibold
        transition-all duration-200 flex justify-between items-center
        ${
          canAfford
            ? "bg-white/5 border-white/10 text-white hover:bg-white/15 hover:translate-x-1 cursor-pointer"
            : "bg-transparent border-white/5 text-white/30 cursor-not-allowed"
        }
      `}
    >
      <span>{recipe.name}</span>
      <span className="bg-black/50 px-2 py-0.5 rounded text-xs text-gray-400">
        {Object.entries(recipe.cost)
          .map(([res, amt]) => `${amt} ${res}`)
          .join(", ")}
      </span>
    </button>
  );
}
