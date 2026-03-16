/**
 * Programmatic tileset generator.
 * Creates a canvas-based tileset PNG at runtime for the Jolly Pixel VoxelRenderer.
 * Each tile is a 32x32 pixel block texture.
 *
 * Layout (8 cols x 2 rows):
 * Row 0: Grass-top, Grass-side, Dirt, Stone, Wood-side, Wood-top, Leaves, Planks
 * Row 1: Water, Torch, Sand, Snow-top, Snow-side, StoneBricks, Glass, (empty)
 */

const TILE_SIZE = 32;
const COLS = 8;
const ROWS = 2;

interface TileDef {
  col: number;
  row: number;
  baseColor: string;
  draw?: (ctx: CanvasRenderingContext2D, size: number) => void;
}

function addNoise(ctx: CanvasRenderingContext2D, size: number) {
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
}

const tiles: TileDef[] = [
  // Row 0
  { col: 0, row: 0, baseColor: "#4CAF50", draw: (ctx, s) => { addNoise(ctx, s); } }, // Grass top
  { col: 1, row: 0, baseColor: "#795548", draw: (ctx, s) => {
    // Grass side: dirt base with grass stripe on top
    ctx.fillStyle = "#4CAF50";
    ctx.fillRect(0, 0, s, s * 0.25);
    addNoise(ctx, s);
  }},
  { col: 2, row: 0, baseColor: "#795548", draw: (ctx, s) => { addNoise(ctx, s); } }, // Dirt
  { col: 3, row: 0, baseColor: "#9E9E9E", draw: (ctx, s) => { addNoise(ctx, s); } }, // Stone
  { col: 4, row: 0, baseColor: "#5D4037", draw: (ctx, s) => {
    // Wood side — vertical grain
    addNoise(ctx, s);
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const x = (i + 0.5) * (s / 6);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, s); ctx.stroke();
    }
  }},
  { col: 5, row: 0, baseColor: "#6D4C41", draw: (ctx, s) => {
    // Wood top — rings
    addNoise(ctx, s);
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 6, 0, Math.PI * 2); ctx.stroke();
  }},
  { col: 6, row: 0, baseColor: "#2E7D32", draw: (ctx, s) => {
    // Leaves — speckled
    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "rgba(0,0,0,0.15)" : "rgba(100,255,100,0.15)";
      ctx.fillRect(Math.random() * s, Math.random() * s, 3, 3);
    }
  }},
  { col: 7, row: 0, baseColor: "#8D6E63", draw: (ctx, s) => {
    // Planks
    addNoise(ctx, s);
    ctx.strokeStyle = "#3e2a23";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, s, s);
    ctx.beginPath(); ctx.moveTo(0, s / 2); ctx.lineTo(s, s / 2); ctx.stroke();
  }},

  // Row 1
  { col: 0, row: 1, baseColor: "#1E90FF", draw: (ctx, s) => {
    // Water — translucent with wave lines
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#1E90FF";
    ctx.fillRect(0, 0, s, s);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    for (let y = 0; y < s; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(s / 4, y - 2, s / 2, y);
      ctx.quadraticCurveTo((3 * s) / 4, y + 2, s, y);
      ctx.stroke();
    }
  }},
  { col: 1, row: 1, baseColor: "#5D4037", draw: (ctx, s) => {
    // Torch
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(s / 3, s / 6, s / 3, s * 0.6);
    ctx.fillStyle = "#ffaa00";
    ctx.fillRect(s / 3 + 2, s / 6 - 4, s / 3 - 4, 6);
  }},
  { col: 2, row: 1, baseColor: "#E2C275", draw: (ctx, s) => { addNoise(ctx, s); } }, // Sand
  { col: 3, row: 1, baseColor: "#FFFFFF", draw: (ctx, s) => {
    // Snow top
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = "rgba(200,220,255,0.15)";
      ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
  }},
  { col: 4, row: 1, baseColor: "#795548", draw: (ctx, s) => {
    // Snow side: dirt with snow on top
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, s, s * 0.4);
    addNoise(ctx, s);
  }},
  { col: 5, row: 1, baseColor: "#757575", draw: (ctx, s) => {
    // Stone bricks
    addNoise(ctx, s);
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, s - 2, s - 2);
    ctx.beginPath(); ctx.moveTo(0, s / 2); ctx.lineTo(s, s / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s / 2, 0); ctx.lineTo(s / 2, s / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s / 4, s / 2); ctx.lineTo(s / 4, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo((s * 3) / 4, s / 2); ctx.lineTo((s * 3) / 4, s); ctx.stroke();
  }},
  { col: 6, row: 1, baseColor: "rgba(136,204,255,0.3)", draw: (ctx, s) => {
    // Glass
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, s - 4, s - 4);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s / 3, s / 3); ctx.stroke();
  }},
];

/**
 * Generate the tileset as a data URL.
 */
export function generateTilesetDataURL(): string {
  const canvas = document.createElement("canvas");
  canvas.width = COLS * TILE_SIZE;
  canvas.height = ROWS * TILE_SIZE;
  const ctx = canvas.getContext("2d")!;

  // Clear to transparent
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const tile of tiles) {
    ctx.save();
    ctx.translate(tile.col * TILE_SIZE, tile.row * TILE_SIZE);

    // Base fill
    ctx.fillStyle = tile.baseColor;
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    // Custom drawing
    if (tile.draw) {
      tile.draw(ctx, TILE_SIZE);
    }

    ctx.restore();
  }

  return canvas.toDataURL("image/png");
}

export { TILE_SIZE, COLS, ROWS };
