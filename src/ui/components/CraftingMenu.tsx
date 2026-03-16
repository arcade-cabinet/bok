import type { InventoryData } from "../../ecs/inventory.ts";
import { canAfford } from "../../ecs/inventory.ts";
import { type CraftRecipe, getBlockName, RECIPES } from "../../world/blocks.ts";

interface CraftingMenuProps {
	isOpen: boolean;
	inventory: InventoryData;
	onCraft: (recipeId: string) => void;
	onClose: () => void;
}

export function CraftingMenu({ isOpen, inventory, onCraft, onClose }: CraftingMenuProps) {
	if (!isOpen) return null;

	const nonZeroItems = Object.entries(inventory.items).filter(([, v]) => v > 0);

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
					{nonZeroItems.map(([id, count]) => (
						<div key={id} className="bg-white/5 px-3 py-1.5 rounded text-gray-300">
							{getBlockName(Number(id)).toUpperCase()}: <span className="font-bold text-white">{count}</span>
						</div>
					))}
					{nonZeroItems.length === 0 && (
						<div className="col-span-2 text-gray-500 italic text-center py-2">Inventory Empty</div>
					)}
				</div>

				{/* Recipes */}
				<div className="grid grid-cols-2 gap-2">
					{RECIPES.map((recipe) => (
						<CraftButton key={recipe.id} recipe={recipe} inventory={inventory} onCraft={onCraft} />
					))}
				</div>

				<p className="text-center mt-4 text-xs text-gray-600">Press [E] to close</p>
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
	const affordable = canAfford(inventory, recipe.cost);

	return (
		<button
			type="button"
			disabled={!affordable}
			onClick={() => onCraft(recipe.id)}
			className={`
        w-full px-3 py-2.5 rounded-lg border text-left text-sm font-semibold
        transition-all duration-200 flex justify-between items-center
        ${
					affordable
						? "bg-white/5 border-white/10 text-white hover:bg-white/15 hover:translate-x-1 cursor-pointer"
						: "bg-transparent border-white/5 text-white/30 cursor-not-allowed"
				}
      `}
		>
			<span>{recipe.name}</span>
			<span className="bg-black/50 px-2 py-0.5 rounded text-xs text-gray-400">
				{Object.entries(recipe.cost)
					.map(([id, amt]) => `${amt} ${getBlockName(Number(id))}`)
					.join(", ")}
			</span>
		</button>
	);
}
