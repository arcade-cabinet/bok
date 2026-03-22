import type { DatabaseAdapter } from './Database.ts';
import { InMemoryDatabase } from './Database.ts';
import type { SerializedGameState } from './GameStateSerializer.ts';
import { parseGameState, stringifyGameState, validateGameState } from './GameStateSerializer.ts';
import { runMigrations } from './migrations.ts';

export interface UnlockRecord {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface RunRecord {
  seed: string;
  biomes: string[];
  result: 'victory' | 'death' | 'abandoned';
  duration: number;
}

export interface GameState {
  koota: unknown;
  yuka: unknown;
  scene: string;
}

export class SaveManager {
  readonly #db: DatabaseAdapter;
  #ready = false;

  constructor(db: DatabaseAdapter) {
    this.#db = db;
  }

  async init(): Promise<void> {
    if (this.#ready) return;
    await runMigrations(this.#db);
    this.#ready = true;
  }

  static async createInMemory(): Promise<SaveManager> {
    const mgr = new SaveManager(new InMemoryDatabase());
    await runMigrations(mgr.#db);
    mgr.#ready = true;
    return mgr;
  }

  async addUnlock(record: UnlockRecord): Promise<void> {
    await this.#db.execute('INSERT OR REPLACE INTO unlocks (id, type, data, unlocked_at) VALUES (?, ?, ?, ?)', [
      record.id,
      record.type,
      JSON.stringify(record.data),
      Date.now(),
    ]);
  }

  async getUnlocks(): Promise<UnlockRecord[]> {
    const rows = await this.#db.query<unknown[]>('SELECT * FROM unlocks');
    return rows.map((r) => {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(r[2] as string);
      } catch {
        // Corrupted data — return empty
      }
      return { id: r[0] as string, type: r[1] as string, data };
    });
  }

  async addRun(record: RunRecord): Promise<void> {
    await this.#db.execute('INSERT INTO runs (seed, biomes, result, duration, timestamp) VALUES (?, ?, ?, ?, ?)', [
      record.seed,
      JSON.stringify(record.biomes),
      record.result,
      record.duration,
      Date.now(),
    ]);
  }

  async getRuns(): Promise<RunRecord[]> {
    const rows = await this.#db.query<unknown[]>('SELECT * FROM runs ORDER BY timestamp DESC');
    return rows.map((r) => {
      let biomes: string[] = [];
      try {
        biomes = JSON.parse(r[2] as string);
      } catch {
        // Corrupted data — return empty array
      }
      return {
        seed: r[1] as string,
        biomes,
        result: r[3] as RunRecord['result'],
        duration: r[4] as number,
      };
    });
  }

  async saveState(state: GameState): Promise<void> {
    await this.#db.execute(
      'INSERT OR REPLACE INTO save_state (id, koota_snapshot, yuka_snapshot, scene, timestamp) VALUES (1, ?, ?, ?, ?)',
      [JSON.stringify(state.koota), JSON.stringify(state.yuka), state.scene, Date.now()],
    );
  }

  async loadState(): Promise<GameState | null> {
    const rows = await this.#db.query<unknown[]>('SELECT * FROM save_state');
    if (rows.length === 0) return null;
    const r = rows[0];
    try {
      return {
        koota: JSON.parse(r[1] as string),
        yuka: JSON.parse(r[2] as string),
        scene: r[3] as string,
      };
    } catch {
      return null;
    }
  }

  // --- Mid-run save (SerializedGameState) ---

  /**
   * Save full mid-run game state. Stores the entire SerializedGameState
   * as a JSON blob in the save_state table (koota_snapshot column).
   * The yuka_snapshot and scene columns are set from the state for
   * backwards compat with the legacy GameState interface.
   */
  async saveGameState(state: SerializedGameState): Promise<void> {
    const json = stringifyGameState(state);
    await this.#db.execute(
      'INSERT OR REPLACE INTO save_state (id, koota_snapshot, yuka_snapshot, scene, timestamp) VALUES (1, ?, ?, ?, ?)',
      [json, '{}', state.config.biome, Date.now()],
    );
  }

  /**
   * Load and validate a mid-run save. Returns null if no save exists
   * or if the stored data fails validation (corrupted/incompatible).
   */
  async loadGameState(): Promise<SerializedGameState | null> {
    const rows = await this.#db.query<unknown[]>('SELECT * FROM save_state');
    if (rows.length === 0) return null;
    const r = rows[0];
    const json = r[1] as string;
    const state = parseGameState(json);
    if (!state) return null;
    return state;
  }

  /**
   * Delete the mid-run save. Call this after a run ends (death/victory/abandon)
   * so the player starts fresh next time.
   */
  async clearGameState(): Promise<void> {
    await this.#db.execute('DELETE FROM save_state');
  }

  /**
   * Check whether a mid-run save exists without fully deserializing it.
   */
  async hasSavedGame(): Promise<boolean> {
    const rows = await this.#db.query<unknown[]>('SELECT * FROM save_state');
    if (rows.length === 0) return false;
    const json = rows[0][1] as string;
    try {
      const data: unknown = JSON.parse(json);
      return validateGameState(data);
    } catch {
      return false;
    }
  }
}
