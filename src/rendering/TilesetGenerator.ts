/**
 * @module rendering/TilesetGenerator
 * Generates a programmatic tileset texture at runtime.
 * No external PNG dependency — creates bright, game-ready block colors via canvas.
 *
 * Tileset layout (6x6 grid, 32px per tile):
 *   Row 0: wood-side, wood-top, stone, sand-surface, snow-top, obsidian
 *   Row 1: dirt, leaves, sand, sandstone, frozen-dirt, ash
 *   Row 2: grass-top, water, stone-brick, desert-stone, ice, basalt
 *   Row 3: (unused), (unused), (unused), oasis-water, frost-water, lava
 *   Row 4: mud-surface, crystal-surface, cloud-top, cactus-green, permafrost, magma-crust
 *   Row 5: peat, geode-wall, cloud-base, dead-wood, amethyst, sky-stone
 *
 * Additional tiles packed into remaining slots for all biome blocks.
 */

const TILE_SIZE = 32;
const COLS = 6;
const ROWS = 6;

interface BlockColor {
  base: string;
  noise?: number; // 0-1 noise intensity
  lines?: boolean; // vertical grain lines (wood)
  dots?: boolean; // random dots (stone, dirt)
  blend?: string; // secondary color for variation
  glow?: boolean; // emissive-style bright pixels (lava, crystals)
}

// Tiles laid out col-major: TILE_DEFS[col][row]
const TILE_DEFS: BlockColor[][] = [
  // col 0
  [
    { base: '#8B6914', noise: 0.15, lines: true }, // (0,0) wood side
    { base: '#8B5E3C', noise: 0.2, dots: true }, // (0,1) dirt
    { base: '#4CAF50', noise: 0.15, blend: '#66BB6A' }, // (0,2) grass top
    { base: '#5C3A1E', noise: 0.2, blend: '#3D2B1F' }, // (0,3) mud-surface (dark brown-green)
    { base: '#4A2040', noise: 0.15, blend: '#5C2D6E' }, // (0,4) peat (very dark)
    { base: '#6B4226', noise: 0.1, dots: true }, // (0,5) murky-water placeholder → swamp-stone
  ],
  // col 1
  [
    { base: '#A0782C', noise: 0.1 }, // (1,0) wood top
    { base: '#2E7D32', noise: 0.2, blend: '#388E3C' }, // (1,1) leaves
    { base: '#2196F3', noise: 0.1, blend: '#42A5F5' }, // (1,2) water
    { base: '#7B5B3A', noise: 0.15, blend: '#5E4A2E' }, // (1,3) crystal-surface (purple)
    { base: '#3A1060', noise: 0.2, blend: '#4B0082' }, // (1,4) geode-wall (dark purple)
    { base: '#8B45FF', noise: 0.2, glow: true, blend: '#A855F7' }, // (1,5) amethyst (bright purple)
  ],
  // col 2
  [
    { base: '#757575', noise: 0.2, dots: true }, // (2,0) stone
    { base: '#D4A44C', noise: 0.15 }, // (2,1) sand
    { base: '#9E9E9E', noise: 0.1, dots: true }, // (2,2) stone brick
    { base: '#F0F0F8', noise: 0.1, blend: '#E8E8F0' }, // (2,3) cloud-top (white fluffy)
    { base: '#C8C8D8', noise: 0.15, blend: '#B0B0C0' }, // (2,4) cloud-base (light grey)
    { base: '#A0C4E8', noise: 0.1, blend: '#B8D4F0' }, // (2,5) sky-stone (pale blue)
  ],
  // col 3
  [
    { base: '#D4A44C', noise: 0.15, blend: '#C8963C' }, // (3,0) sand-surface (warm tan)
    { base: '#C8B478', noise: 0.1, dots: true }, // (3,1) sandstone (pale)
    { base: '#A0522D', noise: 0.2, dots: true }, // (3,2) desert-stone (red-brown)
    { base: '#40C8C8', noise: 0.15, blend: '#38B0B0' }, // (3,3) oasis-water (turquoise)
    { base: '#2D8B2D', noise: 0.15, blend: '#3DA03D' }, // (3,4) cactus-green
    { base: '#6B4E37', noise: 0.1, lines: true }, // (3,5) dead-wood (dark brown, grain)
  ],
  // col 4
  [
    { base: '#F0F5FA', noise: 0.1, blend: '#D8E8F5' }, // (4,0) snow-top (white + blue tint)
    { base: '#8B7B6B', noise: 0.2, dots: true }, // (4,1) frozen-dirt (grey-brown)
    { base: '#A8D8F0', noise: 0.1, blend: '#90C8E8' }, // (4,2) ice (light blue)
    { base: '#1A3A6B', noise: 0.15, blend: '#0D2850' }, // (4,3) frost-water (dark blue)
    { base: '#7A8A7A', noise: 0.15, dots: true, blend: '#6A7A6A' }, // (4,4) permafrost
    { base: '#6B3FA0', noise: 0.15, blend: '#7B4FB0' }, // (4,5) crystal-surface (purple)
  ],
  // col 5
  [
    { base: '#1A1020', noise: 0.1, blend: '#2A1535' }, // (5,0) obsidian (black + purple sheen)
    { base: '#3A3A3A', noise: 0.2, dots: true }, // (5,1) ash (dark grey)
    { base: '#2A1A10', noise: 0.15, dots: true }, // (5,2) basalt (dark brown)
    { base: '#FF4500', noise: 0.2, glow: true, blend: '#FF6B00' }, // (5,3) lava (orange-red glow)
    { base: '#4A2A0A', noise: 0.15, blend: '#5A3A1A' }, // (5,4) magma-crust
    { base: '#E8A0B0', noise: 0.15, blend: '#F0B8C0' }, // (5,5) coral-surface (pink-orange)
  ],
];

