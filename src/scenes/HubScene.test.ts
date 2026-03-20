import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createWorld } from 'koota';
import type { World } from 'koota';
import { HubScene } from './HubScene.ts';
import { SceneDirector } from './SceneDirector.ts';
import { ActionMap } from '../input/index.ts';
import { SaveManager } from '../persistence/index.ts';
import { Position, IsPlayer, MovementIntent, LookIntent } from '../traits/index.ts';

// Mock THREE.js (not available in node test env)
vi.mock('three', () => ({
  PerspectiveCamera: vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() },
    quaternion: { setFromEuler: vi.fn() },
  })),
  Euler: vi.fn().mockImplementation(() => ({
    x: 0,
    y: 0,
    z: 0,
    set: vi.fn(),
  })),
}));

describe('HubScene', () => {
  let world: World;
  let director: SceneDirector;
  let actionMap: ActionMap;
  let saveManager: SaveManager;
  let hubScene: HubScene;

  beforeEach(async () => {
    world = createWorld(MovementIntent, LookIntent);
    world.set(MovementIntent, { dirX: 0, dirZ: 0, sprint: false, jump: false });
    world.set(LookIntent, { deltaX: 0, deltaY: 0 });

    director = new SceneDirector();
    actionMap = ActionMap.desktopDefaults();
    saveManager = await SaveManager.createInMemory();
    hubScene = new HubScene(world, null, director, actionMap, saveManager);
    director.register('hub', hubScene);
  });

  afterEach(() => {
    if (director.getCurrentScene() === 'hub') {
      hubScene.exit();
    }
    world.destroy();
  });

  it('generates fixed terrain on enter', async () => {
    await hubScene.enter();
    expect(hubScene.terrain).not.toBeNull();
    expect(hubScene.terrain!.width).toBe(32);
    expect(hubScene.terrain!.depth).toBe(32);
  });

  it('terrain is deterministic (same seed)', async () => {
    await hubScene.enter();
    const heights1 = hubScene.terrain!.heightmap.map(col => [...col]);
    hubScene.exit();

    await hubScene.enter();
    const heights2 = hubScene.terrain!.heightmap.map(col => [...col]);
    hubScene.exit();

    expect(heights1).toEqual(heights2);
  });

  it('spawns player entity on enter', async () => {
    await hubScene.enter();
    const players = world.query(IsPlayer, Position);
    expect(players.length).toBe(1);
  });

  it('generates structure blocks for all buildings', async () => {
    await hubScene.enter();
    expect(hubScene.structureBlocks.length).toBeGreaterThan(0);
  });

  it('cleans up entities on exit', async () => {
    await hubScene.enter();
    expect(world.query(Position).length).toBeGreaterThan(0);
    hubScene.exit();
    expect(world.query(IsPlayer).length).toBe(0);
  });

  it('detects nearby building when player is close', async () => {
    await hubScene.enter();

    // Move player to armory position (building positions are offset by HUB_SIZE/2)
    const players = world.query(IsPlayer, Position);
    const playerEntity = players[0];
    // Armory is at content position x:10, z:5 → world x:26, z:21
    playerEntity.set(Position, { x: 26, y: 7, z: 21 });

    hubScene.update(0.016);
    // nearbyBuilding should be set
    expect(hubScene.nearbyBuilding).not.toBeNull();
  });

  it('no nearby building when player is far from all buildings', async () => {
    await hubScene.enter();

    // Move player to corner far from all buildings
    const players = world.query(IsPlayer, Position);
    players[0].set(Position, { x: 0, y: 7, z: 0 });

    hubScene.update(0.016);
    expect(hubScene.nearbyBuilding).toBeNull();
  });

  it('dock interaction triggers scene transition', async () => {
    // Register a placeholder islandSelect scene
    const mockScene = { enter: vi.fn(), update: vi.fn(), exit: vi.fn(), name: 'islandSelect' };
    director.register('islandSelect', mockScene as never);
    director.register('hub', hubScene);
    await director.transition('hub');

    // Move player to docks position: content x:-15, z:10 → world x:1, z:26
    const players = world.query(IsPlayer, Position);
    players[0].set(Position, { x: 1, y: 7, z: 26 });

    hubScene.update(0.016); // detect proximity

    // Simulate pressing E
    actionMap.setKeyDown('KeyE');
    hubScene.update(0.016);

    expect(director.getCurrentScene()).toBe('islandSelect');
  });

  it('upgradeBuilding fails without resources', async () => {
    await hubScene.enter();
    const result = hubScene.upgradeBuilding('armory');
    expect(result).toBe(false);
  });

  it('upgradeBuilding succeeds with enough resources', async () => {
    await hubScene.enter();

    // Give player resources
    hubScene.hubState.resources['wood'] = 1000;
    hubScene.hubState.resources['stone'] = 1000;

    const result = hubScene.upgradeBuilding('armory');
    expect(result).toBe(true);
    expect(hubScene.hubState.buildingLevels['armory']).toBe(2);
  });

  it('update delegates player movement', async () => {
    await hubScene.enter();

    const players = world.query(IsPlayer, Position);
    const initialPos = { ...players[0].get(Position)! };

    // Set movement intent
    world.set(MovementIntent, { dirX: 1, dirZ: 0, sprint: false, jump: false });

    hubScene.update(1.0); // 1 second at 6 units/s

    const newPos = players[0].get(Position)!;
    // Player should have moved (exact amount depends on camera euler)
    expect(newPos.x !== initialPos.x || newPos.z !== initialPos.z).toBe(true);
  });
});
