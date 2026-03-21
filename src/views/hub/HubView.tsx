import RAPIER from '@dimforge/rapier3d';
import { loadRuntime, Runtime } from '@jolly-pixel/runtime';
import { createWorld } from 'koota';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BuildingInteraction } from '../../components/hud/BuildingInteraction';
import { type TouchControlOutput, TouchControls } from '../../components/ui/TouchControls';
import { createCamera } from '../../engine/camera';
import { type BuildingDef, createHub } from '../../engine/hub';
import { useHubBuildings } from '../../hooks/useHubBuildings';
// Hub uses fixed daytime lighting — no DayNightCycle
import { InputSystem } from '../../input/index';
import { isMobileDevice } from '../../input/MobileControls';
import { initPlatform } from '../../platform/CapacitorBridge';
import { MAX_DELTA } from '../../shared/index';
import { LookIntent, MovementIntent, Time } from '../../traits/index';

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
  const mobileInputRef = useRef<{
    moveX: number;
    moveZ: number;
    lookX: number;
    lookY: number;
    action: string | null;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [labels, setLabels] = useState<BuildingLabel[]>([]);
  const [nearDocks, setNearDocks] = useState(false);
  const [showPause, setShowPause] = useState(false);

  // Building upgrade system
  const hubBuildings = useHubBuildings();
  const updateBuildingProximityRef = useRef(hubBuildings.updatePlayerPosition);
  updateBuildingProximityRef.current = hubBuildings.updatePlayerPosition;

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

      // Hub is ALWAYS daytime — no day/night cycle
      const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
      sunLight.position.set(20, 40, 20);
      const ambientLight = new THREE.AmbientLight(0xc0c0d0, 0.7);
      scene.add(sunLight, ambientLight, new THREE.HemisphereLight(0xaaccee, 0x886622, 0.7));

      // Hub terrain + buildings
      const hub = createHub(jpWorld, rapierWorld);

      // Camera
      const cam = createCamera(jpWorld, hub.getSurfaceY, hub.hubSize);

      // Input
      const inputSystem = new InputSystem(canvasRef.current!);
      if (!mobile) {
        canvasRef.current?.addEventListener('click', () => {
          if (!document.pointerLockElement) canvasRef.current?.requestPointerLock();
        });
      }

      // Physics step
      (jpWorld as any).on('beforeFixedUpdate', () => {
        rapierWorld.step();
      });

      // Precompute building centers for label projection
      const buildingCenters = hub.buildings.map((b: BuildingDef) => ({
        name: b.name,
        pos: new THREE.Vector3(b.x + b.width / 2, hub.getSurfaceY(b.x, b.z) + b.height + 1, b.z + b.depth / 2),
      }));

      const LABEL_DISTANCE = 15;
      const DOCK_DISTANCE = 8;
      const dockBuilding = hub.buildings.find((b) => b.name === 'Docks')!;
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

        // Day/night
        // Hub is always daytime — no cycle update needed

        // Project building labels to screen
        const camera = cam.camera;
        const playerPos = cam.getPosition();

        const newLabels: BuildingLabel[] = buildingCenters.map((bc) => {
          const dist = playerPos.distanceTo(bc.pos);
          if (dist > LABEL_DISTANCE) return { name: bc.name, screenX: 0, screenY: 0, visible: false };

          const projected = bc.pos.clone().project(camera);
          const cw = canvasRef.current?.clientWidth ?? 0;
          const ch = canvasRef.current?.clientHeight ?? 0;
          const hw = cw / 2;
          const hh = ch / 2;
          return {
            name: bc.name,
            screenX: projected.x * hw + hw,
            screenY: -projected.y * hh + hh,
            visible: projected.z < 1,
          };
        });
        setLabels(newLabels);

        // Check proximity to docks
        const dockDist = Math.sqrt((playerPos.x - dockCenter.x) ** 2 + (playerPos.z - dockCenter.z) ** 2);
        setNearDocks(dockDist < DOCK_DISTANCE);

        // Update building proximity for interaction system
        updateBuildingProximityRef.current(playerPos.x, playerPos.z);
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

  const handleTouchOutput = useCallback((output: TouchControlOutput) => {
    const mi = mobileInputRef.current;
    if (!mi) return;
    mi.moveX = output.moveX;
    mi.moveZ = output.moveZ;
    mi.lookX = output.lookX;
    mi.lookY = output.lookY;
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
        {labels
          .filter((l) => l.visible)
          .map((l) => (
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
            type="button"
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

      {/* Building interaction overlay */}
      {hubBuildings.nearbyBuilding && (
        <BuildingInteraction
          nearby={hubBuildings.nearbyBuilding}
          resources={hubBuildings.resources}
          onUpgrade={hubBuildings.upgradeBuilding}
        />
      )}

      {/* Hub indicator + resources */}
      <div
        className="fixed top-4 left-4 z-10 bg-[#fdf6e3]/85 border-2 border-[#8b5a2b] rounded-md px-3 py-2"
        style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}
      >
        <div className="text-sm font-bold">Hub Island</div>
        <div className="text-xs italic" style={{ color: '#8b5a2b' }}>
          Visit the Docks to set sail
        </div>
        <div className="flex gap-2 mt-1 text-xs">
          <span>Wood: {hubBuildings.resources.wood ?? 0}</span>
          <span>Stone: {hubBuildings.resources.stone ?? 0}</span>
        </div>
      </div>

      {/* Menu button — shows pause overlay */}
      <div className="fixed top-4 right-4 z-10">
        <button
          type="button"
          onClick={() => setShowPause(true)}
          className="bg-[#fdf6e3]/85 border-2 border-[#8b5a2b] rounded-md px-3 py-2 cursor-pointer text-xs"
          style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}
        >
          Menu
        </button>
      </div>

      {/* Pause overlay */}
      {showPause && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#fdf6e3] border-3 border-[#8b5a2b] rounded-xl p-9 text-center">
            <h2 className="text-3xl mb-6" style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}>
              PAUSED
            </h2>
            <button
              type="button"
              onClick={() => setShowPause(false)}
              className="block w-full mb-2 py-2.5 rounded-md border-2 border-[#8b5a2b] bg-[#2c1e16] text-[#fdf6e3] cursor-pointer text-base"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Resume
            </button>
            <button
              type="button"
              onClick={() => onNavigate('menu')}
              className="block w-full py-2.5 rounded-md border-2 border-[#8b5a2b] bg-[#fef9ef] text-[#2c1e16] cursor-pointer text-base"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Quit to Menu
            </button>
          </div>
        </div>
      )}

      {/* Crosshair */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_4px_rgba(0,0,0,0.5)] z-10 pointer-events-none" />

      {/* Invisible split-half touch controls — mobile only */}
      <TouchControls onOutput={handleTouchOutput} enabled={isMobile} />
    </div>
  );
}