function drawTile(ctx: CanvasRenderingContext2D, col: number, row: number, def: BlockColor): void {
  const x0 = col * TILE_SIZE;
  const y0 = row * TILE_SIZE;

  // Base fill
  ctx.fillStyle = def.base;
  ctx.fillRect(x0, y0, TILE_SIZE, TILE_SIZE);

  // Noise overlay
  if (def.noise) {
    for (let px = 0; px < TILE_SIZE; px++) {
      for (let py = 0; py < TILE_SIZE; py++) {
        if (Math.random() < def.noise) {
          const brightness = Math.random() > 0.5 ? 20 : -20;
          ctx.fillStyle = `rgba(${brightness > 0 ? 255 : 0},${brightness > 0 ? 255 : 0},${brightness > 0 ? 255 : 0},0.15)`;
          ctx.fillRect(x0 + px, y0 + py, 1, 1);
        }
      }
    }
  }

  // Blend secondary color
  if (def.blend) {
    for (let px = 0; px < TILE_SIZE; px++) {
      for (let py = 0; py < TILE_SIZE; py++) {
        if (Math.random() < 0.3) {
          ctx.fillStyle = def.blend;
          ctx.globalAlpha = 0.3;
          ctx.fillRect(x0 + px, y0 + py, 1, 1);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  // Glow effect (bright pixels for lava, crystals)
  if (def.glow) {
    for (let px = 0; px < TILE_SIZE; px++) {
      for (let py = 0; py < TILE_SIZE; py++) {
        if (Math.random() < 0.08) {
          ctx.fillStyle = 'rgba(255,255,200,0.5)';
          ctx.fillRect(x0 + px, y0 + py, 1, 1);
        }
      }
    }
  }

  // Vertical grain lines (wood)
  if (def.lines) {
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    for (let lx = 3; lx < TILE_SIZE; lx += 5 + Math.floor(Math.random() * 3)) {
      ctx.beginPath();
      ctx.moveTo(x0 + lx, y0);
      ctx.lineTo(x0 + lx, y0 + TILE_SIZE);
      ctx.stroke();
    }
  }

  // Random dots (stone, dirt)
  if (def.dots) {
    for (let i = 0; i < 8; i++) {
      const dx = Math.floor(Math.random() * (TILE_SIZE - 4)) + 2;
      const dy = Math.floor(Math.random() * (TILE_SIZE - 4)) + 2;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
      ctx.fillRect(x0 + dx, y0 + dy, 2, 2);
    }
  }

  // Subtle border for block edges
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
}

/**
 * Creates a tileset canvas with all block textures.
 * Returns the canvas as a data URL for loading into TilesetManager.
 */
export function generateTileset(): { canvas: HTMLCanvasElement; dataUrl: string } {
  const canvas = document.createElement('canvas');
  canvas.width = COLS * TILE_SIZE;
  canvas.height = ROWS * TILE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context for tileset generation');

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      drawTile(ctx, col, row, TILE_DEFS[col][row]);
    }
  }

  return { canvas, dataUrl: canvas.toDataURL('image/png') };
}

/**
 * Tile references matching the generated tileset layout.
 * Use these in BlockDefinition.faceTextures / defaultTexture.
 */
export const TILES = {
  // --- Base tiles (existing, IDs 1-7) ---
  WOOD_SIDE: { tilesetId: 'game', col: 0, row: 0 },
  DIRT: { tilesetId: 'game', col: 0, row: 1 },
  GRASS_TOP: { tilesetId: 'game', col: 0, row: 2 },
  WOOD_TOP: { tilesetId: 'game', col: 1, row: 0 },
  LEAVES: { tilesetId: 'game', col: 1, row: 1 },
  WATER: { tilesetId: 'game', col: 1, row: 2 },
  STONE: { tilesetId: 'game', col: 2, row: 0 },
  SAND: { tilesetId: 'game', col: 2, row: 1 },
  STONE_BRICK: { tilesetId: 'game', col: 2, row: 2 },

  // --- Desert (IDs 10-14) ---
  SAND_SURFACE: { tilesetId: 'game', col: 3, row: 0 },
  SANDSTONE: { tilesetId: 'game', col: 3, row: 1 },
  DESERT_STONE: { tilesetId: 'game', col: 3, row: 2 },
  OASIS_WATER: { tilesetId: 'game', col: 3, row: 3 },
  CACTUS_GREEN: { tilesetId: 'game', col: 3, row: 4 },

  // --- Tundra (IDs 20-24) ---
  SNOW_TOP: { tilesetId: 'game', col: 4, row: 0 },
  FROZEN_DIRT: { tilesetId: 'game', col: 4, row: 1 },
  ICE: { tilesetId: 'game', col: 4, row: 2 },
  FROST_WATER: { tilesetId: 'game', col: 4, row: 3 },
  PERMAFROST: { tilesetId: 'game', col: 4, row: 4 },

  // --- Volcanic (IDs 30-34) ---
  OBSIDIAN: { tilesetId: 'game', col: 5, row: 0 },
  ASH: { tilesetId: 'game', col: 5, row: 1 },
  BASALT: { tilesetId: 'game', col: 5, row: 2 },
  LAVA: { tilesetId: 'game', col: 5, row: 3 },
  MAGMA_CRUST: { tilesetId: 'game', col: 5, row: 4 },

  // --- Swamp (IDs 40-44) ---
  MUD_SURFACE: { tilesetId: 'game', col: 0, row: 3 },
  PEAT: { tilesetId: 'game', col: 0, row: 4 },
  SWAMP_STONE: { tilesetId: 'game', col: 0, row: 5 },
  MURKY_WATER: { tilesetId: 'game', col: 1, row: 3 },
  DEAD_WOOD: { tilesetId: 'game', col: 3, row: 5 },

  // --- Crystal (IDs 50-54) ---
  CRYSTAL_SURFACE: { tilesetId: 'game', col: 4, row: 5 },
  GEODE_WALL: { tilesetId: 'game', col: 1, row: 4 },
  AMETHYST: { tilesetId: 'game', col: 1, row: 5 },
  CRYSTAL_WATER: { tilesetId: 'game', col: 2, row: 5 },
  QUARTZ: { tilesetId: 'game', col: 2, row: 4 },

  // --- Sky (IDs 60-64) ---
  CLOUD_TOP: { tilesetId: 'game', col: 2, row: 3 },
  CLOUD_BASE: { tilesetId: 'game', col: 2, row: 4 },
  SKY_STONE: { tilesetId: 'game', col: 2, row: 5 },
  VOID: { tilesetId: 'game', col: 2, row: 3 }, // reuse cloud-top for void fallback
  WIND_BLOCK: { tilesetId: 'game', col: 2, row: 4 }, // reuse cloud-base

  // --- Ocean (IDs 70-74) ---
  CORAL_SURFACE: { tilesetId: 'game', col: 5, row: 5 },
  SEA_FLOOR: { tilesetId: 'game', col: 0, row: 5 },
  OCEAN_STONE: { tilesetId: 'game', col: 0, row: 5 },
  DEEP_WATER: { tilesetId: 'game', col: 4, row: 3 },
  KELP: { tilesetId: 'game', col: 3, row: 4 },
} as const;

/** The number of columns in the tileset grid */
export const TILESET_COLS = COLS;

/** The number of rows in the tileset grid */
export const TILESET_ROWS = ROWS;
