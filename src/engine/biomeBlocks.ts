/**
 * @module engine/biomeBlocks
 * @role Biome-specific BlockDefinition arrays for the VoxelRenderer
 * @input Biome ID string
 * @output BlockDefinition[] containing base blocks + biome-specific blocks
 * @tested terrainSetup.test.ts
 */
import { type BlockDefinition, Face, type TileRef } from '@jolly-pixel/voxel.renderer';
import { TILES } from '../rendering/TilesetGenerator.ts';

// --- Base block definitions (shared across all biomes, IDs 1-7) ---
export const BASE_BLOCK_DEFS: BlockDefinition[] = [
  {
    id: 1,
    name: 'Grass',
    shapeId: 'cube',
    collidable: true,
    faceTextures: { [Face.PosY]: TILES.GRASS_TOP as TileRef, [Face.NegY]: TILES.DIRT as TileRef },
    defaultTexture: TILES.DIRT as TileRef,
  },
  {
    id: 2,
    name: 'Dirt',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.DIRT as TileRef,
  },
  {
    id: 3,
    name: 'Stone',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.STONE as TileRef,
  },
  {
    id: 4,
    name: 'Water',
    shapeId: 'cube',
    collidable: false,
    faceTextures: {},
    defaultTexture: TILES.WATER as TileRef,
  },
  {
    id: 5,
    name: 'Sand',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.SAND as TileRef,
  },
  {
    id: 6,
    name: 'Wood',
    shapeId: 'cube',
    collidable: true,
    faceTextures: { [Face.PosY]: TILES.WOOD_TOP as TileRef, [Face.NegY]: TILES.WOOD_TOP as TileRef },
    defaultTexture: TILES.WOOD_SIDE as TileRef,
  },
  {
    id: 7,
    name: 'Leaves',
    shapeId: 'cube',
    collidable: false,
    faceTextures: {},
    defaultTexture: TILES.LEAVES as TileRef,
  },
];

// --- Shaped blocks (IDs 100+) — slabs, poles, ramps, stairs for terrain variety ---
export const SHAPED_BLOCK_DEFS: BlockDefinition[] = [
  // Half-height slabs — for paths, ledges, platforms
  {
    id: 100,
    name: 'Stone Slab',
    shapeId: 'slabBottom',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.STONE as TileRef,
  },
  {
    id: 101,
    name: 'Wood Slab',
    shapeId: 'slabBottom',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.WOOD_SIDE as TileRef,
  },
  {
    id: 102,
    name: 'Sand Slab',
    shapeId: 'slabBottom',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.SAND as TileRef,
  },

  // Poles — for fences, pillars, posts
  {
    id: 110,
    name: 'Stone Pole',
    shapeId: 'poleY',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.STONE as TileRef,
  },
  {
    id: 111,
    name: 'Wood Pole',
    shapeId: 'poleY',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.WOOD_SIDE as TileRef,
  },

  // Ramps — for natural slopes, terrain transitions
  {
    id: 120,
    name: 'Grass Ramp',
    shapeId: 'ramp',
    collidable: true,
    faceTextures: { [Face.PosY]: TILES.GRASS_TOP as TileRef },
    defaultTexture: TILES.DIRT as TileRef,
  },
  {
    id: 121,
    name: 'Stone Ramp',
    shapeId: 'ramp',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.STONE as TileRef,
  },
  {
    id: 122,
    name: 'Sand Ramp',
    shapeId: 'ramp',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.SAND as TileRef,
  },

  // Stairs — for structured ascents
  {
    id: 130,
    name: 'Stone Stairs',
    shapeId: 'stair',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.STONE as TileRef,
  },
  {
    id: 131,
    name: 'Wood Stairs',
    shapeId: 'stair',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.WOOD_SIDE as TileRef,
  },

  // Top slabs — for ceilings, overhangs
  {
    id: 140,
    name: 'Stone Ceiling',
    shapeId: 'slabTop',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.STONE as TileRef,
  },
];

