// ─── Block Registry ───
// Block IDs, metadata, physics properties, and lookup utilities.
// Renderer definitions live in block-definitions.ts.

export const BlockId = {
	Air: 0,
	Grass: 1,
	Dirt: 2,
	Stone: 3,
	Wood: 4,
	Leaves: 5,
	Planks: 6,
	Water: 7,
	Torch: 8,
	Sand: 9,
	Snow: 10,
	StoneBricks: 11,
	Glass: 12,
	// Biome-specific blocks
	BirchWood: 13,
	BirchLeaves: 14,
	BeechWood: 15,
	BeechLeaves: 16,
	PineWood: 17,
	PineLeaves: 18,
	SpruceLeaves: 19,
	DeadWood: 20,
	Moss: 21,
	Mushroom: 22,
	Peat: 23,
	Ice: 24,
	SmoothStone: 25,
	Soot: 26,
	CorruptedStone: 27,
	IronOre: 28,
	CopperOre: 29,
	Crystal: 30,
	FaluRed: 31,
	Wildflower: 32,
	Cranberry: 33,
	RuneStone: 34,
	// Workstation blocks
	CraftingBench: 35,
	Forge: 36,
	Scriptorium: 37,
	// Crafted building materials
	TreatedPlanks: 38,
	ReinforcedBricks: 39,
} as const;

export type BlockIdValue = (typeof BlockId)[keyof typeof BlockId];

export interface BlockMeta {
	name: string;
	color: string;
	solid: boolean;
	transparent?: boolean;
	fluid?: boolean;
	emissive?: boolean;
	slippery?: boolean;
	bouncy?: boolean;
	soft?: boolean;
	hardness: number;
}

// Colors drawn from the Scandinavian palette (docs/design/art-direction.md)
// Stone/dirt variants include warm bias (+5-10 red channel) per art direction
export const BLOCKS: Record<number, BlockMeta> = {
	[BlockId.Air]: { name: "Air", color: "#000000", solid: false, hardness: 0 },
	[BlockId.Grass]: { name: "Grass", color: "#4a7a42", solid: true, hardness: 0.8 },
	[BlockId.Dirt]: { name: "Dirt", color: "#7f5b4e", solid: true, hardness: 0.6 },
	[BlockId.Stone]: { name: "Stone", color: "#a6989a", solid: true, hardness: 4.0 },
	[BlockId.Wood]: { name: "Wood", color: "#5D4037", solid: true, hardness: 2.5 },
	[BlockId.Leaves]: { name: "Leaves", color: "#3a5a40", solid: true, transparent: true, hardness: 0.2 },
	[BlockId.Planks]: { name: "Planks", color: "#8D6E63", solid: true, hardness: 1.5 },
	[BlockId.Water]: { name: "Water", color: "#1E90FF", solid: false, transparent: true, fluid: true, hardness: 0 },
	[BlockId.Torch]: { name: "Torch", color: "#FFD700", solid: false, emissive: true, hardness: 0.1 },
	[BlockId.Sand]: { name: "Sand", color: "#E2C275", solid: true, hardness: 0.7 },
	[BlockId.Snow]: { name: "Snow", color: "#f0eae4", solid: true, hardness: 0.5 },
	[BlockId.StoneBricks]: { name: "Stonebricks", color: "#7d7577", solid: true, hardness: 4.0 },
	[BlockId.Glass]: { name: "Glass", color: "#88CCFF", solid: true, transparent: true, hardness: 1.0 },
	// Biome-specific blocks — Björk palette for birch, Mossa for forest greens, Sten for stone variants
	[BlockId.BirchWood]: { name: "Birch Wood", color: "#ddd0ba", solid: true, hardness: 2.0 },
	[BlockId.BirchLeaves]: { name: "Birch Leaves", color: "#5a8a4a", solid: true, transparent: true, hardness: 0.2 },
	[BlockId.BeechWood]: { name: "Beech Wood", color: "#6e5439", solid: true, hardness: 3.0 },
	[BlockId.BeechLeaves]: { name: "Beech Leaves", color: "#3a5a40", solid: true, transparent: true, hardness: 0.2 },
	[BlockId.PineWood]: { name: "Pine Wood", color: "#7a4a30", solid: true, hardness: 2.5 },
	[BlockId.PineLeaves]: { name: "Pine Leaves", color: "#2a5030", solid: true, transparent: true, hardness: 0.2 },
	[BlockId.SpruceLeaves]: { name: "Spruce Leaves", color: "#1a4a3a", solid: true, transparent: true, hardness: 0.2 },
	[BlockId.DeadWood]: { name: "Dead Wood", color: "#8a7a6a", solid: true, hardness: 1.5 },
	[BlockId.Moss]: { name: "Moss", color: "#3a5a40", solid: true, soft: true, hardness: 0.3 },
	[BlockId.Mushroom]: { name: "Mushroom", color: "#a3452a", solid: false, hardness: 0.1 },
	[BlockId.Peat]: { name: "Peat", color: "#3a2a20", solid: true, bouncy: true, hardness: 0.4 },
	[BlockId.Ice]: { name: "Ice", color: "#b0d8ef", solid: true, transparent: true, slippery: true, hardness: 1.5 },
	[BlockId.SmoothStone]: { name: "Smooth Stone", color: "#736b6b", solid: true, hardness: 5.0 },
	[BlockId.Soot]: { name: "Soot", color: "#2a2a3e", solid: true, hardness: 0.5 },
	[BlockId.CorruptedStone]: { name: "Corrupted Stone", color: "#4a3a5a", solid: true, hardness: 6.0 },
	[BlockId.IronOre]: { name: "Iron Ore", color: "#a6989a", solid: true, hardness: 5.0 },
	[BlockId.CopperOre]: { name: "Copper Ore", color: "#a6989a", solid: true, hardness: 4.5 },
	[BlockId.Crystal]: {
		name: "Crystal",
		color: "#c9a84c",
		solid: true,
		transparent: true,
		emissive: true,
		hardness: 3.0,
	},
	[BlockId.FaluRed]: { name: "Falu Red", color: "#8b2500", solid: true, hardness: 2.0 },
	[BlockId.Wildflower]: { name: "Wildflower", color: "#d4a0d4", solid: false, hardness: 0.1 },
	[BlockId.Cranberry]: { name: "Cranberry", color: "#8a2030", solid: false, hardness: 0.1 },
	[BlockId.RuneStone]: { name: "Rune Stone", color: "#5a5a6a", solid: true, hardness: 7.0 },
	// Workstations
	[BlockId.CraftingBench]: { name: "Crafting Bench", color: "#8D6E63", solid: true, hardness: 2.5 },
	[BlockId.Forge]: { name: "Forge", color: "#5a4a4a", solid: true, hardness: 5.0, emissive: true },
	[BlockId.Scriptorium]: { name: "Scriptorium", color: "#4a4a5a", solid: true, hardness: 4.0 },
	// Crafted building materials
	[BlockId.TreatedPlanks]: { name: "Treated Planks", color: "#6D5040", solid: true, hardness: 3.0 },
	[BlockId.ReinforcedBricks]: { name: "Reinforced Bricks", color: "#6a6068", solid: true, hardness: 6.0 },
};

