/**
 * @module persistence
 * @role SQLite save/load via @capacitor-community/sqlite (web: jeep-sqlite)
 * @input Game state (Koota snapshots, Yuka JSON, progression data)
 * @output Persisted records: unlocks, runs, settings, save state
 * @depends @capacitor-community/sqlite
 * @tested Database.test.ts, GameStateSerializer.test.ts, CapacitorDatabase.test.ts
 */
export { type DatabaseAdapter, InMemoryDatabase } from './Database.ts';
export { CapacitorDatabase } from './CapacitorDatabase.ts';
export { createDatabase } from './createDatabase.ts';
export {
  type SerializedGameState,
  type SerializedPlayerState,
  type SerializedEnemyState,
  type SerializedWorldState,
  type SerializedRunStats,
  validateGameState,
  stringifyGameState,
  parseGameState,
} from './GameStateSerializer.ts';
export { runMigrations } from './migrations.ts';
export { type GameState, type RunRecord, SaveManager, type UnlockRecord } from './SaveManager.ts';
