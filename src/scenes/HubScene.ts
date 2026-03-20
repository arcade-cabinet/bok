import type { World } from 'koota';
import { Scene } from './Scene.ts';

/** Placeholder hub scene. */
export class HubScene extends Scene {
  constructor(world: World, runtime: unknown) {
    super('hub', world, runtime);
  }

  enter(): void {
    console.log('[HubScene] enter');
  }

  update(dt: number): void {
    void dt;
  }

  exit(): void {
    console.log('[HubScene] exit');
  }
}
