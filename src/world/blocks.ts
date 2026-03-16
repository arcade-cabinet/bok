import { Face, type BlockDefinition } from "@jolly-pixel/voxel.renderer";

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
} as const;

export interface BlockMeta {
  name: string;
  color: string;
  solid: boolean;
  transparent?: boolean;
  fluid?: boolean;
  emissive?: boolean;
  hardness: number;
}

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
};

export function getBlockHardness(blockId: number): number {
  return BLOCKS[blockId]?.hardness ?? 1.0;
}

export interface ItemDef {
  name: string;
  type: "axe" | "pickaxe" | "sword";
  target: string;
  power: number;
  color: string;
}

export const ITEMS: Record<number, ItemDef> = {
  101: { name: "Wood Axe", type: "axe", target: "Wood", power: 3, color: "#8D6E63" },
  102: { name: "Wood Pickaxe", type: "pickaxe", target: "Stone", power: 3, color: "#8D6E63" },
  103: { name: "Stone Pickaxe", type: "pickaxe", target: "Stone", power: 6, color: "#9E9E9E" },
  104: { name: "Stone Sword", type: "sword", target: "Entity", power: 1, color: "#9E9E9E" },
};

export interface CraftRecipe {
  id: string;
  name: string;
  result: { type: "block" | "item"; id: number; qty: number };
  cost: Record<string, number>;
}

export const RECIPES: CraftRecipe[] = [
  { id: "planks", name: "Wood Planks x4", result: { type: "block", id: BlockId.Planks, qty: 4 }, cost: { wood: 1 } },
  { id: "torch", name: "Torches x4", result: { type: "block", id: BlockId.Torch, qty: 4 }, cost: { wood: 1 } },
  { id: "bricks", name: "Stone Bricks x4", result: { type: "block", id: BlockId.StoneBricks, qty: 4 }, cost: { stone: 4 } },
  { id: "glass", name: "Mystic Glass x1", result: { type: "block", id: BlockId.Glass, qty: 1 }, cost: { sand: 1 } },
  { id: "wood_axe", name: "Wooden Axe", result: { type: "item", id: 101, qty: 1 }, cost: { wood: 3 } },
  { id: "wood_pick", name: "Wooden Pickaxe", result: { type: "item", id: 102, qty: 1 }, cost: { wood: 5 } },
  { id: "stone_pick", name: "Stone Pickaxe", result: { type: "item", id: 103, qty: 1 }, cost: { stone: 5 } },
  { id: "sword", name: "Stone Sword", result: { type: "item", id: 104, qty: 1 }, cost: { wood: 2, stone: 3 } },
];

export function createBlockDefinitions(): BlockDefinition[] {
  return [
    {
      id: BlockId.Grass,
      name: "Grass",
      shapeId: "cube",
      collidable: true,
      faceTextures: {
        [Face.PosY]: { tilesetId: "default", col: 0, row: 0 },
        [Face.NegY]: { tilesetId: "default", col: 2, row: 0 },
        [Face.NegX]: { tilesetId: "default", col: 1, row: 0 },
        [Face.PosX]: { tilesetId: "default", col: 1, row: 0 },
        [Face.NegZ]: { tilesetId: "default", col: 1, row: 0 },
        [Face.PosZ]: { tilesetId: "default", col: 1, row: 0 },
      },
      defaultTexture: { tilesetId: "default", col: 1, row: 0 },
    },
    {
      id: BlockId.Dirt,
      name: "Dirt",
      shapeId: "cube",
      collidable: true,
      faceTextures: {},
      defaultTexture: { tilesetId: "default", col: 2, row: 0 },
    },
    {
      id: BlockId.Stone,
      name: "Stone",
      shapeId: "cube",
      collidable: true,
      faceTextures: {},
      defaultTexture: { tilesetId: "default", col: 3, row: 0 },
    },
    {
      id: BlockId.Wood,
      name: "Wood",
      shapeId: "cube",
      collidable: true,
      faceTextures: {
        [Face.PosY]: { tilesetId: "default", col: 5, row: 0 },
        [Face.NegY]: { tilesetId: "default", col: 5, row: 0 },
      },
      defaultTexture: { tilesetId: "default", col: 4, row: 0 },
    },
    {
      id: BlockId.Leaves,
      name: "Leaves",
      shapeId: "cube",
      collidable: true,
      faceTextures: {},
      defaultTexture: { tilesetId: "default", col: 6, row: 0 },
    },
    {
      id: BlockId.Planks,
      name: "Planks",
      shapeId: "cube",
      collidable: true,
      faceTextures: {},
      defaultTexture: { tilesetId: "default", col: 7, row: 0 },
    },
    {
      id: BlockId.Water,
      name: "Water",
      shapeId: "cube",
      collidable: false,
      faceTextures: {},
      defaultTexture: { tilesetId: "default", col: 0, row: 1 },
    },
    {
      id: BlockId.Torch,
      name: "Torch",
      shapeId: "poleY",
      collidable: true,
      faceTextures: {},
      defaultTexture: { tilesetId: "default", col: 1, row: 1 },
    },
    {
      id: BlockId.Sand,
      name: "Sand",
      shapeId: "cube",
      collidable: true,
      faceTextures: {},
      defaultTexture: { tilesetId: "default", col: 2, row: 1 },
    },
    {
      id: BlockId.Snow,
      name: "Snow",
      shapeId: "cube",
      collidable: true,
      faceTextures: {
        [Face.PosY]: { tilesetId: "default", col: 3, row: 1 },
        [Face.NegY]: { tilesetId: "default", col: 2, row: 0 },
      },
      defaultTexture: { tilesetId: "default", col: 4, row: 1 },
    },
    {
      id: BlockId.StoneBricks,
      name: "Stonebricks",
      shapeId: "cube",
      collidable: true,
      faceTextures: {},
      defaultTexture: { tilesetId: "default", col: 5, row: 1 },
    },
    {
      id: BlockId.Glass,
      name: "Glass",
      shapeId: "cube",
      collidable: true,
      faceTextures: {},
      defaultTexture: { tilesetId: "default", col: 6, row: 1 },
    },
  ];
}
