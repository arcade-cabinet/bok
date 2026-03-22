/**
 * @module engine/diegetic
 * @role Context detection and head-bob for diegetic camera feel
 * @input Camera position, enemies, terrain lookup
 * @output Context type, head-bob Y offset
 */
import type * as THREE from 'three';

import type { EnemyState, SurfaceHeightFn } from './types.ts';

export type DiegeticContext = 'combat' | 'climb' | 'drop' | 'explore';

const COMBAT_RANGE = 5;
const CLIMB_STEP = 1;
const DROP_THRESHOLD = 2;

/**
 * Detect the current diegetic context based on surroundings.
 * Priority: combat > climb > drop > explore
 */
export function detectContext(
  cameraPos: THREE.Vector3,
  enemies: EnemyState[],
  getSurfaceY: SurfaceHeightFn,
): DiegeticContext {
  // Combat: any enemy within 5 blocks
  for (const e of enemies) {
    const dx = cameraPos.x - e.mesh.position.x;
    const dz = cameraPos.z - e.mesh.position.z;
    if (Math.sqrt(dx * dx + dz * dz) < COMBAT_RANGE) {
      return 'combat';
    }
  }

  // Sample terrain ahead (approximate forward from camera position)
  // Use a small probe distance in cardinal directions to detect terrain changes
  const cx = Math.round(cameraPos.x);
  const cz = Math.round(cameraPos.z);
  const currentY = getSurfaceY(cx, cz);

  // Check all 4 cardinal neighbors for climb/drop
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;

  let hasClimb = false;
  let hasDrop = false;

  for (const [ox, oz] of offsets) {
    const neighborY = getSurfaceY(cx + ox, cz + oz);
    const diff = neighborY - currentY;
    if (diff >= CLIMB_STEP && diff <= 1.1) {
      hasClimb = true;
    }
    if (diff <= -DROP_THRESHOLD) {
      hasDrop = true;
    }
  }

  if (hasClimb) return 'climb';
  if (hasDrop) return 'drop';
  return 'explore';
}

/**
 * Compute a Y offset for natural head movement.
 * Returns a small vertical offset to add to camera Y.
 */
export function getHeadBob(_dt: number, isMoving: boolean, context: DiegeticContext, elapsed: number): number {
  if (isMoving) {
    switch (context) {
      case 'combat':
        // Slight combat crouch with fast bob
        return -0.04 + Math.sin(elapsed * 14) * 0.02;
      case 'climb':
        // Sharper bob for climbing effort
        return Math.sin(elapsed * 10) * 0.05;
      default:
        // Gentle walking bob
        return Math.sin(elapsed * 8) * 0.03;
    }
  }

  // Standing still: subtle breathing
  return Math.sin(elapsed * 2) * 0.01;
}
