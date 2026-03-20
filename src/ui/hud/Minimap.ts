const PARCHMENT_BG = '#fdf6e3';
const BORDER_COLOR = '#8b5a2b';
const PLAYER_COLOR = '#fdf6e3';
const ENEMY_COLOR = '#8b1a1a';
const CHEST_COLOR = '#daa520';

export interface MinimapMarker {
  x: number;
  z: number;
  type: 'player' | 'enemy' | 'chest';
}

export class Minimap {
  readonly #container: HTMLDivElement;
  readonly #canvas: HTMLCanvasElement;
  readonly #ctx: CanvasRenderingContext2D;
  readonly #size = 140;
  readonly #scale = 2; // world units per pixel

  constructor(parent: HTMLElement) {
    this.#container = document.createElement('div');
    Object.assign(this.#container.style, {
      position: 'absolute',
      top: '16px',
      right: '16px',
      width: `${this.#size}px`,
      height: `${this.#size}px`,
      border: `2px solid ${BORDER_COLOR}`,
      borderRadius: '4px',
      overflow: 'hidden',
      zIndex: '10',
    });

    this.#canvas = document.createElement('canvas');
    this.#canvas.width = this.#size;
    this.#canvas.height = this.#size;
    this.#canvas.style.width = '100%';
    this.#canvas.style.height = '100%';
    this.#container.appendChild(this.#canvas);

    this.#ctx = this.#canvas.getContext('2d')!;

    parent.appendChild(this.#container);
  }

  update(playerX: number, playerZ: number, markers: MinimapMarker[]): void {
    const ctx = this.#ctx;
    const half = this.#size / 2;

    // Clear with parchment background
    ctx.fillStyle = PARCHMENT_BG;
    ctx.fillRect(0, 0, this.#size, this.#size);

    // Draw markers relative to player
    for (const marker of markers) {
      const dx = (marker.x - playerX) / this.#scale;
      const dz = (marker.z - playerZ) / this.#scale;
      const sx = half + dx;
      const sy = half + dz;

      if (sx < 0 || sx > this.#size || sy < 0 || sy > this.#size) continue;

      ctx.beginPath();
      switch (marker.type) {
        case 'enemy':
          ctx.fillStyle = ENEMY_COLOR;
          ctx.arc(sx, sy, 3, 0, Math.PI * 2);
          break;
        case 'chest':
          ctx.fillStyle = CHEST_COLOR;
          ctx.rect(sx - 2, sy - 2, 4, 4);
          break;
        default:
          continue;
      }
      ctx.fill();
    }

    // Draw player dot (always center)
    ctx.fillStyle = PLAYER_COLOR;
    ctx.strokeStyle = '#2c1e16';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(half, half, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  destroy(): void {
    this.#container.remove();
  }
}
