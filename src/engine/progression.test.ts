import { describe, expect, it } from 'vitest';
import { SaveManager } from '../persistence/SaveManager';
import { createProgression } from './progression';

describe('ProgressionSystem', () => {
  it('tracks boss kills and unlocks tome pages', async () => {
    const save = await SaveManager.createInMemory();
    const prog = createProgression(save);

    await prog.trackBossKill('ancient-treant', 'dash');
    const pages = await prog.getUnlockedPages();
    expect(pages).toContain('dash');
  });

  it('records run history', async () => {
    const save = await SaveManager.createInMemory();
    const prog = createProgression(save);

    await prog.recordRun('seed1', 'forest', 'victory', 120);
    await prog.recordRun('seed2', 'desert', 'death', 60);

    const runs = await prog.getRunHistory();
    expect(runs).toHaveLength(2);
    // Runs may be in any order; check both exist
    const results = runs.map((r) => r.result).sort();
    expect(results).toEqual(['death', 'victory']);
  });

  it('returns empty arrays when no progress exists', async () => {
    const save = await SaveManager.createInMemory();
    const prog = createProgression(save);

    const pages = await prog.getUnlockedPages();
    expect(pages).toEqual([]);

    const runs = await prog.getRunHistory();
    expect(runs).toEqual([]);
  });

  it('multiple boss kills accumulate tome pages', async () => {
    const save = await SaveManager.createInMemory();
    const prog = createProgression(save);

    await prog.trackBossKill('ancient-treant', 'dash');
    await prog.trackBossKill('pharaoh-construct', 'sandstorm');
    await prog.trackBossKill('frost-wyrm', 'ice-shield');

    const pages = await prog.getUnlockedPages();
    expect(pages).toHaveLength(3);
    expect(pages).toContain('dash');
    expect(pages).toContain('sandstorm');
    expect(pages).toContain('ice-shield');
  });
});
