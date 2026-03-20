import type { World } from 'koota';
import { Scene } from './Scene.ts';

/** Placeholder boss arena scene. */
export class BossArenaScene extends Scene {
  constructor(world: World, runtime: unknown) {
    super('bossArena', world, runtime);
  }

  enter(): void {
    console.log('[BossArenaScene] enter');
  }

  update(dt: number): void {
    void dt;
  }

  exit(): void {
    console.log('[BossArenaScene] exit');
  }
}
