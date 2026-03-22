/**
 * Platform-aware database factory.
 * On native (iOS/Android): returns CapacitorDatabase backed by real SQLite.
 * On web: returns InMemoryDatabase (or jeep-sqlite when wired up).
 */
import { Capacitor } from '@capacitor/core';
import type { DatabaseAdapter } from './Database.ts';

export async function createDatabase(): Promise<DatabaseAdapter> {
  if (Capacitor.isNativePlatform()) {
    const { CapacitorDatabase } = await import('./CapacitorDatabase.ts');
    const db = new CapacitorDatabase();
    await db.open();
    return db;
  }
  // Web fallback: in-memory (swap for jeep-sqlite when web persistence is needed)
  const { InMemoryDatabase } = await import('./Database.ts');
  return new InMemoryDatabase();
}
