import { Runtime, loadRuntime } from '@jolly-pixel/runtime';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) throw new Error('Canvas element not found');

const runtime = new Runtime(canvas, {
  includePerformanceStats: import.meta.env.DEV,
});

loadRuntime(runtime)
  .then(() => {
    console.log('[Bok] Runtime loaded');
  })
  .catch((error) => {
    console.error('[Bok] Failed to load runtime:', error);
  });
