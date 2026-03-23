/**
 * @module generation/StructureTemplates
 * @role Define placeable voxel structures using converted asset pieces
 *
 * Each template is a list of model placements relative to an origin.
 * The StructureGenerator places templates on terrain, the renderer
 * loads the glTF models at the specified positions.
 *
 * Asset categories:
 * - Stone/ — dungeon/ruin pieces (walls, pillars, ground tiles)
 * - Village/ — house pieces (walls, roofs, corners, beams)
 * - Objects/ — decorative (barrels, crates, torches, doors)
 */

export interface StructurePiece {
  /** glTF model path relative to /assets/models/ */
  model: string;
  /** Position offset from structure origin */
  x: number;
  y: number;
  z: number;
  /** Y rotation in radians */
  rotY?: number;
  /** Scale multiplier */
  scale?: number;
}

export interface StructureTemplate {
  id: string;
  name: string;
  /** Which biomes this structure can appear in */
  biomes: string[];
  /** Minimum space needed (width × depth) */
  footprint: number;
  pieces: StructurePiece[];
}

const S = '/assets/models'; // shorthand

export const STRUCTURE_TEMPLATES: StructureTemplate[] = [
  // --- Ruins (forest, swamp, crystal-caves) ---
  {
    id: 'stone-ruin-small',
    name: 'Crumbling Ruin',
    biomes: ['forest', 'swamp', 'crystal-caves', 'sky-ruins'],
    footprint: 6,
    pieces: [
      { model: `${S}/Stone/STN_WALL_DARK_MID.gltf`, x: 0, y: 0, z: 0 },
      { model: `${S}/Stone/STN_WALL_BRKN.gltf`, x: 2, y: 0, z: 0 },
      { model: `${S}/Stone/STN_PLR.gltf`, x: 0, y: 0, z: 3 },
      { model: `${S}/Stone/STN_PLR.gltf`, x: 4, y: 0, z: 3 },
      { model: `${S}/Stone/STN_MOSS_HALF_3D.gltf`, x: 1, y: 0, z: 1 },
      { model: `${S}/Objects/Gravestone_1.gltf`, x: 2, y: 0, z: 4, scale: 0.5 },
    ],
  },

  // --- Dungeon Entrance (volcanic, crystal-caves, deep-ocean) ---
  {
    id: 'dungeon-entrance',
    name: 'Dungeon Gate',
    biomes: ['volcanic', 'crystal-caves', 'deep-ocean', 'tundra'],
    footprint: 8,
    pieces: [
      { model: `${S}/Stone/STN_PLR_LNGR_DARK.gltf`, x: 0, y: 0, z: 0 },
      { model: `${S}/Stone/STN_PLR_LNGR_DARK.gltf`, x: 5, y: 0, z: 0 },
      { model: `${S}/Stone/STN_WALL_DRK_TOP.gltf`, x: 1, y: 3, z: 0 },
      { model: `${S}/Stone/STN_WALL_DRK_TOP.gltf`, x: 3, y: 3, z: 0 },
      { model: `${S}/Objects/Door_Reg.gltf`, x: 2, y: 0, z: 0 },
      { model: `${S}/Objects/Torch_Long.gltf`, x: 0, y: 2, z: -1 },
      { model: `${S}/Objects/Torch_Long.gltf`, x: 5, y: 2, z: -1 },
    ],
  },

  // --- Shrine (all biomes) ---
  {
    id: 'shrine',
    name: 'Ancient Shrine',
    biomes: ['forest', 'desert', 'tundra', 'volcanic', 'swamp', 'crystal-caves', 'sky-ruins', 'deep-ocean'],
    footprint: 4,
    pieces: [
      { model: `${S}/Stone/STN_PLR.gltf`, x: 0, y: 0, z: 0 },
      { model: `${S}/Stone/STN_PLR.gltf`, x: 3, y: 0, z: 0 },
      { model: `${S}/Stone/STN_PLR.gltf`, x: 0, y: 0, z: 3 },
      { model: `${S}/Stone/STN_PLR.gltf`, x: 3, y: 0, z: 3 },
      { model: `${S}/Objects/Flower_Red.gltf`, x: 1.5, y: 0, z: 1.5, scale: 0.7 },
    ],
  },

  // --- Market Stall (forest, desert) ---
  {
    id: 'market-stall',
    name: 'Abandoned Market',
    biomes: ['forest', 'desert', 'swamp'],
    footprint: 5,
    pieces: [
      { model: `${S}/Objects/Market_Stall.gltf`, x: 0, y: 0, z: 0 },
      { model: `${S}/Objects/Barrel.gltf`, x: 3, y: 0, z: 0, scale: 0.6 },
      { model: `${S}/Objects/Crate.gltf`, x: -1, y: 0, z: 1, scale: 0.5 },
    ],
  },

  // --- Tower (sky-ruins, tundra) ---
  {
    id: 'watchtower',
    name: 'Ruined Watchtower',
    biomes: ['sky-ruins', 'tundra', 'forest'],
    footprint: 5,
    pieces: [
      { model: `${S}/Stone/STN_CNR.gltf`, x: 0, y: 0, z: 0 },
      { model: `${S}/Stone/STN_WALL_DARK_MID.gltf`, x: 1, y: 0, z: 0 },
      { model: `${S}/Stone/STN_CNR.gltf`, x: 3, y: 0, z: 0, rotY: Math.PI / 2 },
      { model: `${S}/Stone/STN_WALL_DARK_MID.gltf`, x: 0, y: 2, z: 0 },
      { model: `${S}/Stone/STN_WALL_BRKN_INV.gltf`, x: 2, y: 2, z: 0 },
      { model: `${S}/Objects/Torch_Long_Blue.gltf`, x: 1.5, y: 3, z: -0.5 },
    ],
  },

  // --- Village House (hub, forest) ---
  {
    id: 'village-house',
    name: 'Village Cottage',
    biomes: ['forest'],
    footprint: 6,
    pieces: [
      { model: `${S}/Village/VILL_H_W_V1.gltf`, x: 0, y: 0, z: 0 },
      { model: `${S}/Village/VILL_H_W_V2.gltf`, x: 2, y: 0, z: 0 },
      { model: `${S}/Village/VILL_H_W_V1.gltf`, x: 0, y: 0, z: 3, rotY: Math.PI },
      { model: `${S}/Village/VILL_H_W_V2.gltf`, x: 2, y: 0, z: 3, rotY: Math.PI },
      { model: `${S}/Village/VILL_H_RF_W_R.gltf`, x: 0, y: 2, z: 0 },
      { model: `${S}/Village/VILL_H_RF_W_R.gltf`, x: 2, y: 2, z: 0 },
    ],
  },
];

/** Get templates valid for a specific biome. */
export function getTemplatesForBiome(biomeId: string): StructureTemplate[] {
  return STRUCTURE_TEMPLATES.filter((t) => t.biomes.includes(biomeId));
}
