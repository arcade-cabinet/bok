/**
 * @module content/resources
 * @role Per-island harvestable resource definitions
 * @input Block IDs from terrain, biome identifiers
 * @output Resource lookup functions for block-break → resource-drop pipeline
 * @tested resources.test.ts
 */

export interface ResourceDef {
  id: string;
  name: string;
  icon: string;
  /** Which biomes this resource can be found in. Empty = everywhere. */
  biomes: string[];
  /** Which block IDs drop this resource when broken. */
  fromBlocks: number[];
}

export const RESOURCES: ResourceDef[] = [
  // Universal
  { id: 'stone', name: 'Stone', icon: '\u{1FAA8}', biomes: [], fromBlocks: [3] },
  { id: 'dirt', name: 'Dirt', icon: '\u{1F7EB}', biomes: [], fromBlocks: [2] },
  { id: 'coal', name: 'Coal', icon: '\u26AB', biomes: [], fromBlocks: [] }, // from chests

  // Forest
  { id: 'wood', name: 'Wood', icon: '\u{1FAB5}', biomes: ['forest'], fromBlocks: [6] },
  { id: 'leaves', name: 'Leaves', icon: '\u{1F343}', biomes: ['forest'], fromBlocks: [7] },
  { id: 'herbs', name: 'Herbs', icon: '\u{1F33F}', biomes: ['forest'], fromBlocks: [] },

  // Desert
  { id: 'sand', name: 'Sand', icon: '\u{1F3DC}\uFE0F', biomes: ['desert'], fromBlocks: [5, 10] },
  { id: 'sandstone', name: 'Sandstone', icon: '\u{1F9F1}', biomes: ['desert'], fromBlocks: [11] },
  { id: 'ancient-bone', name: 'Ancient Bone', icon: '\u{1F9B4}', biomes: ['desert'], fromBlocks: [] },

  // Tundra
  { id: 'ice', name: 'Ice', icon: '\u{1F9CA}', biomes: ['tundra'], fromBlocks: [22] },
  { id: 'frost-shard', name: 'Frost Shard', icon: '\u2744\uFE0F', biomes: ['tundra'], fromBlocks: [] },
  { id: 'snow', name: 'Snow', icon: '\u2B1C', biomes: ['tundra'], fromBlocks: [20] },

  // Volcanic
  { id: 'obsidian', name: 'Obsidian', icon: '\u2B1B', biomes: ['volcanic'], fromBlocks: [30] },
  { id: 'magma-crystal', name: 'Magma Crystal', icon: '\u{1F525}', biomes: ['volcanic'], fromBlocks: [] },
  { id: 'ash', name: 'Ash', icon: '\u{1F32B}\uFE0F', biomes: ['volcanic'], fromBlocks: [31] },

  // Swamp
  { id: 'peat', name: 'Peat', icon: '\u{1F7E4}', biomes: ['swamp'], fromBlocks: [41] },
  { id: 'dead-wood', name: 'Dead Wood', icon: '\u{1FAB5}', biomes: ['swamp'], fromBlocks: [44] },
  { id: 'mushroom', name: 'Mushroom', icon: '\u{1F344}', biomes: ['swamp'], fromBlocks: [] },

  // Crystal Caves
  { id: 'amethyst', name: 'Amethyst', icon: '\u{1F48E}', biomes: ['crystal-caves'], fromBlocks: [52] },
  { id: 'quartz', name: 'Quartz', icon: '\u{1F4A0}', biomes: ['crystal-caves'], fromBlocks: [54] },
  { id: 'crystal-shard', name: 'Crystal Shard', icon: '\u2728', biomes: ['crystal-caves'], fromBlocks: [] },

  // Sky Ruins
  { id: 'cloud-block', name: 'Cloud Block', icon: '\u2601\uFE0F', biomes: ['sky-ruins'], fromBlocks: [60] },
  { id: 'sky-stone', name: 'Sky Stone', icon: '\u{1FAA8}', biomes: ['sky-ruins'], fromBlocks: [62] },
  { id: 'wind-essence', name: 'Wind Essence', icon: '\u{1F4A8}', biomes: ['sky-ruins'], fromBlocks: [] },

  // Deep Ocean
  { id: 'coral', name: 'Coral', icon: '\u{1FAB8}', biomes: ['deep-ocean'], fromBlocks: [70] },
  { id: 'kelp', name: 'Kelp', icon: '\u{1F33F}', biomes: ['deep-ocean'], fromBlocks: [74] },
  { id: 'pearl', name: 'Pearl', icon: '\u{1F90D}', biomes: ['deep-ocean'], fromBlocks: [] },
];

/** Pre-built index: blockId → ResourceDef for O(1) lookups at runtime. */
const blockIdIndex = new Map<number, ResourceDef>();
for (const resource of RESOURCES) {
  for (const blockId of resource.fromBlocks) {
    blockIdIndex.set(blockId, resource);
  }
}

/** Look up what resource drops from a block ID. Returns null for air (0) and non-resource blocks. */
export function getResourceForBlock(blockId: number): ResourceDef | null {
  return blockIdIndex.get(blockId) ?? null;
}

/** Get all resources exclusive to a specific biome. */
export function getResourcesForBiome(biomeId: string): ResourceDef[] {
  return RESOURCES.filter((r) => r.biomes.includes(biomeId));
}

/** Get all universal resources (found everywhere). */
export function getUniversalResources(): ResourceDef[] {
  return RESOURCES.filter((r) => r.biomes.length === 0);
}
