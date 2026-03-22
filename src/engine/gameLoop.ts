/**
 * @module engine/gameLoop
 * @role Wire beforeFixedUpdate (physics) and beforeUpdate (game logic) frame loops
 * @input Engine context with all initialized systems
 * @output GameLoopResult with pause control and state accessors
 */
import type RAPIER from '@dimforge/rapier3d';
import type { createWorld } from 'koota';
import * as THREE from 'three';
import type { EntityManager as YukaEntityManager } from 'yuka';

import { createPlayerGovernor, type GovernorOutput } from '../ai/PlayerGovernor.ts';
import type { InputSystem } from '../input/index.ts';
import type { DayNightCycle } from '../rendering/index.ts';
import { MAX_DELTA } from '../shared/index.ts';
import { LookIntent, MovementIntent, Time } from '../traits/index.ts';
import type { CameraResult } from './camera.ts';
import type { CombatSystem } from './combat.ts';
import type { DiegeticContext } from './diegetic.ts';
import { detectContext, getHeadBob } from './diegetic.ts';
import { updateEnemyAI } from './enemySetup.ts';
import type { EnemyState, JpWorld, MobileInput, SurfaceHeightFn } from './types.ts';

/** Everything the game loop needs to run each frame */
export interface GameLoopContext {
  jpWorld: JpWorld;
  rapierWorld: RAPIER.World;
  gameWorld: ReturnType<typeof createWorld>;
  scene: THREE.Scene;
  dayNight: DayNightCycle;
  cam: CameraResult;
  inputSystem: InputSystem;
  enemies: EnemyState[];
  yukaManager: YukaEntityManager;
  combat: CombatSystem;
  isMobile: boolean;
  mobileInput: MobileInput;
  getSurfaceY: SurfaceHeightFn;
}

/** Controls and state accessors returned from the game loop */
export interface GameLoopResult {
  isPaused: () => boolean;
  togglePause: () => void;
  getContext: () => DiegeticContext;
  getGovernorOutput: () => GovernorOutput;
}

/**
 * Register physics and game-logic frame loops on the JollyPixel world.
 * Returns pause control and state accessors for the orchestrator.
 */
export function createGameLoop(ctx: GameLoopContext): GameLoopResult {
  const {
    jpWorld,
    rapierWorld,
    gameWorld,
    scene,
    dayNight,
    cam,
    inputSystem,
    enemies,
    yukaManager,
    combat,
    isMobile,
    mobileInput,
    getSurfaceY,
  } = ctx;

  // Player governor (GOAP advisor)
  const governor = createPlayerGovernor();
  let lastGovernorOutput: GovernorOutput = { suggestedTarget: -1, threatLevel: 'none', canDodge: true };

  // Diegetic state
  let currentContext: DiegeticContext = 'explore';
  let elapsedTime = 0;

  // Pause state
  let paused = false;

  // Physics step
  jpWorld.on('beforeFixedUpdate', () => {
    rapierWorld.step();
  });

  // Frame loop
  jpWorld.on('beforeUpdate', (rawDt: number) => {
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
    // Mobile: right joystick position = continuous rotation rate (not delta)
    if (isMobile && (mobileInput.lookX !== 0 || mobileInput.lookY !== 0)) {
      // Scale by dt so rotation is framerate-independent. 320 = degrees per second at full deflection
      const rotSpeed = 320 * dt;
      cam.applyLook(mobileInput.lookX * rotSpeed, mobileInput.lookY * rotSpeed, 1.0);
    } else {
      const look = gameWorld.get(LookIntent);
      if (look && document.pointerLockElement) {
        cam.applyLook(look.deltaX, look.deltaY);
      }
    }

    // Player movement
    let dirX = 0,
      dirZ = 0,
      sprinting = false;
    if (isMobile) {
      dirX = mobileInput.moveX;
      dirZ = mobileInput.moveZ;
    } else {
      const move = gameWorld.get(MovementIntent);
      if (move) {
        dirX = move.dirX;
        dirZ = move.dirZ;
        sprinting = move.sprint;
      }
    }

    // Diegetic context + head bob
    elapsedTime += dt;
    currentContext = detectContext(cam.camera.position, enemies, getSurfaceY);
    const isMoving = dirX !== 0 || dirZ !== 0;
    const bobOffset = getHeadBob(dt, isMoving, currentContext, elapsedTime);
    cam.applyMovement(dirX, dirZ, sprinting, dt, bobOffset);

    // Mobile actions from React joystick
    if (isMobile && mobileInput.action) {
      if (mobileInput.action === 'attack') combat.triggerAttack();
      mobileInput.action = null;
    }

    // Day/night
    dayNight.update(dt);
    (scene.background as THREE.Color)?.copy(dayNight.skyColor);
    if (scene.fog instanceof THREE.FogExp2) scene.fog.color.copy(dayNight.skyColor);

    // Combat (attacks, damage, loot, boss phases)
    combat.update(dt, cam.camera.position);

    // Player governor — update context and run GOAP evaluation
    governor.setContext(
      cam.camera.position.x,
      cam.camera.position.y,
      cam.camera.position.z,
      enemies,
      combat.state.playerHealth,
      combat.state.maxHealth,
    );
    lastGovernorOutput = governor.update(dt);
  });

  return {
    isPaused: () => paused,
    togglePause: () => {
      paused = !paused;
      if (paused && document.pointerLockElement) document.exitPointerLock();
    },
    getContext: () => currentContext,
    getGovernorOutput: () => lastGovernorOutput,
  };
}
