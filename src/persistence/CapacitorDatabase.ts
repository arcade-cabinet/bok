/**
 * Production SQLite adapter using @capacitor-community/sqlite.
 * On native (iOS/Android): uses the Capacitor SQLite plugin.
 * On web: falls back to jeep-sqlite (WASM) if available.
 *
 * @see DatabaseAdapter for the interface contract.
 */
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { DatabaseAdapter } from './Database.ts';

export class CapacitorDatabase implements DatabaseAdapter {
  #db: SQLiteDBConnection | null = null;
  readonly #dbName: string;

  constructor(dbName = 'bok_saves') {
    this.#dbName = dbName;
  }

  async open(): Promise<void> {
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    const ret = await sqlite.checkConnectionsConsistency();
    const isConn = (await sqlite.isConnection(this.#dbName, false)).result;
    if (ret.result && isConn) {
      this.#db = await sqlite.retrieveConnection(this.#dbName, false);
    } else {
      this.#db = await sqlite.createConnection(this.#dbName, false, 'no-encryption', 1, false);
    }
    await this.#db.open();
  }

  async execute(sql: string, params?: unknown[]): Promise<void> {
    if (!this.#db) throw new Error('Database not open — call open() first');
    await this.#db.run(sql, params as (string | number | boolean | null)[]);
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    if (!this.#db) throw new Error('Database not open — call open() first');
    const result = await this.#db.query(sql, params as (string | number | boolean | null)[]);
    return (result.values ?? []) as T[];
  }

  async close(): Promise<void> {
    if (this.#db) {
      await this.#db.close();
      this.#db = null;
    }
  }
}
