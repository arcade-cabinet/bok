/**
 * @module engine/camera
 * @role FPS camera setup, movement with auto-platforming, look controls
 * @input JollyPixel world, surface height lookup, mobile flag
 * @output Camera, update function
 */
import { Camera3DControls } from '@jolly-pixel/engine';
import * as THREE from 'three';

import type { SurfaceHeightFn } from './types.ts';

const CAMERA_SENSITIVITY = 0.002;
const PLAYER_SPEED = 6;
const SPRINT_MULTIPLIER = 1.6;

export interface CameraResult {
  camera: THREE.PerspectiveCamera;
  euler: THREE.Euler;
  applyMovement: (dirX: number, dirZ: number, sprint: boolean, dt: number, headBobOffset?: number) => void;
  applyLook: (deltaX: number, deltaY: number, sensitivityScale?: number) => void;
  getPosition: () => THREE.Vector3;
}

/**
 * Create FPS camera using JollyPixel's Camera3DControls.
 * Spawns at highest terrain point near center.
 * Movement includes auto-platforming (step up/down terrain).
 */
export function createCamera(jpWorld: any, getSurfaceY: SurfaceHeightFn, islandSize: number): CameraResult {
  const cameraActor = jpWorld.createActor('camera');
  const cameraCtrl = cameraActor.addComponentAndGet(Camera3DControls, {
    speed: PLAYER_SPEED,
    rotationSpeed: CAMERA_SENSITIVITY,
    bindings: {
      forward: 'ArrowUp',
      backward: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight',
      lookAround: 'left',
    },
  });
  const camera = cameraCtrl.camera;

  // Find highest ground near center for spawn
  let bestX = islandSize / 2;
  let bestZ = islandSize / 2;
  let bestH = 0;
  for (let sx = -4; sx <= 4; sx++) {
    for (let sz = -4; sz <= 4; sz++) {
      const h = getSurfaceY(Math.round(islandSize / 2 + sx), Math.round(islandSize / 2 + sz));
      if (h > bestH) {
        bestH = h;
        bestX = Math.round(islandSize / 2 + sx);
        bestZ = Math.round(islandSize / 2 + sz);
      }
    }
  }
  camera.position.set(bestX, bestH + 1.6, bestZ);

  // Start looking slightly down toward center of island
  // Rotate to face the center from spawn position
  const spawnDirX = islandSize / 2 - bestX;
  const spawnDirZ = islandSize / 2 - bestZ;
  const initialYaw = spawnDirX === 0 && spawnDirZ === 0 ? 0 : Math.atan2(-spawnDirX, -spawnDirZ);
  const euler = new THREE.Euler(-0.1, initialYaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);

  function applyLook(deltaX: number, deltaY: number, sensitivityScale = 1): void {
    euler.y -= deltaX * CAMERA_SENSITIVITY * sensitivityScale;
    euler.x -= deltaY * CAMERA_SENSITIVITY * sensitivityScale;
    const maxPitch = Math.PI / 2 - 0.01;
    euler.x = Math.max(-maxPitch, Math.min(maxPitch, euler.x));
    camera.quaternion.setFromEuler(euler);
  }

  function applyMovement(dirX: number, dirZ: number, sprint: boolean, dt: number, headBobOffset = 0): void {
    if (dirX === 0 && dirZ === 0) {
      // Settle to terrain height when standing still
      const standY = getSurfaceY(Math.round(camera.position.x), Math.round(camera.position.z));
      const targetEye = standY + 1.6 + headBobOffset;
      if (Math.abs(camera.position.y - targetEye) > 0.05) {
        camera.position.y += (targetEye - camera.position.y) * Math.min(1, dt * 8);
      }
      return;
    }

    const speed = sprint ? PLAYER_SPEED * SPRINT_MULTIPLIER : PLAYER_SPEED;
    const yaw = euler.y;
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const worldX = dirX * cosYaw - dirZ * sinYaw;
    const worldZ = dirX * sinYaw + dirZ * cosYaw;

    const newX = camera.position.x + worldX * speed * dt;
    const newZ = camera.position.z + worldZ * speed * dt;

    // Auto-platforming
    const targetY = getSurfaceY(Math.round(newX), Math.round(newZ));
    const currentY = camera.position.y - 1.6;
    const heightDiff = targetY - currentY;

    if (heightDiff <= 1.1 && heightDiff >= -3) {
      camera.position.x = newX;
      camera.position.z = newZ;
      const targetEye = targetY + 1.6 + headBobOffset;
      if (Math.abs(camera.position.y - targetEye) > 0.05) {
        camera.position.y += (targetEye - camera.position.y) * Math.min(1, dt * 12);
        if (heightDiff > 0.3) {
          camera.position.y += Math.sin(Date.now() * 0.02) * 0.03;
        }
      }
    }
    // else: blocked by terrain wall
  }

  return {
    camera,
    euler,
    applyMovement,
    applyLook,
    getPosition: () => camera.position,
  };
}
