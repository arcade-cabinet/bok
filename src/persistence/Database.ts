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
 * NOTE: This is a test-only adapter with simplified SQL parsing.
 * Do not use in production.
 */
export class InMemoryDatabase implements DatabaseAdapter {
  readonly #tables = new Map<string, unknown[]>();
  readonly #autoInc = new Map<string, number>();
  /** Column names per table — populated from CREATE TABLE statements */
  readonly #columns = new Map<string, string[]>();
  /** Primary key column indices per table — for OR REPLACE matching */
  readonly #primaryKeys = new Map<string, number[]>();

  async execute(sql: string, params?: unknown[]): Promise<void> {
    // Parse simple CREATE TABLE and INSERT statements
    const createMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
    if (createMatch) {
      const table = createMatch[1];
      if (!this.#tables.has(table)) this.#tables.set(table, []);
      // Extract column names from the CREATE TABLE body — split by newline
      // to avoid issues with commas inside DEFAULT values or compound keys
      const lines = sql
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const cols: string[] = [];
      let compositePk: string[] = [];
      for (const line of lines) {
        // Detect composite PRIMARY KEY (save_id, biome_id)
        const pkMatch = line.match(/^PRIMARY KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
          compositePk = pkMatch[1].split(',').map((c) => c.trim());
          continue;
        }
        // Skip non-column lines
        if (/^(CREATE|FOREIGN|\)|CHECK)/i.test(line)) continue;
        // A column line starts with an identifier followed by a SQL type
        const colMatch = line.match(/^(\w+)\s+(INTEGER|TEXT|REAL|BLOB|NUMERIC)/i);
        if (colMatch) cols.push(colMatch[1]);
      }
      if (cols.length > 0) {
        this.#columns.set(table, cols);
        // Determine primary key indices
        if (compositePk.length > 0) {
          this.#primaryKeys.set(
            table,
            compositePk.map((c) => cols.indexOf(c)).filter((i) => i >= 0),
          );
        } else {
          // Single column PRIMARY KEY — first column named 'id' or first column with PRIMARY KEY in its definition
          const idIdx = cols.indexOf('id');
          if (idIdx >= 0) this.#primaryKeys.set(table, [idIdx]);
        }
      }
      return;
    }

    // UPDATE table SET col1 = ?, col2 = ? WHERE ...
    const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
    if (updateMatch && params) {
      const table = updateMatch[1];
      const setClauses = updateMatch[2];
      const whereClause = updateMatch[3];
      const cols = this.#columns.get(table) ?? [];
      const rows = this.#tables.get(table) ?? [];

      // Parse SET columns
      const setTokens = setClauses.split(',').map((s) => s.trim());
      const setEntries: Array<{ colIdx: number; paramIdx: number }> = [];
      let pIdx = 0;
      for (const token of setTokens) {
        const colName = token.split('=')[0].trim();
        const colIdx = cols.indexOf(colName);
        if (colIdx >= 0) {
          setEntries.push({ colIdx, paramIdx: pIdx });
        }
        pIdx++;
      }

      // Parse WHERE conditions and filter rows
      const filterFn = this.#buildWhereFilter(whereClause, cols, params, pIdx);

      for (const row of rows) {
        const r = row as unknown[];
        if (filterFn(r)) {
          for (const entry of setEntries) {
            r[entry.colIdx] = params[entry.paramIdx];
          }
        }
      }
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
        const placeholderCount = valTokens.filter((t) => t === '?').length;
        if (params.length < placeholderCount) {
          throw new Error(`Parameter count mismatch: expected ${placeholderCount}, got ${params.length}`);
        }
        let paramIdx = 0;
        row = valTokens.map((t) => {
          if (t === '?') return params[paramIdx++];
          return Number.isNaN(Number(t)) ? t : Number(t);
        });
      } else {
        row = [...params];
      }

