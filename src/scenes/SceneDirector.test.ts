import type { World } from 'koota';
import { createWorld } from 'koota';
import { describe, expect, it, vi } from 'vitest';
import { Scene } from './Scene.ts';
import { SceneDirector } from './SceneDirector.ts';

class TestScene extends Scene {
  enter = vi.fn();
  update = vi.fn();
  exit = vi.fn();

  constructor(name: string, world: World) {
    super(name, world, null);
  }
}

describe('SceneDirector', () => {
  it('starts with no current scene', () => {
    const director = new SceneDirector();
    expect(director.getCurrentScene()).toBeNull();
  });

  it('transitions to initial scene and calls enter', async () => {
    const world = createWorld();
    const director = new SceneDirector();
    const menu = new TestScene('mainMenu', world);

    director.register('mainMenu', menu);
    await director.transition('mainMenu');

    expect(director.getCurrentScene()).toBe('mainMenu');
    expect(menu.enter).toHaveBeenCalledOnce();
    expect(menu.exit).not.toHaveBeenCalled();

    world.destroy();
  });

  it('calls exit on old scene then enter on new scene during transition', async () => {
    const world = createWorld();
    const director = new SceneDirector();
    const menu = new TestScene('mainMenu', world);
    const hub = new TestScene('hub', world);

    const callOrder: string[] = [];
    menu.exit.mockImplementation(() => callOrder.push('menu.exit'));
    hub.enter.mockImplementation(() => callOrder.push('hub.enter'));

    director.register('mainMenu', menu);
    director.register('hub', hub);
    await director.transition('mainMenu');
    await director.transition('hub');

    expect(director.getCurrentScene()).toBe('hub');
    expect(menu.exit).toHaveBeenCalledOnce();
    expect(hub.enter).toHaveBeenCalledOnce();
    expect(callOrder).toEqual(['menu.exit', 'hub.enter']);

    world.destroy();
  });

  it('delegates update to current scene', async () => {
    const world = createWorld();
    const director = new SceneDirector();
    const menu = new TestScene('mainMenu', world);

    director.register('mainMenu', menu);
    await director.transition('mainMenu');
    director.update(0.016);

    expect(menu.update).toHaveBeenCalledWith(0.016);

    world.destroy();
  });

  it('does not call update when no scene is active', () => {
    const director = new SceneDirector();
    // Should not throw
    director.update(0.016);
  });

  it('throws when transitioning to unregistered scene', async () => {
    const director = new SceneDirector();
    await expect(director.transition('hub')).rejects.toThrow('Scene "hub" not registered');
  });
});
