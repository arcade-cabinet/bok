// ─── Ledger Data ───
// Pure data: resource categorization, sorting, and recipe lookup by ingredient.
// No ECS, no Three.js — just lookup tables and helpers.

import { isFood } from "../ecs/systems/food.ts";
import { isTool } from "../ecs/systems/tool-durability.ts";
import { BLOCKS, BlockId, type CraftRecipe, ITEMS, RECIPES } from "../world/blocks.ts";

export type ResourceCategory = "blocks" | "tools" | "materials" | "food";

const MATERIAL_IDS: ReadonlySet<number> = new Set([
	BlockId.IronOre,
	BlockId.CopperOre,
	BlockId.Crystal,
	BlockId.RuneStone,
	BlockId.Peat,
]);

/** Classify a resource ID into a display category. */
export function classifyResource(id: number): ResourceCategory {
	if (isTool(id) || ITEMS[id]?.type === "light") return "tools";
	if (isFood(id)) return "food";
	if (MATERIAL_IDS.has(id)) return "materials";
	if (ITEMS[id]?.type === "food") return "food";
	return "blocks";
}

/** Category display order. */
const CATEGORY_ORDER: Record<ResourceCategory, number> = {
	blocks: 0,
	tools: 1,
	materials: 2,
	food: 3,
};

export interface LedgerEntry {
	id: number;
	name: string;
	count: number;
	category: ResourceCategory;
	color: string;
}

/** Build sorted ledger entries from an inventory items map. */
export function buildLedgerEntries(items: Record<number, number>): LedgerEntry[] {
	const entries: LedgerEntry[] = [];
	for (const [idStr, count] of Object.entries(items)) {
		if (count <= 0) continue;
		const id = Number(idStr);
		const category = classifyResource(id);
		const name = ITEMS[id]?.name ?? BLOCKS[id]?.name ?? `Item #${id}`;
		const color = ITEMS[id]?.color ?? BLOCKS[id]?.color ?? "#888888";
		entries.push({ id, name, count, category, color });
	}
	entries.sort((a, b) => {
		const catDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
		if (catDiff !== 0) return catDiff;
		return a.name.localeCompare(b.name);
	});
	return entries;
}

/** Group sorted entries by category. */
export function groupByCategory(entries: LedgerEntry[]): Map<ResourceCategory, LedgerEntry[]> {
	const groups = new Map<ResourceCategory, LedgerEntry[]>();
	for (const entry of entries) {
		let list = groups.get(entry.category);
		if (!list) {
			list = [];
			groups.set(entry.category, list);
		}
		list.push(entry);
	}
	return groups;
}

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
	blocks: "Blocks",
	tools: "Tools & Gear",
	materials: "Materials",
	food: "Food",
};

export function getCategoryLabel(cat: ResourceCategory): string {
	return CATEGORY_LABELS[cat];
}

/** Find all recipes that use a given resource ID as an ingredient. */
export function findRecipesUsingResource(resourceId: number): CraftRecipe[] {
	return RECIPES.filter((r) => resourceId in r.cost);
}

/** Get the display name for a resource ID (block or item). */
export function getResourceName(id: number): string {
	return ITEMS[id]?.name ?? BLOCKS[id]?.name ?? `Item #${id}`;
}
