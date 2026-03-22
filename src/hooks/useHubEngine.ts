/**
 * @module hooks/useHubEngine
 * @role Canvas ref, JollyPixel Runtime lifecycle, terrain generation, camera + input setup, frame loop
 * @input Mobile input ref, building proximity callback ref, NPC proximity callback ref
 * @output Canvas ref, runtime ref, camera result, hub result, NPC entities, mobile flag
 */
import RAPIER from '@dimforge/rapier3d';
import { loadRuntime, Runtime } from '@jolly-pixel/runtime';
import { createWorld } from 'koota';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { TouchControlOutput } from '../components/ui/TouchControls';
import hubNpcsData from '../content/hub/npcs.json';
import { type NPCConfig, NPCConfigSchema } from '../content/index';
import type { CameraResult } from '../engine/camera';
import { createCamera } from '../engine/camera';
import type { HubResult } from '../engine/hub';
import { createHub } from '../engine/hub';
import { type NPCEntity, spawnHubNPCs } from '../engine/npcEntities';
import { InputSystem, isMobileDevice } from '../input/index';
import { initPlatform } from '../platform/CapacitorBridge';
import { MAX_DELTA } from '../shared/index';
import { LookIntent, MovementIntent, Time } from '../traits/index';

/** Validated NPC configs from content JSON. */
const HUB_NPC_CONFIGS: NPCConfig[] = (hubNpcsData as unknown[]).map((raw) => NPCConfigSchema.parse(raw));

export interface HubEngineResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isMobile: boolean;
  handleTouchOutput: (output: TouchControlOutput) => void;
  /** Camera result for label projection. Null until engine is initialized. */
  camRef: React.RefObject<CameraResult | null>;
  /** Hub result for building data. Null until engine is initialized. */
  hubRef: React.RefObject<HubResult | null>;
  /** Spawned NPC entities. Empty until engine is initialized. */
  npcEntities: NPCEntity[];
}

/**
 * Manages the hub engine lifecycle: canvas, Runtime, Rapier, terrain, camera, input, and frame loop.
 *
 * Frame loop callbacks are injected via refs to avoid stale closures:
 * - `onFrameRef` is called every frame with camera position for label projection / dock proximity
 * - `buildingProximityRef` is called every frame for the building interaction hook
 * - `npcProximityRef` is called every frame for the NPC interaction hook
 */
