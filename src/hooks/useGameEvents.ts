/**
 * @module hooks/useGameEvents
 * @role Engine event callbacks: playerDamaged, enemyKilled, bossDefeated, playerDied
 */
import { useRef, useState } from 'react';
import type { DamageIndicatorHandle } from '../components/hud/DamageIndicator';
import type { VictoryStats } from '../components/modals/VictoryScreen';
import type { GameInstance } from '../engine/GameEngine';
import type { EngineEvent, EngineState } from '../engine/types';

export interface GameEventCallbacks {
  onBossDefeated?: (bossId: string, tomeAbility: string) => Promise<void>;
  onRunEnd?: (
    seed: string,
    biome: string,
    result: 'victory' | 'death' | 'abandoned',
    duration: number,
  ) => Promise<void>;
}

export interface GameEventResult {
  damageRef: React.RefObject<DamageIndicatorHandle | null>;
  killCountRef: React.RefObject<number>;
  deathStats: { enemiesDefeated: number; timeSurvived: number; biome: string } | null;
  victoryStats: VictoryStats | null;
  unlockedAbilitiesRef: React.RefObject<string[]>;
  startTimeRef: React.RefObject<number>;
  /** Event handler to pass into useGameLifecycle */
  handleEngineEvent: (event: EngineEvent) => void;
}

/**
 * Manages engine event side-effects: damage flash, kill tracking,
 * death/victory stats snapshots, boss ability unlocks.
 */
export function useGameEvents(
  config: { biome: string; seed: string },
  gameRef: React.RefObject<GameInstance | null>,
  setEngineState: React.Dispatch<React.SetStateAction<EngineState | null>>,
  callbacks: GameEventCallbacks,
): GameEventResult {
  const damageRef = useRef<DamageIndicatorHandle>(null);
  const killCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const unlockedAbilitiesRef = useRef<string[]>([]);
  const [deathStats, setDeathStats] = useState<{ enemiesDefeated: number; timeSurvived: number; biome: string } | null>(
    null,
  );
  const [victoryStats, setVictoryStats] = useState<VictoryStats | null>(null);

  // Stable ref for callbacks to avoid stale closures
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const handleEngineEvent = (event: EngineEvent) => {
    if (event.type === 'playerDamaged') {
      damageRef.current?.flash();
    }
    if (event.type === 'enemyKilled') {
      killCountRef.current += 1;
    }
    if (event.type === 'playerDied' || event.type === 'bossDefeated') {
      const game = gameRef.current;
      if (game) setEngineState(game.getState());
    }
    if (event.type === 'bossDefeated') {
      if (!unlockedAbilitiesRef.current.includes(event.tomeAbility)) {
        unlockedAbilitiesRef.current = [...unlockedAbilitiesRef.current, event.tomeAbility];
      }
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      setVictoryStats({
        biome: config.biome,
        enemiesDefeated: killCountRef.current,
        timeSurvived: duration,
        tomePageUnlocked: event.bossId,
        abilityName: event.tomeAbility,
      });
      callbacksRef.current.onBossDefeated?.(event.bossId, event.tomeAbility);
      callbacksRef.current.onRunEnd?.(config.seed, config.biome, 'victory', duration);
    }
    if (event.type === 'playerDied') {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      setDeathStats({ enemiesDefeated: killCountRef.current, timeSurvived: duration, biome: config.biome });
      callbacksRef.current.onRunEnd?.(config.seed, config.biome, 'death', duration);
    }
  };

  return {
    damageRef,
    killCountRef,
    deathStats,
    victoryStats,
    unlockedAbilitiesRef,
    startTimeRef,
    handleEngineEvent,
  };
}
