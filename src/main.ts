import { Runtime, loadRuntime } from '@jolly-pixel/runtime';
import { createWorld } from 'koota';
import {
  Time, GamePhase, MovementIntent, LookIntent, IslandState,
} from './traits/index.ts';
import { MAX_DELTA } from './shared/constants.ts';
import { InputSystem } from './input/index.ts';
import { ContentRegistry } from './content/index.ts';
import { SceneDirector } from './scenes/SceneDirector.ts';
import { MainMenuScene } from './scenes/MainMenuScene.ts';
import { IslandScene } from './scenes/IslandScene.ts';
import { BossArenaScene } from './scenes/BossArenaScene.ts';

// --- Canvas ---
const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) throw new Error('Canvas element not found');

// --- Pointer Lock ---
canvas.addEventListener('click', () => {
  if (!document.pointerLockElement) {
    canvas.requestPointerLock();
  }
});

// --- Koota World (single source of truth) ---
const gameWorld = createWorld(Time, GamePhase, MovementIntent, LookIntent, IslandState);

// --- Content Registry (Zod-validated JSON configs) ---
const content = new ContentRegistry();

// --- JollyPixel Runtime (owns render loop + voxel renderer) ---
const runtime = new Runtime(canvas, {
  includePerformanceStats: import.meta.env.DEV,
});

// --- Input System ---
const inputSystem = new InputSystem(canvas);

// --- Scene Director ---
const sceneDirector = new SceneDirector();
sceneDirector.register('mainMenu', new MainMenuScene(gameWorld, runtime));
// HubScene registered separately — requires SceneDirector + SaveManager wired by hub task
sceneDirector.register('island', new IslandScene(gameWorld, runtime, content, inputSystem));
sceneDirector.register('bossArena', new BossArenaScene(gameWorld, runtime));

// --- Frame Loop (wired into JollyPixel's beforeUpdate) ---
runtime.world.on('beforeUpdate', (rawDt: number) => {
  // Clamp dt to prevent teleporting after tab switch
  const dt = Math.min(rawDt, MAX_DELTA);

  // 1. Update Time world trait
  const prevTime = gameWorld.get(Time);
  gameWorld.set(Time, {
    delta: dt,
    elapsed: (prevTime?.elapsed ?? 0) + dt,
  });

  // 2. Poll input → write MovementIntent/LookIntent/attack actions
  inputSystem.update(gameWorld);

  // 3-7. Delegate to active scene (AI, movement, combat, physics, render sync)
  sceneDirector.update(dt);
});

// --- Boot ---
loadRuntime(runtime)
  .then(() => {
    console.log('[Bok] Runtime loaded — starting Forest island vertical slice');
    // Start directly on island scene for vertical slice testing
    sceneDirector.transition('island');
    gameWorld.set(GamePhase, { phase: 'exploring' });
  })
  .catch((error) => {
    console.error('[Bok] Failed to load runtime:', error);
  });

export { gameWorld, runtime, sceneDirector, content };