export function useHubEngine(
  onFrameRef: React.RefObject<((cam: CameraResult) => void) | null>,
  buildingProximityRef: React.RefObject<(px: number, pz: number) => void>,
  npcProximityRef: React.RefObject<(px: number, pz: number) => void>,
): HubEngineResult {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const camRef = useRef<CameraResult | null>(null);
  const hubRef = useRef<HubResult | null>(null);
  const gameWorldRef = useRef<ReturnType<typeof createWorld> | null>(null);
  const mobileInputRef = useRef<{
    moveX: number;
    moveZ: number;
    lookX: number;
    lookY: number;
    action: string | null;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [npcEntities, setNpcEntities] = useState<NPCEntity[]>([]);

  useEffect(() => {
    if (!canvasRef.current || runtimeRef.current) return;

    let destroyed = false;
    const mobileInput = { moveX: 0, moveZ: 0, lookX: 0, lookY: 0, action: null as string | null };
    mobileInputRef.current = mobileInput;

    (async () => {
      await initPlatform();
      if (destroyed) return;

      const gameWorld = createWorld(Time, MovementIntent, LookIntent);
      gameWorldRef.current = gameWorld;

      const rapierWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

      // canvasRef.current is guaranteed non-null by the guard at the top of useEffect
      const canvas = canvasRef.current;
      if (!canvas) return;

      const runtime = new Runtime(canvas, {
        includePerformanceStats: import.meta.env.DEV,
      });
      runtimeRef.current = runtime;
      // biome-ignore lint/suspicious/noExplicitAny: JollyPixel Runtime exposes world via internal property
      const jpWorld = (runtime as any).world;

      const mobile = isMobileDevice();
      setIsMobile(mobile);

      const pixelRatio = Math.min(window.devicePixelRatio, mobile ? 1.5 : 2);
      // biome-ignore lint/suspicious/noExplicitAny: JollyPixel internal renderer structure
      const webGLRenderer = (jpWorld.renderer as any)?.webGLRenderer as THREE.WebGLRenderer | undefined;
      if (webGLRenderer) webGLRenderer.setPixelRatio(pixelRatio);

      // Scene setup — hub is always daytime
      const scene = jpWorld.sceneManager.getSource() as THREE.Scene;
      scene.background = new THREE.Color('#87ceeb');
      scene.fog = new THREE.FogExp2('#87ceeb', 0.02);

      const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
      sunLight.position.set(20, 40, 20);
      const ambientLight = new THREE.AmbientLight(0xc0c0d0, 0.7);
      scene.add(sunLight, ambientLight, new THREE.HemisphereLight(0xaaccee, 0x886622, 0.7));

      // Hub terrain + buildings
      const hub = createHub(jpWorld, rapierWorld);
      hubRef.current = hub;

      // Spawn NPC meshes on the terrain
      const npcs = spawnHubNPCs(scene, HUB_NPC_CONFIGS, hub.getSurfaceY);
      setNpcEntities(npcs);

      // Camera
      const cam = createCamera(jpWorld, hub.getSurfaceY, Math.round(hub.hubSize / 2), Math.round(hub.hubSize / 2));
      camRef.current = cam;

      // Input
      const inputSystem = new InputSystem(canvas);
      if (!mobile) {
        canvasRef.current?.addEventListener('click', () => {
          if (!document.pointerLockElement) canvasRef.current?.requestPointerLock();
        });
      }

      // Physics step
      // biome-ignore lint/suspicious/noExplicitAny: JollyPixel World event emitter API is untyped
      (jpWorld as any).on('beforeFixedUpdate', () => {
        rapierWorld.step();
      });

      // Frame loop
      // biome-ignore lint/suspicious/noExplicitAny: JollyPixel World event emitter API is untyped
      (jpWorld as any).on('beforeUpdate', (rawDt: number) => {
        const dt = Math.min(rawDt, MAX_DELTA);

        const prevTime = gameWorld.get(Time);
        gameWorld.set(Time, { delta: dt, elapsed: (prevTime?.elapsed ?? 0) + dt });
        inputSystem.update(gameWorld);

        // Camera look — mobile: from React joystick, desktop: pointer lock
        const mi = mobileInputRef.current;
        if (mobile && mi && (mi.lookX !== 0 || mi.lookY !== 0)) {
          const rotSpeed = 320 * dt;
          cam.applyLook(mi.lookX * rotSpeed, mi.lookY * rotSpeed, 1.0);
        } else {
          const look = gameWorld.get(LookIntent);
          if (look && document.pointerLockElement) {
            cam.applyLook(look.deltaX, look.deltaY);
          }
        }

        // Player movement — mobile: from React joystick, desktop: WASD
        let dirX = 0,
          dirZ = 0,
          sprinting = false;
        if (mobile && mi) {
          dirX = mi.moveX;
          dirZ = mi.moveZ;
        } else {
          const move = gameWorld.get(MovementIntent);
          if (move) {
            dirX = move.dirX;
            dirZ = move.dirZ;
            sprinting = move.sprint;
          }
        }
        cam.applyMovement(dirX, dirZ, sprinting, dt);

        // Notify frame callbacks
        onFrameRef.current?.(cam);
        const pos = cam.getPosition();
        buildingProximityRef.current?.(pos.x, pos.z);
        npcProximityRef.current?.(pos.x, pos.z);
      });

      await loadRuntime(runtime);
      console.log('[Bok] Hub initialized');
    })();

    return () => {
      destroyed = true;
      runtimeRef.current?.stop();
      runtimeRef.current = null;
      camRef.current = null;
      hubRef.current = null;
      gameWorldRef.current?.destroy();
      gameWorldRef.current = null;
    };
  }, [onFrameRef, buildingProximityRef, npcProximityRef]);

  const handleTouchOutput = useCallback((output: TouchControlOutput) => {
    const mi = mobileInputRef.current;
    if (!mi) return;
    mi.moveX = output.moveX;
    mi.moveZ = output.moveZ;
    mi.lookX = output.lookX;
    mi.lookY = output.lookY;
  }, []);

  return {
    canvasRef,
    isMobile,
    handleTouchOutput,
    camRef,
    hubRef,
    npcEntities,
  };
}
