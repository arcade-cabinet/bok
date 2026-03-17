// ─── Resource Data ───
// Pure data: resource types for the world effects layer.
// One resource per cell, max quantity 16.
// No ECS, no Three.js — just enums and metadata.

/** Resource types that runes can produce, collect, and transform. */
export const ResourceId = {
	Ore: 0,
	Ingot: 1,
	Wheat: 2,
	Bread: 3,
	Wood: 4,
	Planks: 5,
	CrystalShard: 6,
	CrystalLens: 7,
	Sand: 8,
	Glass: 9,
	RawMeat: 10,
	CookedMeat: 11,
} as const;

export type ResourceIdValue = (typeof ResourceId)[keyof typeof ResourceId];

export interface ResourceMeta {
	name: string;
	symbol: string;
	color: string;
}

/** Metadata for each resource type. */
export const RESOURCES: Record<ResourceIdValue, ResourceMeta> = {
	[ResourceId.Ore]: { name: "Ore", symbol: "◆", color: "#8B7355" },
	[ResourceId.Ingot]: { name: "Ingot", symbol: "▬", color: "#C0C0C0" },
	[ResourceId.Wheat]: { name: "Wheat", symbol: "⌇", color: "#DAA520" },
	[ResourceId.Bread]: { name: "Bread", symbol: "◎", color: "#D2691E" },
	[ResourceId.Wood]: { name: "Wood", symbol: "▪", color: "#8B6914" },
	[ResourceId.Planks]: { name: "Planks", symbol: "▫", color: "#C4A35A" },
	[ResourceId.CrystalShard]: { name: "Crystal Shard", symbol: "◇", color: "#B388FF" },
	[ResourceId.CrystalLens]: { name: "Crystal Lens", symbol: "◈", color: "#E040FB" },
	[ResourceId.Sand]: { name: "Sand", symbol: "∴", color: "#F0E68C" },
	[ResourceId.Glass]: { name: "Glass", symbol: "◻", color: "#E0F7FA" },
	[ResourceId.RawMeat]: { name: "Raw Meat", symbol: "●", color: "#CD5C5C" },
	[ResourceId.CookedMeat]: { name: "Cooked Meat", symbol: "◉", color: "#8B4513" },
};

/** Maximum quantity a single cell can hold. */
export const MAX_RESOURCE_QTY = 16;
