/**
 * @module engine/engineSnapshot
 * @role Extract game state from a running engine into a serializable snapshot
 * @input SnapshotSources gathered from combat, camera, enemies, config
 * @output SerializedGameState ready for SaveManager.saveGameState()
 */
import type { SerializedGameState } from '../persistence/GameStateSerializer.ts';

export interface SnapshotSources {
  config: { biome: string; seed: string };
  cameraPosition: { x: number; y: number; z: number };
  combatState: {
    playerHealth: number;
    maxHealth: number;
    killCount: number;
    elapsed: number;
  };
  enemies: Array<{
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    health: number;
    maxHealth: number;
    aiState: string;
  }>;
  inventory: Record<string, number>;
  equippedWeapon: string | null;
  openedChests: string[];
  defeatedBoss: boolean;
}

/**
 * Build a full SerializedGameState from live engine data.
 * Pure function — no side effects or engine dependencies.
 */
export function captureSnapshot(sources: SnapshotSources): SerializedGameState {
  return {
    version: 1,
    timestamp: Date.now(),
    config: sources.config,
    player: {
      position: sources.cameraPosition,
      health: { current: sources.combatState.playerHealth, max: sources.combatState.maxHealth },
      stamina: { current: 100, max: 100 },
      inventory: sources.inventory,
      equippedWeapon: sources.equippedWeapon,
    },
    enemies: sources.enemies.map((e) => ({
      id: e.id,
      type: e.type,
      position: e.position,
      health: { current: e.health, max: e.maxHealth },
      aiState: e.aiState,
    })),
    world: {
      modifiedVoxels: [],
      openedChests: sources.openedChests,
      defeatedBoss: sources.defeatedBoss,
    },
    stats: {
      killCount: sources.combatState.killCount,
      elapsed: sources.combatState.elapsed,
      chestsOpened: sources.openedChests.length,
    },
  };
}