export function getBlockHardness(blockId: number): number {
	return BLOCKS[blockId]?.hardness ?? 1.0;
}

export function getBlockName(blockId: number): string {
	return BLOCKS[blockId]?.name ?? "Unknown";
}

export function isSlippery(blockId: number): boolean {
	return BLOCKS[blockId]?.slippery === true;
}

export function isBouncy(blockId: number): boolean {
	return BLOCKS[blockId]?.bouncy === true;
}

export function isSoft(blockId: number): boolean {
	return BLOCKS[blockId]?.soft === true;
}

// ─── Items & Recipes ───

export interface ItemDef {
	name: string;
	type: "axe" | "pickaxe" | "sword" | "food" | "light";
	target: string;
	power: number;
	color: string;
}

export const ITEM_WOOD_AXE_ID = 101;

export const ITEMS: Record<number, ItemDef> = {
	[ITEM_WOOD_AXE_ID]: { name: "Wood Axe", type: "axe", target: "Wood", power: 3, color: "#8D6E63" },
	102: { name: "Wood Pickaxe", type: "pickaxe", target: "Stone", power: 3, color: "#8D6E63" },
	103: { name: "Stone Pickaxe", type: "pickaxe", target: "Stone", power: 6, color: "#9E9E9E" },
	104: { name: "Stone Sword", type: "sword", target: "Entity", power: 1, color: "#9E9E9E" },
	// Iron tools (tier 2 — forge)
	105: { name: "Iron Pickaxe", type: "pickaxe", target: "Stone", power: 9, color: "#707070" },
	106: { name: "Iron Axe", type: "axe", target: "Wood", power: 9, color: "#707070" },
	107: { name: "Iron Sword", type: "sword", target: "Entity", power: 3, color: "#707070" },
	// Light items (tier 1 — bench)
	108: { name: "Lantern", type: "light", target: "Light", power: 1, color: "#FFD700" },
	// Light items (tier 2 — forge)
	109: { name: "Ember Lantern", type: "light", target: "Light", power: 2, color: "#FF6600" },
	// Food
	201: { name: "Raw Meat", type: "food", target: "Hunger", power: 10, color: "#8B4513" },
	202: { name: "Cooked Meat", type: "food", target: "Hunger", power: 35, color: "#CD853F" },
};

/** Recipe tier: 0=hand, 1=Crafting Bench, 2=Forge, 3=Scriptorium. */
export type RecipeTier = 0 | 1 | 2 | 3;

export const TIER_NAMES: Record<RecipeTier, string> = {
	0: "Hand",
	1: "Bench",
	2: "Forge",
	3: "Scriptorium",
};

