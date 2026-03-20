import type { DatabaseAdapter } from './Database.ts';

export async function runMigrations(db: DatabaseAdapter): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS unlocks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      unlocked_at INTEGER NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tome_pages (
      id TEXT PRIMARY KEY,
      ability TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      unlocked_at INTEGER NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS hub_state (
      building_id TEXT PRIMARY KEY,
      level INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL DEFAULT '{}'
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seed TEXT NOT NULL,
      biomes TEXT NOT NULL,
      result TEXT NOT NULL,
      duration INTEGER NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS save_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      koota_snapshot TEXT NOT NULL,
      yuka_snapshot TEXT NOT NULL,
      scene TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);
}
