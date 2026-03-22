import { useEffect, useRef } from 'react';
import type { MinimapMarker } from '../../engine/types';

interface Props {
  playerX: number;
  playerZ: number;
  markers: MinimapMarker[];
}

const SIZE = 140;
const SCALE = 2; // world units per pixel
const HALF = SIZE / 2;

// Colors matching the parchment theme
const BG_COLOR = '#fdf6e3';
const PLAYER_FILL = '#fdf6e3';
const PLAYER_STROKE = '#2c1e16';
const ENEMY_COLOR = '#8b1a1a';
const CHEST_COLOR = '#daa520';

/**
 * Minimap — canvas-rendered top-down view centered on the player.
 * Enemy markers are red dots, loot/chest markers are gold squares.
 * Ported from dead src/ui/hud/Minimap.ts.
 */
export function Minimap({ playerX, playerZ, markers }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with parchment background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Draw markers relative to player
    for (const marker of markers) {
      const dx = (marker.x - playerX) / SCALE;
      const dz = (marker.z - playerZ) / SCALE;
      const sx = HALF + dx;
      const sy = HALF + dz;

      // Clip markers outside canvas bounds
      if (sx < 0 || sx > SIZE || sy < 0 || sy > SIZE) continue;

      ctx.beginPath();
      if (marker.type === 'enemy') {
        ctx.fillStyle = ENEMY_COLOR;
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      } else {
        ctx.fillStyle = CHEST_COLOR;
        ctx.rect(sx - 2, sy - 2, 4, 4);
      }
      ctx.fill();
    }

    // Draw player dot (always center)
    ctx.fillStyle = PLAYER_FILL;
    ctx.strokeStyle = PLAYER_STROKE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(HALF, HALF, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }, [playerX, playerZ, markers]);

  const enemyCount = markers.filter((m) => m.type === 'enemy').length;
  const chestCount = markers.filter((m) => m.type === 'chest').length;

  return (
    <div
      className="absolute top-4 right-4 card bg-base-100/85 border-2 border-secondary rounded-md overflow-hidden"
      role="img"
      aria-label={`Minimap: ${enemyCount} ${enemyCount === 1 ? 'enemy' : 'enemies'} and ${chestCount} ${chestCount === 1 ? 'chest' : 'chests'} nearby`}
    >
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="block w-[100px] h-[100px] sm:w-[140px] sm:h-[140px]"
      />
    </div>
  );
}
