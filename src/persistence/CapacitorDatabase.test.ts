import { describe, expect, it } from 'vitest';
import { CapacitorDatabase } from './CapacitorDatabase.ts';

describe('CapacitorDatabase (error paths)', () => {
  it('throws on execute when not opened', async () => {
    const db = new CapacitorDatabase('test_db');
    await expect(db.execute('SELECT 1')).rejects.toThrow('Database not open');
  });

  it('throws on query when not opened', async () => {
    const db = new CapacitorDatabase('test_db');
    await expect(db.query('SELECT 1')).rejects.toThrow('Database not open');
  });

  it('close is a no-op when not opened', async () => {
    const db = new CapacitorDatabase('test_db');
    // Should not throw
    await db.close();
  });

  it('uses default db name when none provided', () => {
    const db = new CapacitorDatabase();
    // Just verify construction succeeds — we can't inspect the private field
    expect(db).toBeInstanceOf(CapacitorDatabase);
  });
});