      // Detect columns spec — if 'id' is not listed AND the table schema
      // has an 'id' column (AUTOINCREMENT tables), prepend auto-increment.
      // Tables with composite primary keys should NOT get an auto id.
      const colsMatch = sql.match(/INTO \w+ \(([^)]+)\)/);
      if (colsMatch) {
        const insertCols = colsMatch[1].split(',').map((c) => c.trim());
        const schemaCols = this.#columns.get(table) ?? [];
        const tableHasIdColumn = schemaCols.includes('id');
        if (!insertCols.includes('id') && tableHasIdColumn) {
          const nextId = (this.#autoInc.get(table) ?? 0) + 1;
          this.#autoInc.set(table, nextId);
          row = [nextId, ...row];
        }
      }

      // Handle OR REPLACE: remove existing row with matching primary key
      const isReplace = /INSERT OR REPLACE/i.test(sql);
      if (isReplace && rows.length > 0) {
        const pkIndices = this.#primaryKeys.get(table) ?? [0];
        const idx = rows.findIndex((r) => {
          const existing = r as unknown[];
          return pkIndices.every((i) => existing[i] === row[i]);
        });
        if (idx !== -1) rows.splice(idx, 1);
      }

      rows.push(row);
      this.#tables.set(table, rows);
      return;
    }

    const deleteMatch = sql.match(/DELETE FROM (\w+)/);
    if (deleteMatch) {
      const table = deleteMatch[1];
      const whereMatch = sql.match(/WHERE\s+(.+)/i);
      if (whereMatch && params) {
        const cols = this.#columns.get(table) ?? [];
        const filterFn = this.#buildWhereFilter(whereMatch[1], cols, params, 0);
        const rows = this.#tables.get(table) ?? [];
        this.#tables.set(
          table,
          rows.filter((r) => !filterFn(r as unknown[])),
        );
      } else {
        this.#tables.set(table, []);
      }
    }
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const selectMatch = sql.match(/SELECT .+ FROM (\w+)/i);
    if (!selectMatch) return [];

    const table = selectMatch[1];
    let rows = [...((this.#tables.get(table) ?? []) as unknown[][])];

    // WHERE clause filtering
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s|\s*$)/i);
    if (whereMatch && params && params.length > 0) {
      const cols = this.#columns.get(table) ?? [];
      const filterFn = this.#buildWhereFilter(whereMatch[1], cols, params, 0);
      rows = rows.filter(filterFn);
    }

    const orderMatch = sql.match(/ORDER BY\s+(\w+)\s+(ASC|DESC)/i);
    if (orderMatch) {
      const cols = this.#columns.get(table) ?? [];
      const col = orderMatch[1].toLowerCase();
      const desc = orderMatch[2].toUpperCase() === 'DESC';

      // Use column schema if available, otherwise fall back to hardcoded runs mapping
      let colIndex = cols.indexOf(col);
      if (colIndex < 0 && table === 'runs') {
        // Legacy fallback for runs table
        const runsMap: Record<string, number> = { id: 0, seed: 1, biomes: 2, result: 3, duration: 4, timestamp: 5 };
        colIndex = runsMap[col] ?? -1;
      }

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

  /**
   * Build a filter function from a WHERE clause like "col1 = ? AND col2 = ?".
   * Returns a predicate that tests a row (unknown[]) against the conditions.
   */
  #buildWhereFilter(
    whereClause: string,
    cols: string[],
    params: unknown[],
    paramOffset: number,
  ): (row: unknown[]) => boolean {
    const conditions = whereClause.split(/\s+AND\s+/i);
    const checks: Array<{ colIdx: number; value: unknown }> = [];
    let pIdx = paramOffset;

    for (const cond of conditions) {
      const match = cond.trim().match(/(\w+)\s*=\s*\?/);
      if (match) {
        const colName = match[1];
        const colIdx = cols.indexOf(colName);
        if (colIdx >= 0) {
          checks.push({ colIdx, value: params[pIdx] });
        }
        pIdx++;
      }
    }

    return (row: unknown[]) => checks.every((c) => row[c.colIdx] === c.value);
  }
}
