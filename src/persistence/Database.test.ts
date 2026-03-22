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
