/**
 * Abstraction over @capacitor-community/sqlite.
 * On web: uses jeep-sqlite (WASM). On native: uses Capacitor plugin.
 * For testing: in-memory Map-based mock.
 */
export interface DatabaseAdapter {
  execute(sql: string, params?: unknown[]): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

/**
 * In-memory adapter for testing and initial development.
 * NOTE: query() ignores params — this is a test-only adapter with
 * simplified SQL parsing. Do not use in production.
 */
export class InMemoryDatabase implements DatabaseAdapter {
  readonly #tables = new Map<string, unknown[]>();
  readonly #autoInc = new Map<string, number>();

  async execute(sql: string, params?: unknown[]): Promise<void> {
    // Parse simple CREATE TABLE and INSERT statements
    const createMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
    if (createMatch) {
      const table = createMatch[1];
      if (!this.#tables.has(table)) this.#tables.set(table, []);
      return;
    }

    const insertMatch = sql.match(/INSERT (?:OR REPLACE )?INTO (\w+)/);
    if (insertMatch && params) {
      const table = insertMatch[1];
      const rows = this.#tables.get(table) ?? [];

      // Build row from VALUES clause, expanding literals alongside ? params
      const valsMatch = sql.match(/VALUES\s*\(([^)]+)\)/);
      let row: unknown[];
      if (valsMatch) {
        const valTokens = valsMatch[1].split(',').map((v) => v.trim());
        let paramIdx = 0;
        row = valTokens.map((t) => {
          if (t === '?') return params[paramIdx++];
          return Number.isNaN(Number(t)) ? t : Number(t);
        });
      } else {
        row = [...params];
      }

      // Detect columns spec — if 'id' is not listed, prepend auto-increment
      const colsMatch = sql.match(/INTO \w+ \(([^)]+)\)/);
      if (colsMatch) {
        const cols = colsMatch[1].split(',').map((c) => c.trim());
        if (!cols.includes('id')) {
          const nextId = (this.#autoInc.get(table) ?? 0) + 1;
          this.#autoInc.set(table, nextId);
          row = [nextId, ...row];
        }
      }

      // Handle OR REPLACE: remove existing row with same primary key (first column)
      const isReplace = /INSERT OR REPLACE/i.test(sql);
      if (isReplace && rows.length > 0) {
        const pk = row[0];
        const idx = rows.findIndex((r) => (r as unknown[])[0] === pk);
        if (idx !== -1) rows.splice(idx, 1);
      }

      rows.push(row);
      this.#tables.set(table, rows);
      return;
    }

    const deleteMatch = sql.match(/DELETE FROM (\w+)/);
    if (deleteMatch) {
      this.#tables.set(deleteMatch[1], []);
    }
  }

  async query<T>(sql: string, _params?: unknown[]): Promise<T[]> {
    const selectMatch = sql.match(/SELECT .+ FROM (\w+)/i);
    if (!selectMatch) return [];

    const table = selectMatch[1];
    const rows = [...((this.#tables.get(table) ?? []) as unknown[][])];
    const orderMatch = sql.match(/ORDER BY\s+(\w+)\s+(ASC|DESC)/i);
    if (orderMatch && table === 'runs') {
      const col = orderMatch[1].toLowerCase();
      const desc = orderMatch[2].toUpperCase() === 'DESC';
      // Row shape: [id, seed, biomes, result, duration, timestamp]
      const colIndex =
        col === 'id'
          ? 0
          : col === 'seed'
            ? 1
            : col === 'biomes'
              ? 2
              : col === 'result'
                ? 3
                : col === 'duration'
                  ? 4
                  : col === 'timestamp'
                    ? 5
                    : -1;
      if (colIndex >= 0) {
        rows.sort((a, b) => {
          const va = a[colIndex] as number | string;
          const vb = b[colIndex] as number | string;
          let cmp = 0;
          if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
          else cmp = String(va).localeCompare(String(vb));
          if (cmp !== 0) return desc ? -cmp : cmp;
          // Stable order when timestamps collide (same millisecond)
          const ida = a[0] as number;
          const idb = b[0] as number;
          return idb - ida;
        });
      }
    }

    return rows as T[];
  }
}
