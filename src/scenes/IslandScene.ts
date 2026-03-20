import type { World } from 'koota';
import { Scene } from './Scene.ts';

/** Placeholder island scene. */
export class IslandScene extends Scene {
  constructor(world: World, runtime: unknown) {
    super('island', world, runtime);
  }

  enter(): void {
    console.log('[IslandScene] enter');
  }

  update(dt: number): void {
    void dt;
  }

  exit(): void {
    console.log('[IslandScene] exit');
  }
}
