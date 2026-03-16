/**
 * BokLedger — Listan (Inventory) page of the Bok journal.
 * Renders owned resources grouped by category with counts and recipe lookup.
 *
 * Props use Record<number, number> (not Map) for Playwright CT serialization.
 */

import { useState } from "react";
import { type CraftRecipe, type RecipeTier, TIER_NAMES } from "../../world/blocks.ts";
import {
	buildLedgerEntries,
	findRecipesUsingResource,
	getCategoryLabel,
	getResourceName,
	groupByCategory,
	type LedgerEntry,
} from "../ledger-data.ts";

export interface BokLedgerProps {
	/** Inventory: resource ID → count. */
	items: Record<number, number>;
}

export function BokLedger({ items }: BokLedgerProps) {
	const [selectedId, setSelectedId] = useState<number | null>(null);

	const entries = buildLedgerEntries(items);
	const groups = groupByCategory(entries);
	const recipes = selectedId !== null ? findRecipesUsingResource(selectedId) : [];

	if (entries.length === 0) {
		return (
			<div data-testid="bok-ledger">
				<p className="text-center italic opacity-50">Your packs are empty...</p>
			</div>
		);
	}

	return (
		<div className="space-y-5" data-testid="bok-ledger">
			{Array.from(groups.entries()).map(([category, categoryEntries]) => (
				<section key={category} data-testid={`ledger-category-${category}`}>
					<h3
						className="font-display text-sm tracking-[0.2em] uppercase mb-2"
						style={{ color: "var(--color-bok-ink)" }}
					>
						{getCategoryLabel(category)}
					</h3>
					<div className="space-y-1">
						{categoryEntries.map((entry) => (
							<ResourceRow
								key={entry.id}
								entry={entry}
								isSelected={selectedId === entry.id}
								onSelect={() => setSelectedId(selectedId === entry.id ? null : entry.id)}
							/>
						))}
					</div>
				</section>
			))}

			{/* Recipe panel */}
			{selectedId !== null && <RecipePanel selectedId={selectedId} recipes={recipes} />}
		</div>
	);
}

// ─── Sub-components ───

function ResourceRow({
	entry,
	isSelected,
	onSelect,
}: {
	entry: LedgerEntry;
	isSelected: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-all"
			style={{
				background: isSelected ? "rgba(201,168,76,0.12)" : "rgba(0,0,0,0.04)",
				border: isSelected ? "1px solid rgba(201,168,76,0.4)" : "1px solid rgba(201,168,76,0.1)",
			}}
			onClick={onSelect}
			data-testid={`ledger-item-${entry.id}`}
		>
			{/* Color swatch */}
			<span
				className="inline-block w-4 h-4 rounded-sm flex-shrink-0"
				style={{ background: entry.color, border: "1px solid rgba(0,0,0,0.15)" }}
				aria-hidden="true"
			/>
			{/* Name */}
			<span className="flex-1 text-xs font-body truncate" style={{ color: "var(--color-bok-ink)" }}>
				{entry.name}
			</span>
			{/* Count */}
			<span
				className="text-xs font-display tabular-nums"
				style={{ color: "var(--color-bok-gold)" }}
				data-testid={`ledger-count-${entry.id}`}
			>
				{entry.count}
			</span>
		</button>
	);
}

function RecipePanel({ selectedId, recipes }: { selectedId: number; recipes: CraftRecipe[] }) {
	const name = getResourceName(selectedId);

	return (
		<section
			className="rounded-lg p-3"
			style={{
				background: "rgba(201,168,76,0.06)",
				border: "1px solid rgba(201,168,76,0.2)",
			}}
			data-testid="ledger-recipes"
		>
			<h4 className="font-display text-xs tracking-[0.15em] uppercase mb-2" style={{ color: "var(--color-bok-ink)" }}>
				Recipes using {name}
			</h4>
			{recipes.length === 0 ? (
				<p className="text-xs italic opacity-40">No known recipes use this resource.</p>
			) : (
				<div className="space-y-1">
					{recipes.map((recipe) => (
						<RecipeRow key={recipe.id} recipe={recipe} />
					))}
				</div>
			)}
		</section>
	);
}

function RecipeRow({ recipe }: { recipe: CraftRecipe }) {
	const costParts = Object.entries(recipe.cost).map(([id, qty]) => `${getResourceName(Number(id))} x${qty}`);

	return (
		<div
			className="text-xs rounded px-2 py-1"
			style={{ background: "rgba(0,0,0,0.03)" }}
			data-testid={`recipe-${recipe.id}`}
		>
			<div className="flex items-center justify-between">
				<span style={{ color: "var(--color-bok-ink)" }}>{recipe.name}</span>
				<span className="opacity-40 text-[10px]">{TIER_NAMES[recipe.tier as RecipeTier]}</span>
			</div>
			<p className="opacity-40 mt-0.5">{costParts.join(", ")}</p>
		</div>
	);
}
