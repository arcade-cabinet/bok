/**
 * @module engine/playerSetup
 * @role Create player entity: FPS camera, input system, weapon model, pointer lock
 * @input JollyPixel world, canvas, terrain result, mobile flag
 * @output Camera result, input system
 */
import { InputSystem } from '../input/index.ts';
import { type CameraResult, createCamera } from './camera.ts';
import { loadModel } from './models.ts';
import type { TerrainResult } from './terrainSetup.ts';

/** Player entity: camera + input */
export interface PlayerResult {
  cam: CameraResult;
  inputSystem: InputSystem;
}

/**
 * Set up the player: FPS camera at highest terrain point,
 * center-mounted weapon model, input system, and desktop pointer lock.
 */
export async function createPlayer(
  jpWorld: any,
  canvas: HTMLCanvasElement,
  terrain: TerrainResult,
  isMobile: boolean,
): Promise<PlayerResult> {
  // Camera with auto-platforming
  const cam = createCamera(jpWorld, terrain.getSurfaceY, terrain.islandSize);

  // Center-mounted weapon model (visible in viewport)
  try {
    const weaponModel = await loadModel('/models/weapons/Sword_Wood.glb');
    weaponModel.scale.setScalar(0.4);
    weaponModel.position.set(0.3, -0.25, -0.5);
    weaponModel.rotation.set(0, 0, -Math.PI / 6);
    cam.camera.add(weaponModel); // Attach to camera so it moves with player
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
