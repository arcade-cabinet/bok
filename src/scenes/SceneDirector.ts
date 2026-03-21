import type { Scene } from './Scene.ts';

export type SceneName = 'mainMenu' | 'hub' | 'islandSelect' | 'sailing' | 'island' | 'bossArena' | 'results';

/**
 * Custom FSM that manages game state transitions.
 *
 * Flow: mainMenu -> hub -> islandSelect -> sailing -> island -> bossArena -> results -> hub
 *
 * Calls exit() on the old scene and enter() on the new scene during transitions.
 */
export class SceneDirector {
  private scenes = new Map<SceneName, Scene>();
  private currentSceneName: SceneName | null = null;
  private currentScene: Scene | null = null;
  private loading = false;

  /** Register a scene by name. */
  register(name: SceneName, scene: Scene): void {
    this.scenes.set(name, scene);
  }

  /** Transition to a new scene. Calls exit() on old, enter() on new. */
  async transition(sceneName: SceneName): Promise<void> {
    const next = this.scenes.get(sceneName);
    if (!next) {
      throw new Error(`[SceneDirector] Scene "${sceneName}" not registered`);
    }

    this.loading = true;

    if (this.currentScene) {
      this.currentScene.exit();
    }

    this.currentSceneName = sceneName;
    this.currentScene = next;
    await next.enter();

    this.loading = false;
  }

  /** Returns the name of the current scene. */
  getCurrentScene(): SceneName | null {
    return this.currentSceneName;
  }

  /** Returns true if a transition is in progress. */
  isLoading(): boolean {
    return this.loading;
  }

  /** Delegates update to the current scene. */
  update(dt: number): void {
    if (this.currentScene && !this.loading) {
      this.currentScene.update(dt);
    }
  }
}