// --- Biome-specific block definitions ---

const DESERT_BLOCKS: BlockDefinition[] = [
  {
    id: 10,
    name: 'Sand Surface',
    shapeId: 'cube',
    collidable: true,
    faceTextures: { [Face.PosY]: TILES.SAND_SURFACE as TileRef },
    defaultTexture: TILES.SANDSTONE as TileRef,
  },
  {
    id: 11,
    name: 'Sandstone',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.SANDSTONE as TileRef,
  },
  {
    id: 12,
    name: 'Desert Stone',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.DESERT_STONE as TileRef,
  },
  {
    id: 13,
    name: 'Oasis Water',
    shapeId: 'cube',
    collidable: false,
    faceTextures: {},
    defaultTexture: TILES.OASIS_WATER as TileRef,
  },
  {
    id: 14,
    name: 'Cactus',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.CACTUS_GREEN as TileRef,
  },
];

const TUNDRA_BLOCKS: BlockDefinition[] = [
  {
    id: 20,
    name: 'Snow Top',
    shapeId: 'cube',
    collidable: true,
    faceTextures: { [Face.PosY]: TILES.SNOW_TOP as TileRef },
    defaultTexture: TILES.FROZEN_DIRT as TileRef,
  },
  {
    id: 21,
    name: 'Frozen Dirt',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.FROZEN_DIRT as TileRef,
  },
  {
    id: 22,
    name: 'Ice',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.ICE as TileRef,
  },
  {
    id: 23,
    name: 'Frost Water',
    shapeId: 'cube',
    collidable: false,
    faceTextures: {},
    defaultTexture: TILES.FROST_WATER as TileRef,
  },
  {
    id: 24,
    name: 'Permafrost',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.PERMAFROST as TileRef,
  },
];

const VOLCANIC_BLOCKS: BlockDefinition[] = [
  {
    id: 30,
    name: 'Obsidian',
    shapeId: 'cube',
    collidable: true,
    faceTextures: { [Face.PosY]: TILES.OBSIDIAN as TileRef },
    defaultTexture: TILES.BASALT as TileRef,
  },
  {
    id: 31,
    name: 'Ash',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.ASH as TileRef,
  },
  {
    id: 32,
    name: 'Basalt',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.BASALT as TileRef,
  },
  {
    id: 33,
    name: 'Lava',
    shapeId: 'cube',
    collidable: false,
    faceTextures: {},
    defaultTexture: TILES.LAVA as TileRef,
  },
  {
    id: 34,
    name: 'Magma Crust',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.MAGMA_CRUST as TileRef,
  },
];

const SWAMP_BLOCKS: BlockDefinition[] = [
  {
    id: 40,
    name: 'Mud Surface',
    shapeId: 'cube',
    collidable: true,
    faceTextures: { [Face.PosY]: TILES.MUD_SURFACE as TileRef },
    defaultTexture: TILES.PEAT as TileRef,
  },
  {
    id: 41,
    name: 'Peat',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.PEAT as TileRef,
  },
  {
    id: 42,
    name: 'Swamp Stone',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.SWAMP_STONE as TileRef,
  },
  {
    id: 43,
    name: 'Murky Water',
    shapeId: 'cube',
    collidable: false,
    faceTextures: {},
    defaultTexture: TILES.MURKY_WATER as TileRef,
  },
  {
    id: 44,
    name: 'Dead Wood',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.DEAD_WOOD as TileRef,
  },
];

