import type { SaveManager } from '../../persistence/index.ts';

export interface RunState {
  seed: string;
  biome: string;
  visitedIslands: string[];
  collectedLoot: string[];
  bossDefeated: boolean;
  startTime: number;
}

/**
 * Tracks run lifecycle: startRun → visitIsland → defeatBoss → endRun.
 * Reads/writes Koota GamePhase and IslandState world traits.
 * Persists completed runs via SaveManager.
 */
export class RunManager {
  readonly #save: SaveManager;
  #current: RunState | null = null;

  constructor(save: SaveManager) {
    this.#save = save;
  }

  startRun(seed: string, biome: string): void {
    this.#current = {
      seed,
      biome,
      visitedIslands: [],
      collectedLoot: [],
      bossDefeated: false,
      startTime: Date.now(),
    };
  }

  getRunState(): RunState | null {
    return this.#current;
  }

  visitIsland(islandId: string): void {
    if (!this.#current) return;
    this.#current.visitedIslands.push(islandId);
  }

  defeatBoss(): void {
    if (!this.#current) return;
    this.#current.bossDefeated = true;
  }

  collectLoot(itemId: string): void {
    if (!this.#current) return;
    this.#current.collectedLoot.push(itemId);
  }

  getElapsedTime(): number {
    if (!this.#current) return 0;
    return Date.now() - this.#current.startTime;
  }

  async endRun(result: 'victory' | 'death' | 'abandoned'): Promise<void> {
    if (!this.#current) return;
    const duration = Math.round((Date.now() - this.#current.startTime) / 1000);
    await this.#save.addRun({
      seed: this.#current.seed,
      biomes: [this.#current.biome],
      result,
      duration,
    });
    this.#current = null;
  }
}
