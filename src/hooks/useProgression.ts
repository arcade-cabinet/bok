import { useCallback, useEffect, useRef, useState } from 'react';
import { createProgression, type ProgressionSystem } from '../engine/progression.ts';
import { type RunRecord, SaveManager } from '../persistence/index.ts';

export interface UseProgressionResult {
  ready: boolean;
  unlockedPages: string[];
  /** Newest run first — matches `SaveManager.getRuns()` (ORDER BY timestamp DESC). */
  runHistory: RunRecord[];
  trackBossKill: (bossId: string, tomeAbility: string) => Promise<void>;
  recordRun: (
    seed: string,
    biome: string,
    result: 'victory' | 'death' | 'abandoned',
    duration: number,
  ) => Promise<void>;
}

export function useProgression(): UseProgressionResult {
  const [ready, setReady] = useState(false);
  const [unlockedPages, setUnlockedPages] = useState<string[]>([]);
  const [runHistory, setRunHistory] = useState<RunRecord[]>([]);
  const systemRef = useRef<ProgressionSystem | null>(null);

  useEffect(() => {
    let cancelled = false;

    SaveManager.createInMemory().then(async (save) => {
      if (cancelled) return;
      const system = createProgression(save);
      systemRef.current = system;

      const [pages, runs] = await Promise.all([system.getUnlockedPages(), system.getRunHistory()]);
      if (cancelled) return;

      setUnlockedPages(pages);
      setRunHistory(runs);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    const system = systemRef.current;
    if (!system) return;
    const [pages, runs] = await Promise.all([system.getUnlockedPages(), system.getRunHistory()]);
    setUnlockedPages(pages);
    setRunHistory(runs);
  }, []);

  const trackBossKill = useCallback(
    async (bossId: string, tomeAbility: string) => {
      const system = systemRef.current;
      if (!system) return;
      await system.trackBossKill(bossId, tomeAbility);
      await refresh();
    },
    [refresh],
  );

  const recordRun = useCallback(
    async (seed: string, biome: string, result: 'victory' | 'death' | 'abandoned', duration: number) => {
      const system = systemRef.current;
      if (!system) return;
      await system.recordRun(seed, biome, result, duration);
      await refresh();
    },
    [refresh],
  );

  return { ready, unlockedPages, runHistory, trackBossKill, recordRun };
}
