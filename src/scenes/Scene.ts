import type { World } from 'koota';

/**
 * Abstract base class for all game scenes.
 * Each scene receives references to the Koota world and JollyPixel runtime.
 */
export abstract class Scene {
  readonly name: string;
  protected world: World;
  protected runtime: unknown; // JollyPixel Runtime — typed loosely until wired

  constructor(name: string, world: World, runtime: unknown) {
    this.name = name;
    this.world = world;
    this.runtime = runtime;
  }

  /** Called when this scene becomes active. */
  abstract enter(): void | Promise<void>;

  /** Called every frame while this scene is active. */
  abstract update(dt: number): void;

  /** Called when transitioning away from this scene. */
  abstract exit(): void;
}
