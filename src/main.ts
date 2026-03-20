import { Runtime, loadRuntime } from '@jolly-pixel/runtime';
import { createWorld } from 'koota';
import { Time, GamePhase, MovementIntent, LookIntent } from './traits/index.ts';
import { InputSystem } from './input/index.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) throw new Error('Canvas element not found');

// Koota world — single source of truth
const gameWorld = createWorld(Time, GamePhase, MovementIntent, LookIntent);

// JollyPixel runtime — owns render loop
const runtime = new Runtime(canvas, {
  includePerformanceStats: import.meta.env.DEV,
});

// Input system
const inputSystem = new InputSystem(canvas);

// Wire into JollyPixel's update loop
runtime.world.on('beforeUpdate', (dt) => {
  gameWorld.set(Time, { delta: dt, elapsed: (gameWorld.get(Time)?.elapsed ?? 0) + dt });
  inputSystem.update(gameWorld);
});

loadRuntime(runtime)
  .then(() => {
    console.log('[Bok] Runtime loaded — Koota world ready');
  })
  .catch((error) => {
    console.error('[Bok] Failed to load runtime:', error);
  });

export { gameWorld, runtime };
