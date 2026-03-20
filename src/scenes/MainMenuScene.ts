import type { World } from 'koota';
import { Scene } from './Scene.ts';

/** Placeholder main menu scene. */
export class MainMenuScene extends Scene {
  constructor(world: World, runtime: unknown) {
    super('mainMenu', world, runtime);
  }

  enter(): void {
    console.log('[MainMenuScene] enter');
  }

  update(dt: number): void {
    void dt;
  }

  exit(): void {
    console.log('[MainMenuScene] exit');
  }
}
