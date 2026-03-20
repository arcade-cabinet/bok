import { Runtime, loadRuntime } from '@jolly-pixel/runtime';
import { createWorld } from 'koota';
import {
  Time, GamePhase, MovementIntent, LookIntent, IslandState,
} from './traits/index.ts';
import { MAX_DELTA } from './shared/index.ts';
import { InputSystem } from './input/index.ts';
import { ContentRegistry } from './content/index.ts';
import { SaveManager } from './persistence/index.ts';
import {
  SceneDirector, MainMenuScene, HubScene, IslandSelectScene,
  SailingScene, IslandScene, BossArenaScene, ResultsScene,
} from './scenes/index.ts';

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
//
// MovementIntent and LookIntent are registered as WORLD-LEVEL singletons
// (not per-entity traits) because this is a single-player game with one
// controlled character. The InputSystem writes these once per frame, and
// the active scene reads them for the player entity. This avoids querying
// for the player entity just to read input, and simplifies the data flow.
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

// H11: Register ALL scenes
sceneDirector.register('mainMenu', new MainMenuScene(gameWorld, runtime));

// HubScene requires SceneDirector + ActionMap + SaveManager
SaveManager.createInMemory().then((saveManager) => {
  sceneDirector.register('hub', new HubScene(
    gameWorld, runtime, sceneDirector, inputSystem.actionMap, saveManager,
  ));
});

sceneDirector.register('islandSelect', new IslandSelectScene(gameWorld, runtime, sceneDirector));
sceneDirector.register('sailing', new SailingScene(gameWorld, runtime, sceneDirector));
sceneDirector.register('island', new IslandScene(gameWorld, runtime, content, inputSystem, sceneDirector));
sceneDirector.register('bossArena', new BossArenaScene(gameWorld, runtime));
sceneDirector.register('results', new ResultsScene(gameWorld, runtime, sceneDirector));

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

  // 2. Poll input -> write MovementIntent/LookIntent/attack actions
  inputSystem.update(gameWorld);

  // 3+. Delegate to active scene (AI, movement, combat, physics, render sync)
  sceneDirector.update(dt);
});

// --- Boot ---
loadRuntime(runtime)
  .then(() => {
    console.log('[Bok] Runtime loaded — starting main menu');
    sceneDirector.transition('mainMenu');
    gameWorld.set(GamePhase, { phase: 'menu' });
  })
  .catch((error) => {
    console.error('[Bok] Failed to load runtime:', error);
  });

export { gameWorld, runtime, sceneDirector, content };
