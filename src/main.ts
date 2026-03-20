import { Runtime, loadRuntime } from '@jolly-pixel/runtime';
import { createWorld } from 'koota';
import {
  Time, GamePhase, MovementIntent, LookIntent, IslandState,
} from './traits/index.ts';
import { InputSystem } from './input/index.ts';
import { ContentRegistry } from './content/index.ts';
import { SceneDirector } from './scenes/SceneDirector.ts';
import { MainMenuScene } from './scenes/MainMenuScene.ts';
import { HubScene } from './scenes/HubScene.ts';
import { IslandScene } from './scenes/IslandScene.ts';
import { BossArenaScene } from './scenes/BossArenaScene.ts';

// --- Canvas ---
const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) throw new Error('Canvas element not found');

// --- Koota World (single source of truth) ---
const gameWorld = createWorld(Time, GamePhase, MovementIntent, LookIntent, IslandState);

// --- Content Registry (Zod-validated JSON configs) ---
const content = new ContentRegistry();

// --- JollyPixel Runtime (owns render loop) ---
const runtime = new Runtime(canvas, {
  includePerformanceStats: import.meta.env.DEV,
});

// --- Input System ---
const inputSystem = new InputSystem(canvas);

// --- Scene Director ---
const sceneDirector = new SceneDirector();
sceneDirector.register('mainMenu', new MainMenuScene(gameWorld, runtime));
sceneDirector.register('hub', new HubScene(gameWorld, runtime));
sceneDirector.register('island', new IslandScene(gameWorld, runtime, content));
sceneDirector.register('bossArena', new BossArenaScene(gameWorld, runtime));

// --- Frame Loop (wired into JollyPixel's update) ---
runtime.world.on('beforeUpdate', (dt: number) => {
  // 1. Update Time world trait
  const prevTime = gameWorld.get(Time);
  gameWorld.set(Time, {
    delta: dt,
    elapsed: (prevTime?.elapsed ?? 0) + dt,
  });

  // 2. Poll input → write PlayerIntent traits
  inputSystem.update(gameWorld);

  // 3-7. Delegate to active scene (movement, AI, combat, physics, render sync)
  sceneDirector.update(dt);
});

// --- Boot ---
loadRuntime(runtime)
  .then(() => {
    console.log('[Bok] Runtime loaded — starting game');
    // Start at island scene directly for vertical slice
    sceneDirector.transition('island');
    gameWorld.set(GamePhase, { phase: 'exploring' });
  })
  .catch((error) => {
    console.error('[Bok] Failed to load runtime:', error);
  });

export { gameWorld, runtime, sceneDirector, content };
