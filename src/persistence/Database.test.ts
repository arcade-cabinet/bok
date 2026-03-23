import { describe, expect, it } from 'vitest';
import type { SerializedGameState } from './GameStateSerializer.ts';
import { SaveManager } from './index';

describe('SaveManager (mock)', () => {
  it('records an unlock', async () => {
    const mgr = await SaveManager.createInMemory();
    await mgr.addUnlock({ id: 'dash', type: 'tome_page', data: { ability: 'dash' } });
    const unlocks = await mgr.getUnlocks();
    expect(unlocks).toHaveLength(1);
    expect(unlocks[0].id).toBe('dash');
  });

  it('records a run', async () => {
    const mgr = await SaveManager.createInMemory();
    await mgr.addRun({ seed: 'test-seed', biomes: ['forest'], result: 'victory', duration: 300 });
    const runs = await mgr.getRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0].result).toBe('victory');
  });

  it('returns runs newest-first', async () => {
    const mgr = await SaveManager.createInMemory();
    await mgr.addRun({ seed: 'older', biomes: ['forest'], result: 'victory', duration: 1 });
    await new Promise((r) => setTimeout(r, 2));
    await mgr.addRun({ seed: 'newer', biomes: ['desert'], result: 'death', duration: 2 });
    const runs = await mgr.getRuns();
    expect(runs).toHaveLength(2);
    expect(runs[0].seed).toBe('newer');
    expect(runs[1].seed).toBe('older');
  });

  it('saves and loads game state', async () => {
    const mgr = await SaveManager.createInMemory();
    const state = { koota: { entities: [] }, yuka: {}, scene: 'island' };
    await mgr.saveState(state);
    const loaded = await mgr.loadState();
    expect(loaded?.scene).toBe('island');
  });

  it('returns null when no save state exists', async () => {
    const mgr = await SaveManager.createInMemory();
    expect(await mgr.loadState()).toBeNull();
  });
});

function makeTestGameState(): SerializedGameState {
  return {
    version: 1,
    timestamp: Date.now(),
    config: { biome: 'forest', seed: 'test-seed' },
    player: {
      position: { x: 0, y: 5, z: 0 },
      health: { current: 80, max: 100 },
      stamina: { current: 50, max: 100 },
      inventory: { wood: 5 },
      equippedWeapon: 'iron_sword',
    },
    enemies: [
      {
        id: 'e1',
        type: 'skeleton',
        position: { x: 10, y: 5, z: 10 },
        health: { current: 30, max: 50 },
        aiState: 'patrol',
      },
    ],
    world: {
      modifiedVoxels: [{ x: 1, y: 2, z: 3, blockId: 7 }],
      openedChests: ['chest-a'],
      defeatedBoss: false,
    },
    stats: { killCount: 3, elapsed: 120, chestsOpened: 1 },
  };
}

describe('SaveManager mid-run save', () => {
  it('saves and loads a SerializedGameState', async () => {
    const mgr = await SaveManager.createInMemory();
    const state = makeTestGameState();
    await mgr.saveGameState(state);
    const loaded = await mgr.loadGameState();
    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe(1);
    expect(loaded?.config.biome).toBe('forest');
    expect(loaded?.player.health.current).toBe(80);
    expect(loaded?.enemies).toHaveLength(1);
    expect(loaded?.stats.killCount).toBe(3);
  });

  it('hasSavedGame returns false when no save exists', async () => {
    const mgr = await SaveManager.createInMemory();
    expect(await mgr.hasSavedGame()).toBe(false);
  });

  it('hasSavedGame returns true after saving', async () => {
    const mgr = await SaveManager.createInMemory();
    await mgr.saveGameState(makeTestGameState());
    expect(await mgr.hasSavedGame()).toBe(true);
  });

  it('clearGameState removes the save', async () => {
    const mgr = await SaveManager.createInMemory();
    await mgr.saveGameState(makeTestGameState());
    expect(await mgr.hasSavedGame()).toBe(true);
    await mgr.clearGameState();
    expect(await mgr.hasSavedGame()).toBe(false);
    expect(await mgr.loadGameState()).toBeNull();
  });

  it('loadGameState returns null when no save exists', async () => {
    const mgr = await SaveManager.createInMemory();
    expect(await mgr.loadGameState()).toBeNull();
  });

  it('saveGameState overwrites previous save', async () => {
    const mgr = await SaveManager.createInMemory();
    const state1 = makeTestGameState();
    state1.player.health.current = 50;
    await mgr.saveGameState(state1);

    const state2 = makeTestGameState();
    state2.player.health.current = 90;
    await mgr.saveGameState(state2);

    const loaded = await mgr.loadGameState();
    expect(loaded?.player.health.current).toBe(90);
  });
});

