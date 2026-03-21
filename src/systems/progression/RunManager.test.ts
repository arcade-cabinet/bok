import { beforeEach, describe, expect, it } from 'vitest';
import { SaveManager } from '../../persistence/index.ts';
import { RunManager } from './RunManager.ts';
import { TomeProgression } from './TomeProgression.ts';
import { UnlockTracker } from './UnlockTracker.ts';

describe('RunManager', () => {
  let save: SaveManager;
  let mgr: RunManager;

  beforeEach(async () => {
    save = await SaveManager.createInMemory();
    mgr = new RunManager(save);
  });

  it('startRun creates run state', () => {
    mgr.startRun('test-seed', 'forest');
    const state = mgr.getRunState();
    expect(state).not.toBeNull();
    expect(state?.seed).toBe('test-seed');
    expect(state?.biome).toBe('forest');
    expect(state?.visitedIslands).toEqual([]);
    expect(state?.bossDefeated).toBe(false);
  });

  it('visitIsland tracks visited islands', () => {
    mgr.startRun('seed-1', 'forest');
    mgr.visitIsland('island-a');
    mgr.visitIsland('island-b');
    const state = mgr.getRunState();
    expect(state?.visitedIslands).toEqual(['island-a', 'island-b']);
  });

  it('defeatBoss records boss defeated', () => {
    mgr.startRun('seed-2', 'forest');
    mgr.defeatBoss();
    const state = mgr.getRunState();
    expect(state?.bossDefeated).toBe(true);
  });

  it('endRun with victory persists result', async () => {
    mgr.startRun('seed-v', 'forest');
    mgr.defeatBoss();
    await mgr.endRun('victory');
    const runs = await save.getRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0].result).toBe('victory');
    expect(runs[0].seed).toBe('seed-v');
    expect(runs[0].biomes).toEqual(['forest']);
  });

  it('endRun with death persists result', async () => {
    mgr.startRun('seed-d', 'desert');
    await mgr.endRun('death');
    const runs = await save.getRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0].result).toBe('death');
    expect(runs[0].seed).toBe('seed-d');
  });

  it('endRun clears run state', async () => {
    mgr.startRun('seed-x', 'forest');
    await mgr.endRun('abandoned');
    expect(mgr.getRunState()).toBeNull();
  });

  it('getElapsedTime tracks duration', () => {
    mgr.startRun('seed-t', 'forest');
    // Elapsed time should be >= 0
    expect(mgr.getElapsedTime()).toBeGreaterThanOrEqual(0);
  });
});

describe('UnlockTracker', () => {
  let save: SaveManager;
  let tracker: UnlockTracker;

  beforeEach(async () => {
    save = await SaveManager.createInMemory();
    tracker = new UnlockTracker(save);
  });

  it('unlock and check isUnlocked', async () => {
    expect(await tracker.isUnlocked('desert')).toBe(false);
    await tracker.unlock('desert', 'biome', { name: 'desert' });
    expect(await tracker.isUnlocked('desert')).toBe(true);
  });

  it('getAll returns all unlocks', async () => {
    await tracker.unlock('desert', 'biome', { name: 'desert' });
    await tracker.unlock('dash', 'tome_page', { ability: 'dash' });
    const all = await tracker.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((u) => u.id).sort()).toEqual(['dash', 'desert']);
  });
});

describe('TomeProgression', () => {
  let save: SaveManager;
  let tome: TomeProgression;

  beforeEach(async () => {
    save = await SaveManager.createInMemory();
    tome = new TomeProgression(save);
  });

  it('unlockPage adds a tome page', async () => {
    await tome.unlockPage('dash');
    const pages = await tome.getUnlockedPages();
    expect(pages).toContain('dash');
  });

  it('isPageUnlocked checks presence', async () => {
    expect(await tome.isPageUnlocked('fireball')).toBe(false);
    await tome.unlockPage('fireball');
    expect(await tome.isPageUnlocked('fireball')).toBe(true);
  });

  it('does not duplicate pages', async () => {
    await tome.unlockPage('dash');
    await tome.unlockPage('dash');
    const pages = await tome.getUnlockedPages();
    // Should still have exactly one 'dash' entry
    expect(pages.filter((p) => p === 'dash')).toHaveLength(1);
  });
});
