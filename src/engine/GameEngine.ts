/**
 * @module engine/GameEngine
 * @role Orchestrate all engine modules into a running game
 * @input Canvas element, game config
 * @output Running game with cleanup function
 */
import RAPIER from '@dimforge/rapier3d';
import { Runtime, loadRuntime } from '@jolly-pixel/runtime';
import { createWorld } from 'koota';
import * as THREE from 'three';

import { Time, GamePhase, MovementIntent, LookIntent, IslandState } from '../traits/index.ts';
import { MAX_DELTA } from '../shared/index.ts';
import { initPlatform } from '../platform/CapacitorBridge.ts';
import { startAmbient } from '../audio/GameAudio.ts';
import { InputSystem } from '../input/index.ts';
import { isMobileDevice, MobileControls } from '../input/MobileControls.ts';
import { DayNightCycle } from '../rendering/index.ts';

import { ContentRegistry } from '../content/index.ts';
import { createTerrain } from './terrain.ts';
import { spawnEnemies, updateEnemyAI } from './enemies.ts';
import { createCombat } from './combat.ts';
import { createCamera } from './camera.ts';
import { detectContext, getHeadBob } from './diegetic.ts';
import type { DiegeticContext } from './diegetic.ts';
import { createPlayerGovernor, type GovernorOutput } from '../ai/PlayerGovernor.ts';
import type { GameStartConfig, EngineState, EngineEventListener } from './types.ts';

export interface GameInstance {
  /** Current engine state — polled by React each frame */
  getState: () => EngineState;
  /** Subscribe to engine events (damage, kills, etc.) */
  onEvent: (listener: EngineEventListener) => void;
  /** Trigger player attack (from React touch button) */
  triggerAttack: () => void;
  /** Toggle pause */
  togglePause: () => void;
  /** Cleanup everything */
  destroy: () => void;
}

/**
 * Initialize the full game on a canvas element.
 * Returns a GameInstance that React can interact with.
 */