describe('SaveManager game saves', () => {
  it('createGame stores seed and mode', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('Brave Dark Fox', 'survival');
    expect(game.seed).toBe('Brave Dark Fox');
    expect(game.mode).toBe('survival');
    expect(game.id).toBeGreaterThan(0);
    expect(game.createdAt).toBeGreaterThan(0);
    expect(game.lastPlayedAt).toBe(game.createdAt);
  });

  it('loadGame retrieves a saved game by id', async () => {
    const mgr = await SaveManager.createInMemory();
    const created = await mgr.createGame('test-seed', 'creative');
    const loaded = await mgr.loadGame(created.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.seed).toBe('test-seed');
    expect(loaded?.mode).toBe('creative');
    expect(loaded?.id).toBe(created.id);
  });

  it('loadGame returns null for non-existent id', async () => {
    const mgr = await SaveManager.createInMemory();
    const loaded = await mgr.loadGame(999);
    expect(loaded).toBeNull();
  });

  it('listGames returns all saves newest-first', async () => {
    const mgr = await SaveManager.createInMemory();
    await mgr.createGame('first', 'survival');
    await new Promise((r) => setTimeout(r, 2));
    await mgr.createGame('second', 'creative');
    const games = await mgr.listGames();
    expect(games).toHaveLength(2);
    expect(games[0].seed).toBe('second');
    expect(games[1].seed).toBe('first');
  });

  it('listGames returns empty array when no saves exist', async () => {
    const mgr = await SaveManager.createInMemory();
    const games = await mgr.listGames();
    expect(games).toHaveLength(0);
  });

  it('deleteGame removes the save', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('doomed', 'survival');
    await mgr.deleteGame(game.id);
    const loaded = await mgr.loadGame(game.id);
    expect(loaded).toBeNull();
    const games = await mgr.listGames();
    expect(games).toHaveLength(0);
  });

  it('deleteGame also removes associated island states', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('doomed', 'survival');
    await mgr.updateIslandState({
      saveId: game.id,
      biomeId: 'forest',
      goalsCompleted: ['goal1'],
      bossDefeated: false,
    });
    await mgr.deleteGame(game.id);
    const island = await mgr.getIslandState(game.id, 'forest');
    expect(island).toBeNull();
  });

  it('createGame assigns unique ids to multiple saves', async () => {
    const mgr = await SaveManager.createInMemory();
    const g1 = await mgr.createGame('one', 'survival');
    const g2 = await mgr.createGame('two', 'creative');
    expect(g1.id).not.toBe(g2.id);
  });
});

describe('SaveManager island state', () => {
  it('getIslandState returns null for unvisited island', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('test', 'survival');
    const state = await mgr.getIslandState(game.id, 'desert');
    expect(state).toBeNull();
  });

  it('updateIslandState persists goal progress', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('test', 'survival');
    await mgr.updateIslandState({
      saveId: game.id,
      biomeId: 'forest',
      goalsCompleted: ['discover_shrine', 'defeat_enemies'],
      bossDefeated: false,
    });
    const state = await mgr.getIslandState(game.id, 'forest');
    expect(state).not.toBeNull();
    expect(state?.goalsCompleted).toEqual(['discover_shrine', 'defeat_enemies']);
    expect(state?.bossDefeated).toBe(false);
  });

  it('updateIslandState tracks boss defeat', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('test', 'survival');
    await mgr.updateIslandState({
      saveId: game.id,
      biomeId: 'forest',
      goalsCompleted: ['discover_shrine', 'defeat_enemies', 'collect_treasures'],
      bossDefeated: true,
    });
    const state = await mgr.getIslandState(game.id, 'forest');
    expect(state?.bossDefeated).toBe(true);
  });

  it('updateIslandState overwrites previous state', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('test', 'survival');
    await mgr.updateIslandState({
      saveId: game.id,
      biomeId: 'forest',
      goalsCompleted: ['goal1'],
      bossDefeated: false,
    });
    await mgr.updateIslandState({
      saveId: game.id,
      biomeId: 'forest',
      goalsCompleted: ['goal1', 'goal2'],
      bossDefeated: true,
    });
    const state = await mgr.getIslandState(game.id, 'forest');
    expect(state?.goalsCompleted).toEqual(['goal1', 'goal2']);
    expect(state?.bossDefeated).toBe(true);
  });

  it('island states are isolated between saves', async () => {
    const mgr = await SaveManager.createInMemory();
    const g1 = await mgr.createGame('world-a', 'survival');
    const g2 = await mgr.createGame('world-b', 'survival');
    await mgr.updateIslandState({
      saveId: g1.id,
      biomeId: 'forest',
      goalsCompleted: ['goal-a'],
      bossDefeated: true,
    });
    await mgr.updateIslandState({
      saveId: g2.id,
      biomeId: 'forest',
      goalsCompleted: [],
      bossDefeated: false,
    });
    const s1 = await mgr.getIslandState(g1.id, 'forest');
    const s2 = await mgr.getIslandState(g2.id, 'forest');
    expect(s1?.goalsCompleted).toEqual(['goal-a']);
    expect(s1?.bossDefeated).toBe(true);
    expect(s2?.goalsCompleted).toEqual([]);
    expect(s2?.bossDefeated).toBe(false);
  });

  it('island states are isolated between biomes', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('test', 'survival');
    await mgr.updateIslandState({
      saveId: game.id,
      biomeId: 'forest',
      goalsCompleted: ['goal1'],
      bossDefeated: true,
    });
    await mgr.updateIslandState({
      saveId: game.id,
      biomeId: 'desert',
      goalsCompleted: [],
      bossDefeated: false,
    });
    const forest = await mgr.getIslandState(game.id, 'forest');
    const desert = await mgr.getIslandState(game.id, 'desert');
    expect(forest?.bossDefeated).toBe(true);
    expect(desert?.bossDefeated).toBe(false);
  });
});

