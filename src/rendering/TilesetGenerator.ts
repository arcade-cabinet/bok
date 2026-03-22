/**
 * @module rendering/TilesetGenerator
 * Generates a programmatic tileset texture at runtime.
 * No external PNG dependency — creates bright, game-ready block colors via canvas.
 *
 * Tileset layout (3x3 grid, 32px per tile):
 *   col 0: wood-side, dirt, grass-top
 *   col 1: wood-top,  leaves, water
 *   col 2: stone,     sand,  stone-brick
 */

const TILE_SIZE = 32;
const COLS = 3;
const ROWS = 3;

interface BlockColor {
  base: string;
  noise?: number; // 0-1 noise intensity
  lines?: boolean; // vertical grain lines (wood)
  dots?: boolean; // random dots (stone, dirt)
  blend?: string; // secondary color for variation
}

const TILE_DEFS: BlockColor[][] = [
  // col 0
  [
    { base: '#8B6914', noise: 0.15, lines: true }, // (0,0) wood side
    { base: '#8B5E3C', noise: 0.2, dots: true }, // (0,1) dirt
    { base: '#4CAF50', noise: 0.15, blend: '#66BB6A' }, // (0,2) grass top
  ],
  // col 1
  [
    { base: '#A0782C', noise: 0.1 }, // (1,0) wood top (ring pattern)
    { base: '#2E7D32', noise: 0.2, blend: '#388E3C' }, // (1,1) leaves
    { base: '#2196F3', noise: 0.1, blend: '#42A5F5' }, // (1,2) water
  ],
  // col 2
  [
    { base: '#757575', noise: 0.2, dots: true }, // (2,0) stone
    { base: '#D4A44C', noise: 0.15 }, // (2,1) sand (unused row mismatch — see below)
    { base: '#9E9E9E', noise: 0.1, dots: true }, // (2,2) stone brick
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
  WOOD_SIDE: { tilesetId: 'game', col: 0, row: 0 },
  DIRT: { tilesetId: 'game', col: 0, row: 1 },
  GRASS_TOP: { tilesetId: 'game', col: 0, row: 2 },
  WOOD_TOP: { tilesetId: 'game', col: 1, row: 0 },
  LEAVES: { tilesetId: 'game', col: 1, row: 1 },
  WATER: { tilesetId: 'game', col: 1, row: 2 },
  STONE: { tilesetId: 'game', col: 2, row: 0 },
  SAND: { tilesetId: 'game', col: 2, row: 1 },
  STONE_BRICK: { tilesetId: 'game', col: 2, row: 2 },
} as const;
