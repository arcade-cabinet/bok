/**
 * @module components/hud/EnemyHealthBars
 * @role Floating health bars above enemies within range
 * @input Enemy 3D positions, player camera, canvas dimensions
 * @output Screen-space health bars rendered as React overlays
 */
import { useMemo } from 'react';
import * as THREE from 'three';

interface EnemyPosition {
  x: number;
  y: number;
  z: number;
  health: number;
  maxHealth: number;
  type: string;
}

interface Props {
  enemies: EnemyPosition[];
  camera: { fov: number; aspect: number; position: { x: number; y: number; z: number } };
  canvasWidth: number;
  canvasHeight: number;
  playerX: number;
  playerZ: number;
  playerYaw: number;
}

/** Height offset above the enemy mesh origin to position the bar */
const BAR_Y_OFFSET = 2.0;

/** Project a 3D world position to 2D screen coordinates using a perspective camera model. */
function projectToScreen(
  worldPos: THREE.Vector3,
  cameraPos: { x: number; y: number; z: number },
  yaw: number,
  fov: number,
  aspect: number,
  width: number,
  height: number,
): { x: number; y: number; visible: boolean } {
  // Camera-relative position
  const dx = worldPos.x - cameraPos.x;
  const dy = worldPos.y - cameraPos.y;
  const dz = worldPos.z - cameraPos.z;

  // Rotate into camera space (yaw only — simplified FPS camera)
  const cosY = Math.cos(-yaw);
  const sinY = Math.sin(-yaw);
  const camX = dx * cosY - dz * sinY;
  const camZ = dx * sinY + dz * cosY;

  // Behind camera
  if (camZ >= -0.1) return { x: 0, y: 0, visible: false };

  const fovRad = (fov * Math.PI) / 180;
  const tanHalfFov = Math.tan(fovRad / 2);

  const screenX = (-camX / -camZ / (tanHalfFov * aspect)) * 0.5 + 0.5;
  const screenY = (-dy / -camZ / tanHalfFov) * 0.5 + 0.5;

  const visible = screenX >= 0 && screenX <= 1 && screenY >= 0 && screenY <= 1;

  return { x: screenX * width, y: screenY * height, visible };
}

/** Get health bar color based on health percentage. */
function getBarColor(ratio: number): string {
  if (ratio > 0.6) return '#22c55e'; // green
  if (ratio > 0.3) return '#eab308'; // yellow
  return '#ef4444'; // red
}

/** Format enemy type for display (kebab-case to Title Case). */
function formatEnemyType(type: string): string {
  return type
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function EnemyHealthBars({
  enemies,
  camera,
  canvasWidth,
  canvasHeight,
  playerX: _px,
  playerZ: _pz,
  playerYaw,
}: Props) {
  const bars = useMemo(() => {
    const result: Array<{ key: string; x: number; y: number; ratio: number; color: string; label: string }> = [];

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.health <= 0) continue;

      const worldPos = new THREE.Vector3(e.x, e.y + BAR_Y_OFFSET, e.z);
      const projected = projectToScreen(
        worldPos,
        camera.position,
        playerYaw,
        camera.fov,
        camera.aspect,
        canvasWidth,
        canvasHeight,
      );

      if (!projected.visible) continue;

      const ratio = e.health / e.maxHealth;
      result.push({
        key: `enemy-${i}-${Math.round(e.x)}-${Math.round(e.z)}`,
        x: projected.x,
        y: projected.y,
        ratio,
        color: getBarColor(ratio),
        label: formatEnemyType(e.type),
      });
    }

    return result;
  }, [enemies, camera, canvasWidth, canvasHeight, playerYaw]);

  if (bars.length === 0) return null;

  return (
    <>
      {bars.map((bar) => (
        <div
          key={bar.key}
          className="absolute pointer-events-none"
          style={{
            left: bar.x,
            top: bar.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {/* Enemy type name */}
          <div
            className="text-center text-[9px] mb-0.5 whitespace-nowrap"
            style={{
              fontFamily: 'Georgia, serif',
              color: '#fdf6e3',
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            }}
          >
            {bar.label}
          </div>
          {/* Health bar */}
          <div className="w-14 h-1.5 bg-black/60 rounded-sm overflow-hidden border border-black/40">
            <div
              className="h-full rounded-sm transition-[width] duration-150"
              style={{
                width: `${bar.ratio * 100}%`,
                backgroundColor: bar.color,
              }}
            />
          </div>
        </div>
      ))}
    </>
  );
}
