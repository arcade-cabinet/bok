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

import { createPlayerGovernor, type GovernorOutput } from '../ai/index';
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

/** Dodge mechanic constants */
const DODGE_DURATION = 0.3;
const DODGE_COOLDOWN = 0.8;
const DODGE_STAMINA_COST = 25;
const DODGE_SPEED = 12;
const PLAYER_SPEED = 6;

/** Block/parry constants */
const PARRY_WINDOW_DURATION = 0.15;

/** Stamina constants */
const STAMINA_REGEN_RATE = 20; // per second
const MAX_STAMINA = 100;

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
  getStamina: () => number;
  getMaxStamina: () => number;
  isBlocking: () => boolean;
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

  // Stamina state
  let stamina = MAX_STAMINA;

  // Dodge state
  let dodgeCooldown = 0;
  let dodgeIFrames = 0;

  // Block/parry state
  let blockActive = false;
  let wasBlocking = false;
  let parryWindow = 0;

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

    // --- Stamina regen ---
    stamina = Math.min(MAX_STAMINA, stamina + STAMINA_REGEN_RATE * dt);

    // --- Dodge mechanic ---
    if (dodgeCooldown > 0) dodgeCooldown -= dt;
    if (dodgeIFrames > 0) dodgeIFrames -= dt;

    const dodgePressed = !isMobile ? inputSystem.actionMap.isActive('dodge') : mobileInput.action === 'dodge';

    if (dodgePressed && dodgeCooldown <= 0 && stamina >= DODGE_STAMINA_COST) {
      dodgeCooldown = DODGE_COOLDOWN;
      dodgeIFrames = DODGE_DURATION;
      stamina -= DODGE_STAMINA_COST;
      // Dodge movement burst in current facing direction
      cam.applyMovement(0, -1, false, (DODGE_DURATION * DODGE_SPEED) / PLAYER_SPEED);
      // Clear mobile dodge action
      if (isMobile && mobileInput.action === 'dodge') {
        mobileInput.action = null;
      }
    }

    // --- Block / Parry mechanic ---
    const blockHeld = !isMobile
      ? inputSystem.keyboard.parryDown // RMB held
      : mobileInput.action === 'defend';

    blockActive = blockHeld;

    if (blockHeld && !wasBlocking) {
      // Fresh block press — open parry window
      parryWindow = PARRY_WINDOW_DURATION;
    }
    wasBlocking = blockHeld;

    if (parryWindow > 0) parryWindow -= dt;

    // Diegetic context + head bob
    elapsedTime += dt;
    currentContext = detectContext(cam.camera.position, enemies, getSurfaceY);
    const isMoving = dirX !== 0 || dirZ !== 0;
    const bobOffset = getHeadBob(dt, isMoving, currentContext, elapsedTime);
    cam.applyMovement(dirX, dirZ, sprinting, dt, bobOffset);

    // Mobile actions from React joystick
    if (isMobile && mobileInput.action) {
      if (mobileInput.action === 'attack') combat.triggerAttack();
      // 'defend' is handled above via blockActive
      // 'dodge' is handled above
      if (mobileInput.action === 'attack') {
        mobileInput.action = null;
      }
    }

    // Day/night
    dayNight.update(dt);
    (scene.background as THREE.Color)?.copy(dayNight.skyColor);
    if (scene.fog instanceof THREE.FogExp2) scene.fog.color.copy(dayNight.skyColor);

    // Combat (attacks, damage, loot, boss phases) — pass defensive state
    combat.update(dt, cam.camera.position, {
      dodgeIFrames,
      blockActive,
      parryWindow,
      stamina,
      maxStamina: MAX_STAMINA,
    });

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
    // Override canDodge with actual stamina check
    lastGovernorOutput = {
      ...lastGovernorOutput,
      canDodge: stamina >= DODGE_STAMINA_COST && dodgeCooldown <= 0,
    };
  });

  return {
    isPaused: () => paused,
    togglePause: () => {
      paused = !paused;
      if (paused && document.pointerLockElement) document.exitPointerLock();
    },
    getContext: () => currentContext,
    getGovernorOutput: () => lastGovernorOutput,
    getStamina: () => stamina,
    getMaxStamina: () => MAX_STAMINA,
    isBlocking: () => blockActive,
  };
}
