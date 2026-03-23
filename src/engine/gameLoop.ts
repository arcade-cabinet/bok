/**
 * @module engine/gameLoop
 * @role Wire beforeFixedUpdate (physics) and beforeUpdate (game logic) frame loops
 * @input Engine context with all initialized systems
 * @output GameLoopResult with pause control and state accessors
 */
import type RAPIER from '@dimforge/rapier3d';
import type { createWorld, World } from 'koota';
import * as THREE from 'three';
import type { EntityManager as YukaEntityManager } from 'yuka';

import { createPlayerGovernor, type GovernorOutput } from '../ai/index';
import { playBlockBreak, playBlockPlace } from '../audio/GameAudio.ts';
import { getResourceForBlock } from '../content/resources.ts';
import { runFrame } from '../frameloop';
import type { InputSystem } from '../input/index.ts';
import { hapticImpact } from '../platform/CapacitorBridge.ts';
import type { GhostPreviewSystem } from '../rendering/GhostPreview.ts';
import type { DayNightCycle, ParticleSystem, WeatherSystem } from '../rendering/index.ts';
import { MAX_DELTA } from '../shared/index.ts';
import {
  advanceBreaking,
  type BlockInteractionSystem,
  type BreakingState,
  breakingTargetChanged,
  canToolBreakBlock,
  createBreakingState,
} from '../systems/block-interaction.ts';
import { IsPlayer, Transform } from '../traits';
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
  /** Koota ECS world singleton — runs alongside old engine systems */
  kootaWorld?: World;
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
  weatherSystem: WeatherSystem | null;
  particles: ParticleSystem | null;
  blockInteraction: BlockInteractionSystem | null;
  ghostPreview: GhostPreviewSystem | null;
  onEngineEvent: ((event: import('./types.ts').EngineEvent) => void) | null;
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
  /** Current block breaking progress (0 = not breaking, 0-1 = in progress) */
  getBreakingProgress: () => number;
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

  // Block interaction cooldowns (prevent continuous fire while mouse held)
  let blockPlaceCooldown = false;
  let blockCycleCooldown = false;
  let shapeCycleCooldown = false;

  // Block breaking progress state
  let breakingState: BreakingState | null = null;
  /** Player's current tool tier — defaults to hand, will be driven by inventory later */
  const currentToolTier = 'hand';

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
      hapticImpact('light');
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
      if (mobileInput.action === 'attack') {
        combat.triggerAttack();
        mobileInput.action = null;
      }
      // 'defend' is handled above via blockActive — stays active while held
      // 'dodge' is handled above
      if (mobileInput.action === 'interact') {
        // Chest interaction is proximity-based and runs every frame in combat.update.
        // The interact button serves as a visual affordance for mobile players.
        // Clear action so it doesn't persist.
        mobileInput.action = null;
      }
    }

    // --- Block interaction (place/break/cycle) ---
    if (ctx.blockInteraction) {
      const bi = ctx.blockInteraction;

      // R key: cycle selected block type
      const cyclePressed = inputSystem.actionMap.isActive('cycleBlock');
      if (cyclePressed && !blockCycleCooldown) {
        blockCycleCooldown = true;
        bi.cycleBlock(1);
      }
      if (!cyclePressed) blockCycleCooldown = false;

      // T key: cycle selected block shape
      const shapeCyclePressed = inputSystem.actionMap.isActive('cycleShape');
      if (shapeCyclePressed && !shapeCycleCooldown) {
        shapeCycleCooldown = true;
        bi.cycleShape();
      }
      if (!shapeCyclePressed) shapeCycleCooldown = false;

      // Check if any enemy is within melee range — if so, combat takes priority
      let enemyInRange = false;
      for (const e of enemies) {
        if (e.dying) continue;
        const edx = cam.camera.position.x - e.mesh.position.x;
        const edz = cam.camera.position.z - e.mesh.position.z;
        if (Math.sqrt(edx * edx + edz * edz) < 3.0) {
          enemyInRange = true;
          break;
        }
      }

      if (!enemyInRange) {
        // Right-click: place block (fires once per click, not per frame)
        const rightDown = !isMobile ? inputSystem.keyboard.parryDown : mobileInput.action === 'placeBlock';

        if (rightDown && !blockPlaceCooldown) {
          blockPlaceCooldown = true;
          const delta = bi.placeBlock(cam.camera);
          if (delta) {
            playBlockPlace();
            hapticImpact('light');
            ctx.onEngineEvent?.({
              type: 'blockPlaced',
              position: { x: delta.x, y: delta.y, z: delta.z },
              blockId: delta.blockId,
            });
          }
          if (isMobile && mobileInput.action === 'placeBlock') mobileInput.action = null;
        }
        if (!rightDown) blockPlaceCooldown = false;

        // Left-click held: progressive block breaking
        const leftDown = !isMobile ? inputSystem.keyboard.attackDown : mobileInput.action === 'breakBlock';

        if (leftDown) {
          const target = bi.query(cam.camera).targetBlock;

          if (target) {
            // Check if tool can break this block at all
            if (!canToolBreakBlock(currentToolTier, target.blockId)) {
              // Tool too weak — reset breaking state
              breakingState = null;
            } else if (breakingTargetChanged(breakingState, target)) {
              // Target changed — start fresh breaking progress
              breakingState = createBreakingState(target.x, target.y, target.z, target.blockId, currentToolTier);
            }

            // Advance breaking progress
            if (breakingState) {
              const progress = advanceBreaking(breakingState, dt);

              if (progress >= 1.0) {
                // Block fully broken
                const brokenBlockId = target.blockId;
                const delta = bi.breakBlock(cam.camera);
                if (delta) {
                  playBlockBreak();
                  hapticImpact('light');
                  ctx.onEngineEvent?.({
                    type: 'blockBroken',
                    position: { x: delta.x, y: delta.y, z: delta.z },
                    blockId: brokenBlockId,
                  });

                  // Resource drop from broken block
                  const resource = getResourceForBlock(brokenBlockId);
                  if (resource) {
                    ctx.onEngineEvent?.({
                      type: 'resourceGathered',
                      resourceId: resource.id,
                      resourceName: resource.name,
                      resourceIcon: resource.icon,
                      amount: 1,
                    });
                  }
                }
                breakingState = null;
              }
            }
          } else {
            // Not looking at any block — reset
            breakingState = null;
          }

          if (isMobile && mobileInput.action === 'breakBlock') mobileInput.action = null;
        } else {
          // Left-click released — reset breaking progress
          breakingState = null;
        }
      } else {
        // Enemy in range — combat takes priority, reset breaking
        breakingState = null;
      }
    }

    // --- Ghost preview wireframe ---
    if (ctx.ghostPreview && ctx.blockInteraction) {
      const preview = ctx.blockInteraction.getPlacementPreview(cam.camera);
      ctx.ghostPreview.update(preview ? preview.position : null, preview ? preview.shape : 'cube');
    }

    // Day/night
    dayNight.update(dt);
    (scene.background as THREE.Color)?.copy(dayNight.skyColor);
    if (scene.fog instanceof THREE.FogExp2) scene.fog.color.copy(dayNight.skyColor);

    // Weather particles (sandstorm, blizzard, volcanic embers, etc.)
    if (ctx.weatherSystem) {
      ctx.weatherSystem.cameraPosition.copy(cam.camera.position);
      ctx.weatherSystem.update(dt);
    }

    // Combat (attacks, damage, loot, boss phases) — pass defensive state
    combat.update(dt, cam.camera.position, {
      dodgeIFrames,
      blockActive,
      parryWindow,
      stamina,
      maxStamina: MAX_STAMINA,
    });

    // Particle system update
    if (ctx.particles) ctx.particles.update(dt);

    // --- Koota ECS frame (runs alongside old systems) ---
    if (ctx.kootaWorld) {
      try {
        // Sync player position from camera into Koota so ECS systems can read it
        const players = ctx.kootaWorld.query(IsPlayer, Transform);
        for (const player of players) {
          const transform = player.get(Transform);
          if (transform) {
            transform.position.set(cam.camera.position.x, cam.camera.position.y, cam.camera.position.z);
          }
        }

        runFrame(ctx.kootaWorld, dt);
      } catch (err) {
        // Koota systems should not break the game — log and continue with old path
        console.warn('[Bok] Koota runFrame error (old engine still running):', err);
      }
    }

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
    getBreakingProgress: () => breakingState?.progress ?? 0,
  };
}
