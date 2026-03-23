/**
 * @module hooks/useGameEvents
 * @role Engine event callbacks: playerDamaged, enemyKilled, bossDefeated, playerDied, lootPickup, chestOpened
 */
import { useCallback, useRef, useState } from 'react';
import type { DamageIndicatorHandle } from '../components/hud/DamageIndicator';
import type { DamageNumber } from '../components/hud/DamageNumbers';
import type { LootItem } from '../components/hud/LootNotification';
import type { DeathStats } from '../components/modals/DeathScreen';
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
  deathStats: DeathStats | null;
  victoryStats: VictoryStats | null;
  unlockedAbilitiesRef: React.RefObject<string[]>;
  startTimeRef: React.RefObject<number>;
  /** Accumulated loot items for LootNotification display */
  lootItems: LootItem[];
  /** Active floating damage numbers */
  damageNumbers: DamageNumber[];
  /** Event handler to pass into useGameLifecycle */
  handleEngineEvent: (event: EngineEvent) => void;
}

/**
 * Manages engine event side-effects: damage flash, kill tracking,
 * loot tracking, chest loot notifications, death/victory stats snapshots, boss ability unlocks.
 */
export function useGameEvents(
  config: { biome: string; seed: string },
  gameRef: React.RefObject<GameInstance | null>,
  setEngineState: React.Dispatch<React.SetStateAction<EngineState | null>>,
  callbacks: GameEventCallbacks,
): GameEventResult {
  const damageRef = useRef<DamageIndicatorHandle>(null);
  const killCountRef = useRef(0);
  const lootCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const unlockedAbilitiesRef = useRef<string[]>([]);
  const [deathStats, setDeathStats] = useState<DeathStats | null>(null);
  const [victoryStats, setVictoryStats] = useState<VictoryStats | null>(null);
  const [lootItems, setLootItems] = useState<LootItem[]>([]);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const dmgIdRef = useRef(0);

  // Auto-remove expired damage numbers (older than 1 second)
  const addDamageNumber = useCallback((value: number) => {
    const id = dmgIdRef.current++;
    // Randomize screen position near center crosshair
    const x = 48 + Math.random() * 4; // 48-52% horizontal
    const y = 42 + Math.random() * 6; // 42-48% vertical
    const now = Date.now();
    setDamageNumbers((prev) => [...prev, { id, value, x, y, timestamp: now }]);
    // Auto-remove after 1 second
    setTimeout(() => {
      setDamageNumbers((prev) => prev.filter((n) => n.id !== id));
    }, 1000);
  }, []);

  // Stable ref for callbacks to avoid stale closures
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const handleEngineEvent = (event: EngineEvent) => {
    if (event.type === 'playerDamaged') {
      damageRef.current?.flash();
    }
    if (event.type === 'attackHit') {
      // Floating damage number + lighter screen shake
      addDamageNumber(event.damage);
      damageRef.current?.lightShake();
    }
    if (event.type === 'enemyKilled') {
      killCountRef.current += 1;
    }
    if (event.type === 'lootPickup') {
      lootCountRef.current += 1;
      // Show pickup in LootNotification
      const displayName = event.itemType
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      setLootItems((prev) => [...prev, { name: displayName, amount: 1 }]);
    }
    if (event.type === 'chestOpened') {
      lootCountRef.current += event.items.length;
      // Show all chest items in LootNotification
      setLootItems((prev) => [...prev, ...event.items]);
    }
    if (event.type === 'resourceGathered') {
      // Show resource pickup in LootNotification with icon prefix
      setLootItems((prev) => [...prev, { name: `${event.resourceIcon} ${event.resourceName}`, amount: event.amount }]);
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
        lootCollected: lootCountRef.current,
        tomePageUnlocked: event.bossId,
        abilityName: event.tomeAbility,
      });
      callbacksRef.current.onBossDefeated?.(event.bossId, event.tomeAbility);
      callbacksRef.current.onRunEnd?.(config.seed, config.biome, 'victory', duration);
    }
    if (event.type === 'playerDied') {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      setDeathStats({
        enemiesDefeated: killCountRef.current,
        timeSurvived: duration,
        biome: config.biome,
        lootCollected: lootCountRef.current,
      });
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
    lootItems,
    damageNumbers,
    handleEngineEvent,
  };
}