const CRYSTAL_BLOCKS: BlockDefinition[] = [
  {
    id: 50,
    name: 'Crystal Surface',
    shapeId: 'cube',
    collidable: true,
    faceTextures: { [Face.PosY]: TILES.CRYSTAL_SURFACE as TileRef },
    defaultTexture: TILES.GEODE_WALL as TileRef,
  },
  {
    id: 51,
    name: 'Geode Wall',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.GEODE_WALL as TileRef,
  },
  {
    id: 52,
    name: 'Amethyst',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.AMETHYST as TileRef,
  },
  {
    id: 53,
    name: 'Crystal Water',
    shapeId: 'cube',
    collidable: false,
    faceTextures: {},
    defaultTexture: TILES.CRYSTAL_WATER as TileRef,
  },
  {
    id: 54,
    name: 'Quartz',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.QUARTZ as TileRef,
  },
];

const SKY_BLOCKS: BlockDefinition[] = [
  {
    id: 60,
    name: 'Cloud Top',
    shapeId: 'cube',
    collidable: true,
    faceTextures: { [Face.PosY]: TILES.CLOUD_TOP as TileRef },
    defaultTexture: TILES.CLOUD_BASE as TileRef,
  },
  {
    id: 61,
    name: 'Cloud Base',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.CLOUD_BASE as TileRef,
  },
  {
    id: 62,
    name: 'Sky Stone',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.SKY_STONE as TileRef,
  },
  {
    id: 63,
    name: 'Void',
    shapeId: 'cube',
    collidable: false,
    faceTextures: {},
    defaultTexture: TILES.VOID as TileRef,
  },
  {
    id: 64,
    name: 'Wind Block',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.WIND_BLOCK as TileRef,
  },
];

const OCEAN_BLOCKS: BlockDefinition[] = [
  {
    id: 70,
    name: 'Coral Surface',
    shapeId: 'cube',
    collidable: true,
    faceTextures: { [Face.PosY]: TILES.CORAL_SURFACE as TileRef },
    defaultTexture: TILES.SEA_FLOOR as TileRef,
  },
  {
    id: 71,
    name: 'Sea Floor',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.SEA_FLOOR as TileRef,
  },
  {
    id: 72,
    name: 'Ocean Stone',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.OCEAN_STONE as TileRef,
  },
  {
    id: 73,
    name: 'Deep Water',
    shapeId: 'cube',
    collidable: false,
    faceTextures: {},
    defaultTexture: TILES.DEEP_WATER as TileRef,
  },
  {
    id: 74,
    name: 'Kelp',
    shapeId: 'cube',
    collidable: false,
    faceTextures: {},
    defaultTexture: TILES.KELP as TileRef,
  },
];

/**
 * Returns the complete BlockDefinition array for a given biome,
 * including the base blocks (IDs 1-7) plus biome-specific blocks.
 */
/**
 * Returns the complete BlockDefinition array for a given biome,
 * including base blocks (IDs 1-7), shaped blocks (IDs 100+),
 * and biome-specific blocks.
 */
export function getBiomeBlockDefs(biomeId: string): BlockDefinition[] {
  const shaped = SHAPED_BLOCK_DEFS;
  switch (biomeId) {
    case 'forest':
      return [...BASE_BLOCK_DEFS, ...shaped];
    case 'desert':
      return [...BASE_BLOCK_DEFS, ...shaped, ...DESERT_BLOCKS];
    case 'tundra':
      return [...BASE_BLOCK_DEFS, ...shaped, ...TUNDRA_BLOCKS];
    case 'volcanic':
      return [...BASE_BLOCK_DEFS, ...shaped, ...VOLCANIC_BLOCKS];
    case 'swamp':
      return [...BASE_BLOCK_DEFS, ...shaped, ...SWAMP_BLOCKS];
    case 'crystal-caves':
      return [...BASE_BLOCK_DEFS, ...shaped, ...CRYSTAL_BLOCKS];
    case 'sky-ruins':
      return [...BASE_BLOCK_DEFS, ...shaped, ...SKY_BLOCKS];
    case 'deep-ocean':
      return [...BASE_BLOCK_DEFS, ...shaped, ...OCEAN_BLOCKS];
    default:
      return [...BASE_BLOCK_DEFS, ...shaped];
  }
}
