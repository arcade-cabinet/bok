/**
 * @module engine/playerSetup
 * @role Create player entity: FPS camera, input system, weapon model, pointer lock
 * @input JollyPixel world, canvas, surface height function, mobile flag
 * @output Camera result, input system
 *
 * The weapon model is loaded via JollyPixel's ModelRenderer. The actor's
 * object3D is added as a child of the camera immediately; the actual model
 * mesh appears after `loadRuntime()` triggers `awake()`.
 */
import { InputSystem } from '../input/index.ts';
import { type CameraResult, createCamera } from './camera.ts';
import { spawnModelActor } from './models.ts';
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
export function createPlayer(
  jpWorld: JpWorld,
  canvas: HTMLCanvasElement,
  getSurfaceY: SurfaceHeightFn,
  isMobile: boolean,
  spawnX = 0,
  spawnZ = 0,
): PlayerResult {
  // Camera with smooth acceleration and terrain following
  const cam = createCamera(jpWorld, getSurfaceY, spawnX, spawnZ);

  // Center-mounted weapon model via JollyPixel ModelRenderer.
  // The actor's object3D is parented to the camera immediately; the model
  // mesh is added during the awake() lifecycle (after loadRuntime()).
  const weaponActor = spawnModelActor(
    jpWorld,
    'player-weapon',
    '/assets/models/Tools/Sword_Wood.gltf',
    { x: 0.4, y: -0.3, z: -0.6 },
    0.7,
  );
  // Angle the sword naturally: tilt forward (-X), slight yaw, roll inward
  weaponActor.object3D.rotation.set(-Math.PI / 8, Math.PI / 12, -Math.PI / 6);
  cam.camera.add(weaponActor.object3D);

  // Input system
  const inputSystem = new InputSystem(canvas);
  if (!isMobile) {
    canvas.addEventListener('click', () => {
      if (!document.pointerLockElement) canvas.requestPointerLock();
    });
  }

  return { cam, inputSystem };
}
