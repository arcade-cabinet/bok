import { describe, it, expect } from 'vitest';
import { SaveManager, type UnlockRecord, type RunRecord } from './index';

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
