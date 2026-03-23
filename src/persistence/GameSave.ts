/**
 * @module persistence/GameSave
 * @role Type definitions for game saves and per-island state
 *
 * A GameSave is created once when the player starts a new game.
 * The seed and mode are immutable for the life of the save.
 * IslandState tracks per-island progression (goals, boss status).
 */

/** A single game save — seed and mode are immutable after creation. */
export interface GameSave {
  /** Auto-increment primary key */
  id: number;
  /** World generation seed — determines ALL procedural generation */
  seed: string;
  /** Game mode — locked for the life of this save */
  mode: 'creative' | 'survival';
  /** Unix timestamp (ms) when the save was created */
  createdAt: number;
  /** Unix timestamp (ms) of the last play session */
  lastPlayedAt: number;
}

/** Per-island progression state within a game save. */
export interface IslandState {
  /** Foreign key to GameSave.id */
  saveId: number;
  /** Biome identifier (e.g. 'forest', 'desert') */
  biomeId: string;
  /** IDs of completed goals on this island */
  goalsCompleted: string[];
  /** Whether the island boss has been defeated */
  bossDefeated: boolean;
}