export interface CraftRecipe {
	id: string;
	name: string;
	result: { type: "block" | "item"; id: number; qty: number };
	cost: Record<number, number>;
	/** Minimum workstation tier required. 0 = craftable by hand anywhere. */
	tier: RecipeTier;
}

export const RECIPES: CraftRecipe[] = [
	// ─── Tier 0: Hand-craftable (always available) ───
	{
		id: "planks",
		name: "Wood Planks x4",
		result: { type: "block", id: BlockId.Planks, qty: 4 },
		cost: { [BlockId.Wood]: 1 },
		tier: 0,
	},
	{
		id: "torch",
		name: "Torches x4",
		result: { type: "block", id: BlockId.Torch, qty: 4 },
		cost: { [BlockId.Wood]: 1 },
		tier: 0,
	},
	{
		id: "bricks",
		name: "Stone Bricks x4",
		result: { type: "block", id: BlockId.StoneBricks, qty: 4 },
		cost: { [BlockId.Stone]: 4 },
		tier: 0,
	},
	{
		id: "glass",
		name: "Mystic Glass x1",
		result: { type: "block", id: BlockId.Glass, qty: 1 },
		cost: { [BlockId.Sand]: 1 },
		tier: 0,
	},
	{
		id: "wood_axe",
		name: "Wooden Axe",
		result: { type: "item", id: 101, qty: 1 },
		cost: { [BlockId.Wood]: 3 },
		tier: 0,
	},
	{
		id: "wood_pick",
		name: "Wooden Pickaxe",
		result: { type: "item", id: 102, qty: 1 },
		cost: { [BlockId.Wood]: 5 },
		tier: 0,
	},
	{
		id: "cooked_meat",
		name: "Cooked Meat",
		result: { type: "item", id: 202, qty: 1 },
		cost: { 201: 1, [BlockId.Torch]: 1 },
		tier: 0,
	},
	{
		id: "crafting_bench",
		name: "Crafting Bench",
		result: { type: "block", id: BlockId.CraftingBench, qty: 1 },
		cost: { [BlockId.Planks]: 4, [BlockId.Wood]: 2 },
		tier: 0,
	},
	// ─── Tier 1: Crafting Bench ───
	{
		id: "stone_pick",
		name: "Stone Pickaxe",
		result: { type: "item", id: 103, qty: 1 },
		cost: { [BlockId.Stone]: 5 },
		tier: 1,
	},
	{
		id: "sword",
		name: "Stone Sword",
		result: { type: "item", id: 104, qty: 1 },
		cost: { [BlockId.Wood]: 2, [BlockId.Stone]: 3 },
		tier: 1,
	},
	{
		id: "lantern",
		name: "Lantern",
		result: { type: "item", id: 108, qty: 1 },
		cost: { [BlockId.Glass]: 1, [BlockId.IronOre]: 1 },
		tier: 1,
	},
	{
		id: "forge",
		name: "Forge",
		result: { type: "block", id: BlockId.Forge, qty: 1 },
		cost: { [BlockId.Stone]: 8, [BlockId.IronOre]: 4, [BlockId.Torch]: 2 },
		tier: 1,
	},
	{
		id: "treated_planks",
		name: "Treated Planks x4",
		result: { type: "block", id: BlockId.TreatedPlanks, qty: 4 },
		cost: { [BlockId.Planks]: 4, [BlockId.Peat]: 1 },
		tier: 1,
	},
	// ─── Tier 2: Forge ───
	{
		id: "iron_pick",
		name: "Iron Pickaxe",
		result: { type: "item", id: 105, qty: 1 },
		cost: { [BlockId.IronOre]: 5, [BlockId.Wood]: 2 },
		tier: 2,
	},
	{
		id: "iron_axe",
		name: "Iron Axe",
		result: { type: "item", id: 106, qty: 1 },
		cost: { [BlockId.IronOre]: 3, [BlockId.Wood]: 2 },
		tier: 2,
	},
	{
		id: "iron_sword",
		name: "Iron Sword",
		result: { type: "item", id: 107, qty: 1 },
		cost: { [BlockId.IronOre]: 4, [BlockId.Wood]: 1 },
		tier: 2,
	},
	{
		id: "ember_lantern",
		name: "Ember Lantern",
		result: { type: "item", id: 109, qty: 1 },
		cost: { [BlockId.Glass]: 2, [BlockId.IronOre]: 2, [BlockId.CopperOre]: 1 },
		tier: 2,
	},
	{
		id: "reinforced_bricks",
		name: "Reinforced Bricks x4",
		result: { type: "block", id: BlockId.ReinforcedBricks, qty: 4 },
		cost: { [BlockId.StoneBricks]: 4, [BlockId.IronOre]: 2 },
		tier: 2,
	},
	{
		id: "scriptorium",
		name: "Scriptorium",
		result: { type: "block", id: BlockId.Scriptorium, qty: 1 },
		cost: { [BlockId.TreatedPlanks]: 4, [BlockId.Crystal]: 2, [BlockId.RuneStone]: 1 },
		tier: 2,
	},
];