export async function initGame(
  canvas: HTMLCanvasElement,
  config: GameStartConfig,
): Promise<GameInstance> {
  // Platform init (Capacitor status bar, orientation, etc.)
  await initPlatform();

  // Koota world
  const gameWorld = createWorld(Time, GamePhase, MovementIntent, LookIntent, IslandState);

  // Rapier physics
  const rapierWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

  // JollyPixel runtime
  const runtime = new Runtime(canvas, {
    includePerformanceStats: import.meta.env.DEV,
  });
  const jpWorld = (runtime as any).world;

  // Mobile detection
  const isMobile = isMobileDevice();
  const mobileControls = isMobile ? new MobileControls() : null;

  // Performance scaling
  const pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
  const webGLRenderer = (jpWorld.renderer as any)?.webGLRenderer as THREE.WebGLRenderer | undefined;
  if (webGLRenderer) webGLRenderer.setPixelRatio(pixelRatio);

  // Scene setup
  const scene = jpWorld.sceneManager.getSource() as THREE.Scene;
  scene.background = new THREE.Color('#87ceeb');
  scene.fog = new THREE.FogExp2('#87ceeb', 0.015);

  // Day/night cycle + lighting
  const dayNight = new DayNightCycle();
  for (const obj of dayNight.sceneObjects) scene.add(obj);
  scene.add(new THREE.HemisphereLight(0xaaccee, 0x886622, 0.7));

  // --- Terrain ---
  const terrain = createTerrain(jpWorld, rapierWorld, config.seed);

  // --- Enemies + Boss ---
  const { enemies, boss, bossMesh, yukaManager, cleanup: cleanupEnemies } = spawnEnemies(
    scene, terrain.getSurfaceY, terrain.islandSize, config.seed,
  );

  // --- Camera ---
  const cam = createCamera(jpWorld, terrain.getSurfaceY, terrain.islandSize);

  // --- Input ---
  const inputSystem = new InputSystem(canvas);
  if (!isMobile) {
    canvas.addEventListener('click', () => {
      if (!document.pointerLockElement) canvas.requestPointerLock();
    });
  }

  // --- Boss content lookup ---
  const content = new ContentRegistry();
  const biomeConfig = content.getBiome(config.biome);
  const bossConfig = content.getBoss(biomeConfig.bossId);

  // --- Combat ---
  const eventListeners: EngineEventListener[] = [];
  const combat = createCombat(scene, enemies, boss, bossMesh, (event) => {
    for (const listener of eventListeners) listener(event);
  }, bossConfig.id, bossConfig.tomePageDrop);

  // --- Player Governor (GOAP advisor) ---
  const governor = createPlayerGovernor();
  let lastGovernorOutput: GovernorOutput = { suggestedTarget: -1, threatLevel: 'none', canDodge: true };

  // --- Diegetic state ---
  let currentContext: DiegeticContext = 'explore';
  let elapsedTime = 0;

  // --- State ---
  let paused = false;

  // --- Physics step ---
  (jpWorld as any).on('beforeFixedUpdate', () => {
    rapierWorld.step();
  });

  // --- Frame loop ---
  (jpWorld as any).on('beforeUpdate', (rawDt: number) => {
    if (paused || combat.state.phase !== 'playing') return;
    const dt = Math.min(rawDt, MAX_DELTA);

    // Update Koota time
    const prevTime = gameWorld.get(Time);
    gameWorld.set(Time, { delta: dt, elapsed: (prevTime?.elapsed ?? 0) + dt });

    // Input
    inputSystem.update(gameWorld);

    // Enemy AI
    updateEnemyAI(enemies, cam.camera.position, dt, yukaManager);

    // Camera look
    if (mobileControls) {
      const touchLook = mobileControls.consumeLookDelta();
      if (touchLook.x !== 0 || touchLook.y !== 0) {
        cam.applyLook(touchLook.x, touchLook.y, 0.5);
      }
    } else {
      const look = gameWorld.get(LookIntent);
      if (look && document.pointerLockElement) {
        cam.applyLook(look.deltaX, look.deltaY);
      }
    }

    // Player movement
    let dirX = 0, dirZ = 0, sprinting = false;
    if (mobileControls) {
      dirX = mobileControls.state.moveX;
      dirZ = mobileControls.state.moveZ;
    } else {
      const move = gameWorld.get(MovementIntent);
      if (move) { dirX = move.dirX; dirZ = move.dirZ; sprinting = move.sprint; }
    }

    // Diegetic context + head bob
    elapsedTime += dt;
    currentContext = detectContext(cam.camera.position, enemies, terrain.getSurfaceY);
    const isMoving = dirX !== 0 || dirZ !== 0;
    const bobOffset = getHeadBob(dt, isMoving, currentContext, elapsedTime);
    cam.applyMovement(dirX, dirZ, sprinting, dt, bobOffset);

    // Mobile attack
    if (mobileControls?.consumeAttack()) combat.triggerAttack();

    // Day/night
    dayNight.update(dt);
    (scene.background as THREE.Color)?.copy(dayNight.skyColor);
    if (scene.fog instanceof THREE.FogExp2) scene.fog.color.copy(dayNight.skyColor);

    // Combat (attacks, damage, loot, boss phases)
    combat.update(dt, cam.camera.position);

    // Player governor — update context and run GOAP evaluation
    governor.setContext(
      cam.camera.position.x, cam.camera.position.y, cam.camera.position.z,
      enemies, combat.state.playerHealth, combat.state.maxHealth,
    );
    lastGovernorOutput = governor.update(dt);
  });

  // Start ambient audio
  startAmbient();

  // Boot
  await loadRuntime(runtime);
  console.log('[Bok] Engine initialized');

  if (mobileControls) mobileControls.show();

  return {
    getState: (): EngineState => ({
      playerHealth: combat.state.playerHealth,
      maxHealth: combat.state.maxHealth,
      enemyCount: enemies.length,
      biomeName: config.biome,
      bossNearby: !boss.defeated && (() => {
        const dx = cam.camera.position.x - bossMesh.position.x;
        const dz = cam.camera.position.z - bossMesh.position.z;
        return Math.sqrt(dx * dx + dz * dz) < 20;
      })(),
      bossHealthPct: boss.defeated ? 0 : (enemies.find(e => e.mesh === bossMesh)?.health ?? 0) / boss.maxHealth,
      bossPhase: boss.phase,
      paused,
      phase: paused ? 'paused' : combat.state.phase,
      context: currentContext,
      suggestedTargetPos: lastGovernorOutput.suggestedTarget >= 0 && lastGovernorOutput.suggestedTarget < enemies.length
        ? {
            x: enemies[lastGovernorOutput.suggestedTarget].mesh.position.x,
            y: enemies[lastGovernorOutput.suggestedTarget].mesh.position.y,
            z: enemies[lastGovernorOutput.suggestedTarget].mesh.position.z,
          }
        : null,
      threatLevel: lastGovernorOutput.threatLevel,
      canDodge: lastGovernorOutput.canDodge,
    }),
    onEvent: (listener) => { eventListeners.push(listener); },
    triggerAttack: () => combat.triggerAttack(),
    togglePause: () => {
      paused = !paused;
      if (paused && document.pointerLockElement) document.exitPointerLock();
    },
    destroy: () => {
      combat.cleanup();
      cleanupEnemies();
      mobileControls?.destroy();
      runtime.stop();
      gameWorld.destroy();
    },
  };
}
