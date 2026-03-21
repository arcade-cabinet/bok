import { describe, expect, it } from 'vitest';
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
