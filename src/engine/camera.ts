/**
 * @module engine/camera
 * @role FPS camera setup, smooth movement with terrain following
 * @input JollyPixel world, surface height lookup
 * @output Camera, update function
 *
 * Movement uses acceleration/deceleration for natural feel.
 * No boundary clamping — world is infinite (chunk-based).
 * Terrain following smoothly interpolates to surface height.
 */
import { Camera3DControls } from '@jolly-pixel/engine';
import * as THREE from 'three';

import type { JpWorld, SurfaceHeightFn } from './types.ts';

const CAMERA_SENSITIVITY = 0.002;
const PLAYER_MAX_SPEED = 6;
const SPRINT_MULTIPLIER = 1.6;

// Smooth acceleration/deceleration
const ACCELERATION = 30; // units/sec² — reaches max speed in ~0.2s
const DECELERATION = 20; // units/sec² — stops in ~0.3s
const EYE_HEIGHT = 1.6;

export interface CameraResult {
  camera: THREE.PerspectiveCamera;
  euler: THREE.Euler;
  applyMovement: (dirX: number, dirZ: number, sprint: boolean, dt: number, headBobOffset?: number) => void;
  applyLook: (deltaX: number, deltaY: number, sensitivityScale?: number) => void;
  getPosition: () => THREE.Vector3;
}

/**
 * Create FPS camera with smooth acceleration and terrain following.
 * Spawns at the given position (or world origin if not specified).
 */
export function createCamera(jpWorld: JpWorld, getSurfaceY: SurfaceHeightFn, spawnX = 0, spawnZ = 0): CameraResult {
  const cameraActor = jpWorld.createActor('camera');
  const cameraCtrl = cameraActor.addComponentAndGet(Camera3DControls, {
    speed: PLAYER_MAX_SPEED,
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

  // Spawn position
  const spawnY = getSurfaceY(spawnX, spawnZ);
  camera.position.set(spawnX, spawnY + EYE_HEIGHT, spawnZ);

  const euler = new THREE.Euler(-0.05, 0, 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);

  // Current velocity for smooth acceleration
  let velocityX = 0;
  let velocityZ = 0;

  function applyLook(deltaX: number, deltaY: number, sensitivityScale = 1): void {
    euler.y -= deltaX * CAMERA_SENSITIVITY * sensitivityScale;
    euler.x -= deltaY * CAMERA_SENSITIVITY * sensitivityScale;
    const maxPitch = Math.PI / 2 - 0.01;
    euler.x = Math.max(-maxPitch, Math.min(maxPitch, euler.x));
    camera.quaternion.setFromEuler(euler);
  }

  function applyMovement(dirX: number, dirZ: number, sprint: boolean, dt: number, headBobOffset = 0): void {
    const maxSpeed = sprint ? PLAYER_MAX_SPEED * SPRINT_MULTIPLIER : PLAYER_MAX_SPEED;

    // Transform input direction by camera yaw
    const yaw = euler.y;
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const targetWorldX = dirX * cosYaw - dirZ * sinYaw;
    const targetWorldZ = dirX * sinYaw + dirZ * cosYaw;

    // Target velocity
    const targetVX = targetWorldX * maxSpeed;
    const targetVZ = targetWorldZ * maxSpeed;

    // Smooth acceleration toward target velocity
    if (dirX !== 0 || dirZ !== 0) {
      // Accelerating
      velocityX += (targetVX - velocityX) * Math.min(1, ACCELERATION * dt);
      velocityZ += (targetVZ - velocityZ) * Math.min(1, ACCELERATION * dt);
    } else {
      // Decelerating — ramp down smoothly
      const decelFactor = Math.min(1, DECELERATION * dt);
      velocityX *= 1 - decelFactor;
      velocityZ *= 1 - decelFactor;

      // Snap to zero when very slow to prevent drift
      if (Math.abs(velocityX) < 0.01) velocityX = 0;
      if (Math.abs(velocityZ) < 0.01) velocityZ = 0;
    }

    // Apply velocity
    const newX = camera.position.x + velocityX * dt;
    const newZ = camera.position.z + velocityZ * dt;

    // Terrain following — always move (infinite world, no edges)
    const targetY = getSurfaceY(Math.round(newX), Math.round(newZ));
    const currentFeetY = camera.position.y - EYE_HEIGHT;
    const heightDiff = targetY - currentFeetY;

    // Step up small heights (stairs), block walls
    if (heightDiff <= 1.5 && heightDiff >= -4) {
      camera.position.x = newX;
      camera.position.z = newZ;
      const targetEye = targetY + EYE_HEIGHT + headBobOffset;
      // Smooth height interpolation
      const heightLerp = Math.min(1, dt * (heightDiff > 0 ? 12 : 8));
      camera.position.y += (targetEye - camera.position.y) * heightLerp;
    } else if (heightDiff > 1.5) {
      // Steep wall — don't move horizontally but allow sliding along the wall
      // Try X-only movement
      const xOnlyY = getSurfaceY(Math.round(newX), Math.round(camera.position.z));
      if (xOnlyY - currentFeetY <= 1.5) {
        camera.position.x = newX;
        const targetEye = xOnlyY + EYE_HEIGHT + headBobOffset;
        camera.position.y += (targetEye - camera.position.y) * Math.min(1, dt * 10);
      }
      // Try Z-only movement
      const zOnlyY = getSurfaceY(Math.round(camera.position.x), Math.round(newZ));
      if (zOnlyY - currentFeetY <= 1.5) {
        camera.position.z = newZ;
        const targetEye = zOnlyY + EYE_HEIGHT + headBobOffset;
        camera.position.y += (targetEye - camera.position.y) * Math.min(1, dt * 10);
      }
    } else {
      // Falling off a cliff — still move but drop
      camera.position.x = newX;
      camera.position.z = newZ;
      const targetEye = targetY + EYE_HEIGHT + headBobOffset;
      camera.position.y += (targetEye - camera.position.y) * Math.min(1, dt * 15);
    }

    // Settle height when stationary
    if (velocityX === 0 && velocityZ === 0) {
      const standY = getSurfaceY(Math.round(camera.position.x), Math.round(camera.position.z));
      const targetEye = standY + EYE_HEIGHT + headBobOffset;
      if (Math.abs(camera.position.y - targetEye) > 0.05) {
        camera.position.y += (targetEye - camera.position.y) * Math.min(1, dt * 8);
      }
    }
  }

  return {
    camera,
    euler,
    applyMovement,
    applyLook,
    getPosition: () => camera.position,
  };
}
