import type { DatabaseAdapter } from './Database.ts';
import { InMemoryDatabase } from './Database.ts';
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
    await this.#db.execute(
      'INSERT OR REPLACE INTO unlocks (id, type, data, unlocked_at) VALUES (?, ?, ?, ?)',
      [record.id, record.type, JSON.stringify(record.data), Date.now()]
    );
  }

  async getUnlocks(): Promise<UnlockRecord[]> {
    const rows = await this.#db.query<unknown[]>('SELECT * FROM unlocks');
    return rows.map((r) => ({
      id: r[0] as string,
      type: r[1] as string,
      data: JSON.parse(r[2] as string),
    }));
  }

  async addRun(record: RunRecord): Promise<void> {
    await this.#db.execute(
      'INSERT INTO runs (seed, biomes, result, duration, timestamp) VALUES (?, ?, ?, ?, ?)',
      [record.seed, JSON.stringify(record.biomes), record.result, record.duration, Date.now()]
    );
  }

  async getRuns(): Promise<RunRecord[]> {
    const rows = await this.#db.query<unknown[]>('SELECT * FROM runs');
    return rows.map((r) => ({
      seed: r[1] as string,
      biomes: JSON.parse(r[2] as string),
      result: r[3] as RunRecord['result'],
      duration: r[4] as number,
    }));
  }

  async saveState(state: GameState): Promise<void> {
    await this.#db.execute(
      'INSERT OR REPLACE INTO save_state (id, koota_snapshot, yuka_snapshot, scene, timestamp) VALUES (1, ?, ?, ?, ?)',
      [JSON.stringify(state.koota), JSON.stringify(state.yuka), state.scene, Date.now()]
    );
  }

  async loadState(): Promise<GameState | null> {
    const rows = await this.#db.query<unknown[]>('SELECT * FROM save_state');
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      koota: JSON.parse(r[1] as string),
      yuka: JSON.parse(r[2] as string),
      scene: r[3] as string,
    };
  }
}
