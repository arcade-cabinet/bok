/**
 * @module rendering/CubeWorldAtlas
 * Loads the CubeWorld Atlas.png texture atlas and provides two tileset modes:
 *
 * 1. **Atlas mode**: Uses the Atlas.png directly as a tileset (flat CubeWorld colors).
 * 2. **Enhanced mode**: Extracts the CubeWorld palette colors and generates a richer
 *    tileset with noise, grain, and blend effects — same visual language but with
 *    more depth and texture.
 *
 * The CubeWorld Atlas.png (512x512) layout:
 *   - Row 0 (y 0-15): 32 palette colors, each 16px wide
 *   - Rows 2-6 (64px grid): 5 columns x 5 rows of flat-colored 64px block tiles
 *   - Row 6 bottom: 8 additional block colors
 *
 * Since the Atlas tiles are flat-colored (no texture detail), the enhanced mode
 * is the default — it applies procedural noise on top of the CubeWorld palette
 * to produce a richer look while staying faithful to the CubeWorld aesthetic.
 */
import * as THREE from 'three';
import { resolveAssetUrl } from '../shared/constants.ts';

/** CubeWorld palette colors extracted from Atlas.png row 0 (16px palette strip). */
export const CUBEWORLD_PALETTE = {
  STONE_GREY: '#676e6c',
  DARK_EARTH: '#2e2d27',
  SAND_LIGHT: '#c3ae74',
  STONE_MID: '#676e6c',
  RED_BROWN: '#942b11',
  DARK_BLUE: '#304d61',
  GOLD: '#cca425',
  DARK_GREY: '#44423a',
  SILVER: '#9e9e9e',
  OLIVE_GREEN: '#74861c',
  PURPLE_BRIGHT: '#b143ff',
  BROWN_MID: '#705d40',
  DARK_GREY_2: '#44423a',
  AMBER: '#ce9e43',
  WOOD_BROWN: '#966f39',
  PINK_DARK: '#9e527d',
  BROWN_MID_2: '#705d40',
  DARK_GREY_3: '#44423a',
  GOLD_2: '#cca425',
  BEIGE: '#a7a392',
  SKY_BLUE: '#408ead',
  DARK_EARTH_2: '#2e2d27',
  OLIVE_2: '#74861c',
  PURPLE_DARK: '#62357d',
  CRIMSON: '#7d2647',
  DARK_GREY_4: '#44423a',
  SAND_2: '#c3ae74',
  RUST: '#7d250e',
  TAN: '#ad9865',
  DARK_GREY_5: '#44423a',
  GOLD_3: '#cca425',
} as const;

/**
 * CubeWorld-inspired block color definitions.
 * Maps our game's block types to CubeWorld palette colors with procedural effects.
 */
interface CWBlockColor {
  base: string;
  noise?: number;
  lines?: boolean;
  dots?: boolean;
  blend?: string;
  glow?: boolean;
}

const TILE_SIZE = 32;
const COLS = 6;
const ROWS = 6;

/**
 * CubeWorld-palette tiles arranged in the same 6x6 grid layout as TilesetGenerator.
 * Uses CubeWorld's earthy, muted color palette instead of the bright programmatic colors.
 */
