/**
 * Mid-run save serialization — data contract for saving/restoring
 * full game state between sessions.
 *
 * The actual extraction from Koota entities + Yuka AI + engine state
 * will be wired when the engine exposes snapshot APIs. This module
 * defines the shape, validates it, and handles round-trip serialization.
 */

export interface SerializedPlayerState {
  position: { x: number; y: number; z: number };
  health: { current: number; max: number };
  stamina: { current: number; max: number };
  inventory: Record<string, number>;
  equippedWeapon: string | null;
}

export interface SerializedEnemyState {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  health: { current: number; max: number };
  aiState: string;
}

export interface SerializedWorldState {
  modifiedVoxels: Array<{ x: number; y: number; z: number; blockId: number }>;
  openedChests: string[];
  defeatedBoss: boolean;
}

export interface SerializedRunStats {
  killCount: number;
  elapsed: number;
  chestsOpened: number;
}

export interface SerializedGameState {
  version: 1;
  timestamp: number;
  config: { biome: string; seed: string };
  player: SerializedPlayerState;
  enemies: SerializedEnemyState[];
  world: SerializedWorldState;
  stats: SerializedRunStats;
}

/**
 * Type guard — validates that `data` conforms to the SerializedGameState contract.
 * Checks structural shape, not exhaustive field types (kept fast for hot paths).
 */
export function validateGameState(data: unknown): data is SerializedGameState {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (d.version !== 1) return false;
  if (typeof d.timestamp !== 'number') return false;

  // Config
  if (!d.config || typeof d.config !== 'object') return false;
  const config = d.config as Record<string, unknown>;
  if (typeof config.biome !== 'string' || typeof config.seed !== 'string') return false;

  // Player
  if (!d.player || typeof d.player !== 'object') return false;
  const player = d.player as Record<string, unknown>;
  if (!player.position || typeof player.position !== 'object') return false;
  if (!player.health || typeof player.health !== 'object') return false;
  if (!player.stamina || typeof player.stamina !== 'object') return false;
  if (typeof player.inventory !== 'object' || player.inventory === null) return false;

  // Enemies
  if (!Array.isArray(d.enemies)) return false;

  // World
  if (!d.world || typeof d.world !== 'object') return false;
  const world = d.world as Record<string, unknown>;
  if (!Array.isArray(world.modifiedVoxels)) return false;
  if (!Array.isArray(world.openedChests)) return false;
  if (typeof world.defeatedBoss !== 'boolean') return false;

  // Stats
  if (!d.stats || typeof d.stats !== 'object') return false;
  const stats = d.stats as Record<string, unknown>;
  if (typeof stats.killCount !== 'number') return false;
  if (typeof stats.elapsed !== 'number') return false;
  if (typeof stats.chestsOpened !== 'number') return false;

  return true;
}

/**
 * Serialize game state to a JSON string for database storage.
 */
export function stringifyGameState(state: SerializedGameState): string {
  return JSON.stringify(state);
}

/**
 * Parse a JSON string back into a validated SerializedGameState.
 * Returns null if parsing fails or the data is invalid.
 */
export function parseGameState(json: string): SerializedGameState | null {
  try {
    const data: unknown = JSON.parse(json);
    if (validateGameState(data)) return data;
    return null;
  } catch {
    return null;
  }
}