describe('SaveManager inventory', () => {
  it('getInventory returns empty object for new save', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('test', 'survival');
    const inv = await mgr.getInventory(game.id);
    expect(inv).toEqual({});
  });

  it('setResource stores and retrieves a resource', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('test', 'survival');
    await mgr.setResource(game.id, 'wood', 50);
    const inv = await mgr.getInventory(game.id);
    expect(inv.wood).toBe(50);
  });

  it('setResource overwrites existing amount', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('test', 'survival');
    await mgr.setResource(game.id, 'wood', 50);
    await mgr.setResource(game.id, 'wood', 200);
    const inv = await mgr.getInventory(game.id);
    expect(inv.wood).toBe(200);
  });

  it('addResource increments existing amount', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('test', 'survival');
    await mgr.setResource(game.id, 'stone', 100);
    await mgr.addResource(game.id, 'stone', 25);
    const inv = await mgr.getInventory(game.id);
    expect(inv.stone).toBe(125);
  });

  it('addResource creates resource if it does not exist', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('test', 'survival');
    await mgr.addResource(game.id, 'iron-ore', 10);
    const inv = await mgr.getInventory(game.id);
    expect(inv['iron-ore']).toBe(10);
  });

  it('addResource clamps to zero on negative result', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('test', 'survival');
    await mgr.setResource(game.id, 'wood', 5);
    await mgr.addResource(game.id, 'wood', -100);
    const inv = await mgr.getInventory(game.id);
    // amount 0 is excluded by getInventory
    expect(inv.wood).toBeUndefined();
  });

  it('getInventory excludes resources with amount 0', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('test', 'survival');
    await mgr.setResource(game.id, 'wood', 0);
    await mgr.setResource(game.id, 'stone', 50);
    const inv = await mgr.getInventory(game.id);
    expect(inv.wood).toBeUndefined();
    expect(inv.stone).toBe(50);
  });

  it('multiple resources persist independently', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('test', 'survival');
    await mgr.setResource(game.id, 'wood', 100);
    await mgr.setResource(game.id, 'stone', 75);
    await mgr.setResource(game.id, 'iron-ore', 12);
    const inv = await mgr.getInventory(game.id);
    expect(inv).toEqual({ wood: 100, stone: 75, 'iron-ore': 12 });
  });

  it('inventories are isolated between saves', async () => {
    const mgr = await SaveManager.createInMemory();
    const g1 = await mgr.createGame('world-a', 'survival');
    const g2 = await mgr.createGame('world-b', 'creative');
    await mgr.setResource(g1.id, 'wood', 999);
    await mgr.setResource(g2.id, 'wood', 1);
    const inv1 = await mgr.getInventory(g1.id);
    const inv2 = await mgr.getInventory(g2.id);
    expect(inv1.wood).toBe(999);
    expect(inv2.wood).toBe(1);
  });

  it('deleteGame removes associated inventory', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('doomed', 'survival');
    await mgr.setResource(game.id, 'wood', 100);
    await mgr.setResource(game.id, 'stone', 50);
    await mgr.deleteGame(game.id);
    const inv = await mgr.getInventory(game.id);
    expect(inv).toEqual({});
  });

  it('save and load inventory round-trip', async () => {
    const mgr = await SaveManager.createInMemory();
    const game = await mgr.createGame('round-trip', 'survival');
    // Simulate what usePlayerInventory does: set defaults then mutate
    await mgr.setResource(game.id, 'wood', 100);
    await mgr.setResource(game.id, 'stone', 100);
    await mgr.addResource(game.id, 'wood', 50);
    await mgr.addResource(game.id, 'stone', -30);

    // Simulate re-mount: fresh getInventory call
    const loaded = await mgr.getInventory(game.id);
    expect(loaded.wood).toBe(150);
    expect(loaded.stone).toBe(70);
  });
});
