import type { SaveManager, UnlockRecord } from '../../persistence/index.ts';

/**
 * Reads/writes permanent unlocks via SaveManager.
 * Covers biome unlocks, tome page unlocks, hub building levels.
 */
export class UnlockTracker {
  readonly #save: SaveManager;

  constructor(save: SaveManager) {
    this.#save = save;
  }

  async isUnlocked(id: string): Promise<boolean> {
    const unlocks = await this.#save.getUnlocks();
    return unlocks.some((u) => u.id === id);
  }

  async unlock(id: string, type: string, data: Record<string, unknown>): Promise<void> {
    await this.#save.addUnlock({ id, type, data });
  }

  async getAll(): Promise<UnlockRecord[]> {
    return this.#save.getUnlocks();
  }
}
