/**
 * Jolly Pixel VoxelRenderer block definitions.
 * Maps each BlockId to its shape, collidability, and tileset texture coordinates.
 *
 * Tileset layout (8 cols × 5 rows):
 * Row 0: GrassTop, GrassSide, Dirt, Stone, WoodSide, WoodTop, Leaves, Planks
 * Row 1: Water, Torch, Sand, SnowTop, SnowSide, StoneBricks, Glass, BirchWoodSide
 * Row 2: BirchWoodTop, BirchLeaves, BeechWoodSide, BeechWoodTop, BeechLeaves, PineWoodSide, PineWoodTop, PineLeaves
 * Row 3: SpruceLeaves, DeadWoodSide, DeadWoodTop, Moss, Mushroom, Peat, Ice, SmoothStone
 * Row 4: Soot, CorruptedStone, IronOre, CopperOre, Crystal, FaluRed
 */

import { type BlockDefinition, Face } from "@jolly-pixel/voxel.renderer";
import { BlockId } from "./blocks.ts";

const T = "default";

function tile(col: number, row: number) {
	return { tilesetId: T, col, row };
}

function simpleCube(id: number, name: string, col: number, row: number): BlockDefinition {
	return { id, name, shapeId: "cube", collidable: true, faceTextures: {}, defaultTexture: tile(col, row) };
}

function woodBlock(
	id: number,
	name: string,
	sideCol: number,
	sideRow: number,
	topCol: number,
	topRow: number,
): BlockDefinition {
	return {
		id,
		name,
		shapeId: "cube",
		collidable: true,
		faceTextures: {
			[Face.PosY]: tile(topCol, topRow),
			[Face.NegY]: tile(topCol, topRow),
		},
		defaultTexture: tile(sideCol, sideRow),
	};
}

export function createBlockDefinitions(): BlockDefinition[] {
	return [
		// Original blocks
		{
			id: BlockId.Grass,
			name: "Grass",
			shapeId: "cube",
			collidable: true,
			faceTextures: {
				[Face.PosY]: tile(0, 0),
				[Face.NegY]: tile(2, 0),
				[Face.NegX]: tile(1, 0),
				[Face.PosX]: tile(1, 0),
				[Face.NegZ]: tile(1, 0),
				[Face.PosZ]: tile(1, 0),
			},
			defaultTexture: tile(1, 0),
		},
		simpleCube(BlockId.Dirt, "Dirt", 2, 0),
		simpleCube(BlockId.Stone, "Stone", 3, 0),
		woodBlock(BlockId.Wood, "Wood", 4, 0, 5, 0),
		simpleCube(BlockId.Leaves, "Leaves", 6, 0),
		simpleCube(BlockId.Planks, "Planks", 7, 0),
		{
			id: BlockId.Water,
			name: "Water",
			shapeId: "cube",
			collidable: false,
			faceTextures: {},
			defaultTexture: tile(0, 1),
		},
		{
			id: BlockId.Torch,
			name: "Torch",
			shapeId: "poleY",
			collidable: false,
			faceTextures: {},
			defaultTexture: tile(1, 1),
		},
		simpleCube(BlockId.Sand, "Sand", 2, 1),
		{
			id: BlockId.Snow,
			name: "Snow",
			shapeId: "cube",
			collidable: true,
			faceTextures: {
				[Face.PosY]: tile(3, 1),
				[Face.NegY]: tile(2, 0),
			},
			defaultTexture: tile(4, 1),
		},
		simpleCube(BlockId.StoneBricks, "Stonebricks", 5, 1),
		simpleCube(BlockId.Glass, "Glass", 6, 1),
		// Biome-specific wood types
		woodBlock(BlockId.BirchWood, "Birch Wood", 7, 1, 0, 2),
		woodBlock(BlockId.BeechWood, "Beech Wood", 2, 2, 3, 2),
		woodBlock(BlockId.PineWood, "Pine Wood", 5, 2, 6, 2),
		woodBlock(BlockId.DeadWood, "Dead Wood", 1, 3, 2, 3),
		// Biome-specific leaf types
		simpleCube(BlockId.BirchLeaves, "Birch Leaves", 1, 2),
		simpleCube(BlockId.BeechLeaves, "Beech Leaves", 4, 2),
		simpleCube(BlockId.PineLeaves, "Pine Leaves", 7, 2),
		simpleCube(BlockId.SpruceLeaves, "Spruce Leaves", 0, 3),
		// Terrain & resource blocks
		simpleCube(BlockId.Moss, "Moss", 3, 3),
		{
			id: BlockId.Mushroom,
			name: "Mushroom",
			shapeId: "poleY",
			collidable: false,
			faceTextures: {},
			defaultTexture: tile(4, 3),
		},
		simpleCube(BlockId.Peat, "Peat", 5, 3),
		simpleCube(BlockId.Ice, "Ice", 6, 3),
		simpleCube(BlockId.SmoothStone, "Smooth Stone", 7, 3),
		simpleCube(BlockId.Soot, "Soot", 0, 4),
		simpleCube(BlockId.CorruptedStone, "Corrupted Stone", 1, 4),
		simpleCube(BlockId.IronOre, "Iron Ore", 2, 4),
		simpleCube(BlockId.CopperOre, "Copper Ore", 3, 4),
		simpleCube(BlockId.Crystal, "Crystal", 4, 4),
		simpleCube(BlockId.FaluRed, "Falu Red", 5, 4),
	];
}