const CW_TILE_DEFS: CWBlockColor[][] = [
  // col 0
  [
    { base: '#966f39', noise: 0.15, lines: true }, // (0,0) wood side — CW wood brown
    { base: '#583e2a', noise: 0.2, dots: true }, // (0,1) dirt — CW dark brown
    { base: '#74861c', noise: 0.15, blend: '#6d8020' }, // (0,2) grass top — CW olive green
    { base: '#44423a', noise: 0.2, blend: '#2e2d27' }, // (0,3) mud-surface — CW dark grey-earth
    { base: '#2e2d27', noise: 0.15, blend: '#44423a' }, // (0,4) peat — CW darkest earth
    { base: '#676e6c', noise: 0.1, dots: true }, // (0,5) swamp-stone — CW stone grey
  ],
  // col 1
  [
    { base: '#ad9865', noise: 0.1 }, // (1,0) wood top — CW tan
    { base: '#6d8020', noise: 0.2, blend: '#74861c' }, // (1,1) leaves — CW olive green darker
    { base: '#408ead', noise: 0.1, blend: '#304d61' }, // (1,2) water — CW sky blue
    { base: '#62357d', noise: 0.15, blend: '#b143ff' }, // (1,3) crystal-surface — CW purple
    { base: '#44423a', noise: 0.2, blend: '#62357d' }, // (1,4) geode-wall — CW dark w/ purple
    { base: '#b143ff', noise: 0.2, glow: true, blend: '#9e527d' }, // (1,5) amethyst — CW bright purple
  ],
  // col 2
  [
    { base: '#676e6c', noise: 0.2, dots: true }, // (2,0) stone — CW stone grey
    { base: '#c3ae74', noise: 0.15 }, // (2,1) sand — CW sand light
    { base: '#9e9e9e', noise: 0.1, dots: true }, // (2,2) stone brick — CW silver
    { base: '#a7a392', noise: 0.1, blend: '#c3ae74' }, // (2,3) cloud-top — CW beige (light)
    { base: '#9e9e9e', noise: 0.15, blend: '#a7a392' }, // (2,4) cloud-base — CW silver-beige
    { base: '#408ead', noise: 0.1, blend: '#304d61' }, // (2,5) sky-stone — CW sky blue
  ],
  // col 3
  [
    { base: '#ce9e43', noise: 0.15, blend: '#cca425' }, // (3,0) sand-surface — CW amber-gold
    { base: '#ad9865', noise: 0.1, dots: true }, // (3,1) sandstone — CW tan
    { base: '#942b11', noise: 0.2, dots: true }, // (3,2) desert-stone — CW red-brown
    { base: '#304d61', noise: 0.15, blend: '#408ead' }, // (3,3) oasis-water — CW dark-blue/teal
    { base: '#74861c', noise: 0.15, blend: '#6d8020' }, // (3,4) cactus-green — CW olive green
    { base: '#705d40', noise: 0.1, lines: true }, // (3,5) dead-wood — CW brown mid
  ],
  // col 4
  [
    { base: '#a7a392', noise: 0.1, blend: '#9e9e9e' }, // (4,0) snow-top — CW beige/silver
    { base: '#676e6c', noise: 0.2, dots: true }, // (4,1) frozen-dirt — CW stone grey
    { base: '#9e9e9e', noise: 0.1, blend: '#a7a392' }, // (4,2) ice — CW silver
    { base: '#2e2d27', noise: 0.15, blend: '#304d61' }, // (4,3) frost-water — CW dark + blue
    { base: '#676e6c', noise: 0.15, dots: true, blend: '#44423a' }, // (4,4) permafrost — CW stone
    { base: '#62357d', noise: 0.15, blend: '#b143ff' }, // (4,5) crystal-surface — CW purple
  ],
  // col 5
  [
    { base: '#2e2d27', noise: 0.1, blend: '#44423a' }, // (5,0) obsidian — CW darkest earth
    { base: '#44423a', noise: 0.2, dots: true }, // (5,1) ash — CW dark grey
    { base: '#44423a', noise: 0.15, dots: true }, // (5,2) basalt — CW dark grey
    { base: '#cca425', noise: 0.2, glow: true, blend: '#942b11' }, // (5,3) lava — CW gold + red
    { base: '#705d40', noise: 0.15, blend: '#942b11' }, // (5,4) magma-crust — CW brown + red
    { base: '#9e527d', noise: 0.15, blend: '#942b11' }, // (5,5) coral-surface — CW pink
  ],
];

