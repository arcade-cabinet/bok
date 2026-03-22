/**
 * @module engine/playerSetup
 * @role Create player entity: FPS camera, input system, weapon model, pointer lock
 * @input JollyPixel world, canvas, surface height function, mobile flag
 * @output Camera result, input system
 */
import { InputSystem } from '../input/index.ts';
import { type CameraResult, createCamera } from './camera.ts';
import { loadModel } from './models.ts';
import type { JpWorld, SurfaceHeightFn } from './types.ts';

/** Player entity: camera + input */
export interface PlayerResult {
  cam: CameraResult;
  inputSystem: InputSystem;
}

/**
 * Set up the player: FPS camera with smooth movement,
 * center-mounted weapon model, input system, and desktop pointer lock.
 */
export async function createPlayer(
  jpWorld: JpWorld,
  canvas: HTMLCanvasElement,
  getSurfaceY: SurfaceHeightFn,
  isMobile: boolean,
  spawnX = 0,
  spawnZ = 0,
): Promise<PlayerResult> {
  // Camera with smooth acceleration and terrain following
  const cam = createCamera(jpWorld, getSurfaceY, spawnX, spawnZ);

  // Center-mounted weapon model (visible in viewport)
  try {
    const weaponModel = await loadModel('/assets/models/Tools/Sword_Wood.gltf');
    weaponModel.scale.setScalar(0.4);
    weaponModel.position.set(0.3, -0.25, -0.5);
    weaponModel.rotation.set(0, 0, -Math.PI / 6);
    cam.camera.add(weaponModel);
  } catch {
    // Weapon model failed to load — continue without it
  }

  // Input system
  const inputSystem = new InputSystem(canvas);
  if (!isMobile) {
    canvas.addEventListener('click', () => {
      if (!document.pointerLockElement) canvas.requestPointerLock();
    });
  }

  return { cam, inputSystem };
}
