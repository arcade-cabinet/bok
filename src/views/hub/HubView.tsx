import { useRef, useEffect, useState, useCallback } from 'react';
import RAPIER from '@dimforge/rapier3d';
import { Runtime, loadRuntime } from '@jolly-pixel/runtime';
import * as THREE from 'three';

import { createHub, type BuildingDef } from '../../engine/hub';
import { createCamera } from '../../engine/camera';
import { DayNightCycle } from '../../rendering/index';
import { InputSystem } from '../../input/index';
import { isMobileDevice } from '../../input/MobileControls';
import { MedievalJoysticks, type MedievalJoystickOutput } from '../../components/ui/MedievalJoysticks';
import { createWorld } from 'koota';
import { Time, MovementIntent, LookIntent } from '../../traits/index';
import { MAX_DELTA } from '../../shared/index';
import { initPlatform } from '../../platform/CapacitorBridge';

interface Props {
  onNavigate: (view: 'menu' | 'game') => void;
}

interface BuildingLabel {
  name: string;
  screenX: number;
  screenY: number;
  visible: boolean;
}

/**
 * HubView — the starting hub island where the player walks between buildings
 * and can choose to set sail to a game island.
 */
export function HubView({ onNavigate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const gameWorldRef = useRef<ReturnType<typeof createWorld> | null>(null);
  const mobileInputRef = useRef<{ moveX: number; moveZ: number; lookDX: number; lookDY: number; action: string | null } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [labels, setLabels] = useState<BuildingLabel[]>([]);
  const [nearDocks, setNearDocks] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || runtimeRef.current) return;

    let destroyed = false;
    const mobileInput = { moveX: 0, moveZ: 0, lookDX: 0, lookDY: 0, action: null as string | null };
    mobileInputRef.current = mobileInput;

    (async () => {
      await initPlatform();

      if (destroyed) return;

      const gameWorld = createWorld(Time, MovementIntent, LookIntent);
      gameWorldRef.current = gameWorld;

      const rapierWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

      const runtime = new Runtime(canvasRef.current!, {
        includePerformanceStats: import.meta.env.DEV,
      });
      runtimeRef.current = runtime;
      const jpWorld = (runtime as any).world;

      const mobile = isMobileDevice();
      setIsMobile(mobile);

      const pixelRatio = Math.min(window.devicePixelRatio, mobile ? 1.5 : 2);
      const webGLRenderer = (jpWorld.renderer as any)?.webGLRenderer as THREE.WebGLRenderer | undefined;
      if (webGLRenderer) webGLRenderer.setPixelRatio(pixelRatio);

      const scene = jpWorld.sceneManager.getSource() as THREE.Scene;
      scene.background = new THREE.Color('#87ceeb');
      scene.fog = new THREE.FogExp2('#87ceeb', 0.02);

      const dayNight = new DayNightCycle();
      for (const obj of dayNight.sceneObjects) scene.add(obj);
      scene.add(new THREE.HemisphereLight(0xaaccee, 0x886622, 0.7));

      // Hub terrain + buildings
      const hub = createHub(jpWorld, rapierWorld);

      // Camera
      const cam = createCamera(jpWorld, hub.getSurfaceY, hub.hubSize);

      // Input
      const inputSystem = new InputSystem(canvasRef.current!);
      if (!mobile) {
        canvasRef.current!.addEventListener('click', () => {
          if (!document.pointerLockElement) canvasRef.current!.requestPointerLock();
        });
      }

      // Physics step
      (jpWorld as any).on('beforeFixedUpdate', () => {
        rapierWorld.step();
      });

      // Precompute building centers for label projection
      const buildingCenters = hub.buildings.map((b: BuildingDef) => ({
        name: b.name,
        pos: new THREE.Vector3(
          b.x + b.width / 2,
          (hub.getSurfaceY(b.x, b.z)) + b.height + 1,
          b.z + b.depth / 2,
        ),
      }));

      const LABEL_DISTANCE = 15;
      const DOCK_DISTANCE = 8;
      const dockBuilding = hub.buildings.find(b => b.name === 'Docks')!;
      const dockCenter = new THREE.Vector3(
        dockBuilding.x + dockBuilding.width / 2,
        0,
        dockBuilding.z + dockBuilding.depth / 2,
      );

      // Frame loop
      (jpWorld as any).on('beforeUpdate', (rawDt: number) => {
        const dt = Math.min(rawDt, MAX_DELTA);

        const prevTime = gameWorld.get(Time);
        gameWorld.set(Time, { delta: dt, elapsed: (prevTime?.elapsed ?? 0) + dt });

        inputSystem.update(gameWorld);

        // Camera look — mobile: from React joystick, desktop: pointer lock
        const mi = mobileInputRef.current;
        if (mobile && mi && (mi.lookDX !== 0 || mi.lookDY !== 0)) {
          cam.applyLook(mi.lookDX, mi.lookDY, 0.5);
          mi.lookDX = 0;
          mi.lookDY = 0;
        } else {
          const look = gameWorld.get(LookIntent);
          if (look && document.pointerLockElement) {
            cam.applyLook(look.deltaX, look.deltaY);
          }
        }

        // Player movement — mobile: from React joystick, desktop: WASD
        let dirX = 0, dirZ = 0, sprinting = false;
        if (mobile && mi) {
          dirX = mi.moveX;
          dirZ = mi.moveZ;
        } else {
          const move = gameWorld.get(MovementIntent);
          if (move) { dirX = move.dirX; dirZ = move.dirZ; sprinting = move.sprint; }
        }
        cam.applyMovement(dirX, dirZ, sprinting, dt);

        // Day/night
        dayNight.update(dt);
        (scene.background as THREE.Color)?.copy(dayNight.skyColor);
        if (scene.fog instanceof THREE.FogExp2) scene.fog.color.copy(dayNight.skyColor);

        // Project building labels to screen
        const camera = cam.camera;
        const playerPos = cam.getPosition();

        const newLabels: BuildingLabel[] = buildingCenters.map(bc => {
          const dist = playerPos.distanceTo(bc.pos);
          if (dist > LABEL_DISTANCE) return { name: bc.name, screenX: 0, screenY: 0, visible: false };

          const projected = bc.pos.clone().project(camera);
          const hw = canvasRef.current!.clientWidth / 2;
          const hh = canvasRef.current!.clientHeight / 2;
          return {
            name: bc.name,
            screenX: projected.x * hw + hw,
            screenY: -projected.y * hh + hh,
            visible: projected.z < 1,
          };
        });
        setLabels(newLabels);

        // Check proximity to docks
        const dockDist = Math.sqrt(
          (playerPos.x - dockCenter.x) ** 2 + (playerPos.z - dockCenter.z) ** 2,
        );
        setNearDocks(dockDist < DOCK_DISTANCE);
      });

      await loadRuntime(runtime);
      console.log('[Bok] Hub initialized');

      // Mobile UI handled by React
    })();

    return () => {
      destroyed = true;
      // Mobile cleanup handled by React unmount
      runtimeRef.current?.stop();
      runtimeRef.current = null;
      gameWorldRef.current?.destroy();
      gameWorldRef.current = null;
    };
  }, []);

  const handleSetSail = useCallback(() => {
    onNavigate('game');
  }, [onNavigate]);

  const handleJoystickOutput = useCallback((output: MedievalJoystickOutput) => {
    const mi = mobileInputRef.current;
    if (!mi) return;
    mi.moveX = output.moveX;
    mi.moveZ = output.moveZ;
    mi.lookDX += output.lookDX;
    mi.lookDY += output.lookDY;
    if (output.action) mi.action = output.action;
  }, []);

  return (
    <div className="fixed inset-0">
      <canvas
        ref={canvasRef}
        id="hub-canvas"
        tabIndex={-1}
        className="w-full h-full block outline-none"
        style={{ touchAction: 'none' }}
      />

      {/* Floating building labels */}
      <div className="fixed inset-0 pointer-events-none z-10">
        {labels.filter(l => l.visible).map(l => (
          <div
            key={l.name}
            className="absolute text-center -translate-x-1/2"
            style={{
              left: l.screenX,
              top: l.screenY,
              fontFamily: 'Cinzel, Georgia, serif',
              color: '#fdf6e3',
              textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)',
              fontSize: '14px',
              letterSpacing: '0.05em',
            }}
          >
            {l.name}
          </div>
        ))}
      </div>

      {/* Set Sail prompt near docks */}
      {nearDocks && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={handleSetSail}
            className="px-8 py-3 rounded-lg border-2 cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,115,85,0.5)]"
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              color: '#d4c5a0',
              background: 'rgba(58,40,32,0.9)',
              borderColor: '#c4a572',
              fontSize: '18px',
              letterSpacing: '0.05em',
            }}
          >
            Set Sail
          </button>
        </div>
      )}

      {/* Hub indicator */}
      <div
        className="fixed top-4 left-4 z-10 bg-[#fdf6e3]/85 border-2 border-[#8b5a2b] rounded-md px-3 py-2"
        style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}
      >
        <div className="text-sm font-bold">Hub Island</div>
        <div className="text-xs italic" style={{ color: '#8b5a2b' }}>
          Visit the Docks to set sail
        </div>
      </div>

      {/* Return to menu */}
      <div className="fixed top-4 right-4 z-10">
        <button
          onClick={() => onNavigate('menu')}
          className="bg-[#fdf6e3]/85 border-2 border-[#8b5a2b] rounded-md px-3 py-2 cursor-pointer text-xs"
          style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}
        >
          Menu
        </button>
      </div>

      {/* Crosshair */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_4px_rgba(0,0,0,0.5)] z-10 pointer-events-none" />

      {/* Medieval joysticks — mobile only */}
      {isMobile && <MedievalJoysticks onOutput={handleJoystickOutput} visible={true} />}
    </div>
  );
}
