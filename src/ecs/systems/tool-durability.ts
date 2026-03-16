// ─── Tool Durability Data ───
// Pure data: tool tier definitions, max durability lookups, drain helper.
// No ECS, no Three.js — just lookup tables and pure functions.

export const ToolTier = {
	Wood: "wood",
	Stone: "stone",
	Iron: "iron",
	Crystal: "crystal",
} as const;

export type ToolTierId = (typeof ToolTier)[keyof typeof ToolTier];

/** Max durability by material tier. */
const TIER_DURABILITY: Record<string, number> = {
	[ToolTier.Wood]: 50,
	[ToolTier.Stone]: 150,
	[ToolTier.Iron]: 500,
	[ToolTier.Crystal]: 1000,
};

/** Tool item ID → tier. Only tool-type items (axe, pickaxe, sword, chisel) have entries. */
const TOOL_TIER: Record<number, ToolTierId> = {
	101: ToolTier.Wood, // Wood Axe
	102: ToolTier.Wood, // Wood Pickaxe
	103: ToolTier.Stone, // Stone Pickaxe
	104: ToolTier.Stone, // Stone Sword
	105: ToolTier.Iron, // Iron Pickaxe
	106: ToolTier.Iron, // Iron Axe
	107: ToolTier.Iron, // Iron Sword
	110: ToolTier.Iron, // Chisel
};

/** Whether an item ID is a tool with durability. */
export function isTool(itemId: number): boolean {
	return itemId in TOOL_TIER;
}

/** Get the material tier of a tool, or undefined for non-tools. */
export function getToolTier(itemId: number): ToolTierId | undefined {
	return TOOL_TIER[itemId];
}

/** Get max durability for a tool item. Returns undefined for non-tools. */
export function getMaxDurability(itemId: number): number | undefined {
	const tier = TOOL_TIER[itemId];
	if (!tier) return undefined;
	return TIER_DURABILITY[tier];
}

/** Get max durability for a tier directly. */
export function getTierDurability(tier: ToolTierId): number {
	return TIER_DURABILITY[tier] ?? 0;
}

/**
 * Drain 1 durability from a hotbar slot object.
 * Returns true if the tool broke (durability reached 0).
 * Returns false if the slot has no durability tracking or is still usable.
 */
export function drainDurability(slot: { durability?: number }): boolean {
	if (slot.durability === undefined) return false;
	slot.durability--;
	return slot.durability <= 0;
}

/** Combat drain cooldown in seconds. */
export const COMBAT_DRAIN_COOLDOWN = 1.0;
