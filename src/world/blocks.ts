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
export const BLOCKS: Record<number, BlockMeta> = {
	[BlockId.Air]: { name: "Air", color: "#000000", solid: false, hardness: 0 },
	[BlockId.Grass]: { name: "Grass", color: "#4CAF50", solid: true, hardness: 0.8 },
	[BlockId.Dirt]: { name: "Dirt", color: "#795548", solid: true, hardness: 0.6 },
	[BlockId.Stone]: { name: "Stone", color: "#9E9E9E", solid: true, hardness: 4.0 },
	[BlockId.Wood]: { name: "Wood", color: "#5D4037", solid: true, hardness: 2.5 },
	[BlockId.Leaves]: { name: "Leaves", color: "#2E7D32", solid: true, transparent: true, hardness: 0.2 },
	[BlockId.Planks]: { name: "Planks", color: "#8D6E63", solid: true, hardness: 1.5 },
	[BlockId.Water]: { name: "Water", color: "#1E90FF", solid: false, transparent: true, fluid: true, hardness: 0 },
	[BlockId.Torch]: { name: "Torch", color: "#FFD700", solid: false, emissive: true, hardness: 0.1 },
	[BlockId.Sand]: { name: "Sand", color: "#E2C275", solid: true, hardness: 0.7 },
	[BlockId.Snow]: { name: "Snow", color: "#FFFFFF", solid: true, hardness: 0.5 },
	[BlockId.StoneBricks]: { name: "Stonebricks", color: "#757575", solid: true, hardness: 4.0 },
	[BlockId.Glass]: { name: "Glass", color: "#88CCFF", solid: true, transparent: true, hardness: 1.0 },
	// Biome-specific blocks — Björk palette for birch, Mossa for forest greens, Sten for stone variants
	[BlockId.BirchWood]: { name: "Birch Wood", color: "#d4c4a8", solid: true, hardness: 2.0 },
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
	[BlockId.SmoothStone]: { name: "Smooth Stone", color: "#6b6b6b", solid: true, hardness: 5.0 },
	[BlockId.Soot]: { name: "Soot", color: "#2a2a3e", solid: true, hardness: 0.5 },
	[BlockId.CorruptedStone]: { name: "Corrupted Stone", color: "#4a3a5a", solid: true, hardness: 6.0 },
	[BlockId.IronOre]: { name: "Iron Ore", color: "#6b6050", solid: true, hardness: 5.0 },
	[BlockId.CopperOre]: { name: "Copper Ore", color: "#5b6b5b", solid: true, hardness: 4.5 },
	[BlockId.Crystal]: {
		name: "Crystal",
		color: "#c9a84c",
		solid: true,
		transparent: true,
		emissive: true,
		hardness: 3.0,
	},
	[BlockId.FaluRed]: { name: "Falu Red", color: "#8b2500", solid: true, hardness: 2.0 },
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
	type: "axe" | "pickaxe" | "sword";
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
};

export interface CraftRecipe {
	id: string;
	name: string;
	result: { type: "block" | "item"; id: number; qty: number };
	cost: Record<number, number>;
}

export const RECIPES: CraftRecipe[] = [
	{
		id: "planks",
		name: "Wood Planks x4",
		result: { type: "block", id: BlockId.Planks, qty: 4 },
		cost: { [BlockId.Wood]: 1 },
	},
	{
		id: "torch",
		name: "Torches x4",
		result: { type: "block", id: BlockId.Torch, qty: 4 },
		cost: { [BlockId.Wood]: 1 },
	},
	{
		id: "bricks",
		name: "Stone Bricks x4",
		result: { type: "block", id: BlockId.StoneBricks, qty: 4 },
		cost: { [BlockId.Stone]: 4 },
	},
	{
		id: "glass",
		name: "Mystic Glass x1",
		result: { type: "block", id: BlockId.Glass, qty: 1 },
		cost: { [BlockId.Sand]: 1 },
	},
	{ id: "wood_axe", name: "Wooden Axe", result: { type: "item", id: 101, qty: 1 }, cost: { [BlockId.Wood]: 3 } },
	{ id: "wood_pick", name: "Wooden Pickaxe", result: { type: "item", id: 102, qty: 1 }, cost: { [BlockId.Wood]: 5 } },
	{ id: "stone_pick", name: "Stone Pickaxe", result: { type: "item", id: 103, qty: 1 }, cost: { [BlockId.Stone]: 5 } },
	{
		id: "sword",
		name: "Stone Sword",
		result: { type: "item", id: 104, qty: 1 },
		cost: { [BlockId.Wood]: 2, [BlockId.Stone]: 3 },
	},
];
