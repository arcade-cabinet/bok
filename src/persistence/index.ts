/**
 * @module persistence
 * @role SQLite save/load via @capacitor-community/sqlite (web: jeep-sqlite)
 * @input Game state (Koota snapshots, Yuka JSON, progression data)
 * @output Persisted records: unlocks, runs, settings, save state
 * @depends @capacitor-community/sqlite
 * @tested Database.test.ts
 */
export { type DatabaseAdapter, InMemoryDatabase } from './Database.ts';
export { SaveManager, type UnlockRecord, type RunRecord, type GameState } from './SaveManager.ts';
export { runMigrations } from './migrations.ts';
