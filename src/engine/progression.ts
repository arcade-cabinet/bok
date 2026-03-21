/**
 * @module engine/progression
 * @role Tracks permanent unlocks and run history via SaveManager
 * @input SaveManager instance (async, SQLite-backed)
 * @output trackBossKill, getUnlockedPages, recordRun, getRunHistory
 */
import { SaveManager, type RunRecord } from '../persistence/index.ts';
import { TomeProgression } from '../systems/progression/TomeProgression.ts';
import { RunManager } from '../systems/progression/RunManager.ts';

export interface ProgressionSystem {
  trackBossKill: (bossId: string, tomeAbility: string) => Promise<void>;
  getUnlockedPages: () => Promise<string[]>;
  recordRun: (seed: string, biome: string, result: 'victory' | 'death' | 'abandoned', duration: number) => Promise<void>;
  getRunHistory: () => Promise<RunRecord[]>;
}

export function createProgression(save: SaveManager): ProgressionSystem {
  const tome = new TomeProgression(save);
  const runs = new RunManager(save);

  return {
    async trackBossKill(bossId: string, tomeAbility: string): Promise<void> {
      await tome.unlockPage(tomeAbility);
      await save.addUnlock({
        id: `boss:${bossId}`,
        type: 'boss_kill',
        data: { bossId, tomeAbility },
      });
    },

    getUnlockedPages(): Promise<string[]> {
      return tome.getUnlockedPages();
    },

    async recordRun(seed: string, biome: string, result: 'victory' | 'death' | 'abandoned', duration: number): Promise<void> {
      await save.addRun({ seed, biomes: [biome], result, duration });
    },

    getRunHistory(): Promise<RunRecord[]> {
      return save.getRuns();
    },
  };
}