function drawTile(ctx: CanvasRenderingContext2D, col: number, row: number, def: CWBlockColor): void {
  const x0 = col * TILE_SIZE;
  const y0 = row * TILE_SIZE;

  ctx.fillStyle = def.base;
  ctx.fillRect(x0, y0, TILE_SIZE, TILE_SIZE);

  if (def.noise) {
    for (let px = 0; px < TILE_SIZE; px++) {
      for (let py = 0; py < TILE_SIZE; py++) {
        if (Math.random() < def.noise) {
          const brightness = Math.random() > 0.5 ? 20 : -20;
          ctx.fillStyle = `rgba(${brightness > 0 ? 255 : 0},${brightness > 0 ? 255 : 0},${brightness > 0 ? 255 : 0},0.12)`;
          ctx.fillRect(x0 + px, y0 + py, 1, 1);
        }
      }
    }
  }

  if (def.blend) {
    for (let px = 0; px < TILE_SIZE; px++) {
      for (let py = 0; py < TILE_SIZE; py++) {
        if (Math.random() < 0.25) {
          ctx.fillStyle = def.blend;
          ctx.globalAlpha = 0.25;
          ctx.fillRect(x0 + px, y0 + py, 1, 1);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  if (def.glow) {
    for (let px = 0; px < TILE_SIZE; px++) {
      for (let py = 0; py < TILE_SIZE; py++) {
        if (Math.random() < 0.06) {
          ctx.fillStyle = 'rgba(255,255,200,0.4)';
          ctx.fillRect(x0 + px, y0 + py, 1, 1);
        }
      }
    }
  }

  if (def.lines) {
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    for (let lx = 3; lx < TILE_SIZE; lx += 5 + Math.floor(Math.random() * 3)) {
      ctx.beginPath();
      ctx.moveTo(x0 + lx, y0);
      ctx.lineTo(x0 + lx, y0 + TILE_SIZE);
      ctx.stroke();
    }
  }

  if (def.dots) {
    for (let i = 0; i < 6; i++) {
      const dx = Math.floor(Math.random() * (TILE_SIZE - 4)) + 2;
      const dy = Math.floor(Math.random() * (TILE_SIZE - 4)) + 2;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(x0 + dx, y0 + dy, 2, 2);
    }
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
}

/**
 * Generates a tileset using the CubeWorld color palette with procedural detail.
 * Same 6x6 grid layout as `generateTileset()` — drop-in replacement.
 * Produces a muted, earthy aesthetic matching the CubeWorld art style.
 */
export function generateCubeWorldTileset(): { canvas: HTMLCanvasElement; dataUrl: string } {
  const canvas = document.createElement('canvas');
  canvas.width = COLS * TILE_SIZE;
  canvas.height = ROWS * TILE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context for CubeWorld tileset generation');

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      drawTile(ctx, col, row, CW_TILE_DEFS[col][row]);
    }
  }

  return { canvas, dataUrl: canvas.toDataURL('image/png') };
}

/**
 * Loads the CubeWorld Atlas.png directly as a tileset texture.
 * The Atlas uses 64px tiles in a non-standard layout, so this function
 * re-maps the relevant tiles into a standard grid.
 *
 * Since the Atlas tiles are flat-colored (no texture detail), prefer
 * `generateCubeWorldTileset()` which applies procedural noise for a richer look.
 *
 * @returns A Three.js Texture loaded from the Atlas.png with NearestFilter,
 *          plus the tile dimensions for VoxelRenderer registration.
 */
export async function loadCubeWorldAtlas(): Promise<{
  texture: THREE.Texture;
  cols: number;
  rows: number;
  tileSize: number;
}> {
  const loader = new THREE.TextureLoader();
  const texture = await loader.loadAsync(resolveAssetUrl('/assets/models/Atlas.png'));
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;

  // Atlas.png is 512x512 with 64px tiles (effective 8x8 grid)
  // but only ~30 tiles are populated (rows 2-6, cols 0-7)
  return { texture, cols: 8, rows: 8, tileSize: 64 };
}

/**
 * Tile references for the raw Atlas.png (64px grid).
 * Maps block concepts to their (col, row) position in the 8x8 atlas grid.
 * Use with `loadCubeWorldAtlas()` when registering the raw atlas.
 */
export const ATLAS_TILES = {
  // Row 2 (64px row index 2)
  SAND_GOLD: { tilesetId: 'cubeworld', col: 0, row: 2 },
  DIRT_TAN: { tilesetId: 'cubeworld', col: 1, row: 2 },
  TEAL_WATER: { tilesetId: 'cubeworld', col: 2, row: 2 },
  RED_BRICK: { tilesetId: 'cubeworld', col: 3, row: 2 },
  DARK_SLATE: { tilesetId: 'cubeworld', col: 4, row: 2 },

  // Row 3
  DARK_BROWN: { tilesetId: 'cubeworld', col: 0, row: 3 },
  MED_BROWN: { tilesetId: 'cubeworld', col: 1, row: 3 },
  STONE_DARK: { tilesetId: 'cubeworld', col: 2, row: 3 },
  TEAL_DEEP: { tilesetId: 'cubeworld', col: 3, row: 3 },
  BLUE_GREY: { tilesetId: 'cubeworld', col: 4, row: 3 },

  // Row 4
  RED_EARTH: { tilesetId: 'cubeworld', col: 0, row: 4 },
  TAN_LIGHT: { tilesetId: 'cubeworld', col: 1, row: 4 },
  OLIVE_DARK: { tilesetId: 'cubeworld', col: 2, row: 4 },
  GREEN_OLIVE: { tilesetId: 'cubeworld', col: 3, row: 4 },
  BLUE_DARK: { tilesetId: 'cubeworld', col: 4, row: 4 },

  // Row 5
  GREY_GREEN: { tilesetId: 'cubeworld', col: 0, row: 5 },
  BROWN_WARM: { tilesetId: 'cubeworld', col: 1, row: 5 },
  CHARCOAL: { tilesetId: 'cubeworld', col: 2, row: 5 },
  AMBER: { tilesetId: 'cubeworld', col: 3, row: 5 },
  STEEL_BLUE: { tilesetId: 'cubeworld', col: 4, row: 5 },

  // Row 6 (8 tiles)
  SAND_WARM: { tilesetId: 'cubeworld', col: 0, row: 6 },
  GREY_MED: { tilesetId: 'cubeworld', col: 1, row: 6 },
  GREY_DARK: { tilesetId: 'cubeworld', col: 2, row: 6 },
  SILVER: { tilesetId: 'cubeworld', col: 3, row: 6 },
  BLACK: { tilesetId: 'cubeworld', col: 4, row: 6 },
  WOOD_DARK: { tilesetId: 'cubeworld', col: 5, row: 6 },
  ASH: { tilesetId: 'cubeworld', col: 6, row: 6 },
  MOSS: { tilesetId: 'cubeworld', col: 7, row: 6 },
} as const;

/** The number of columns in the CubeWorld-palette tileset grid */
export const CW_TILESET_COLS = COLS;

/** The number of rows in the CubeWorld-palette tileset grid */
export const CW_TILESET_ROWS = ROWS;
