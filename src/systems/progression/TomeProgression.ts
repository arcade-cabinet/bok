import type { SaveManager } from '../../persistence/index.ts';

/**
 * Manages Tome page unlocks from boss defeats.
 * Library hub building upgrade levels increase ability power.
 */
export class TomeProgression {
  readonly #save: SaveManager;

  constructor(save: SaveManager) {
    this.#save = save;
  }

  async unlockPage(ability: string): Promise<void> {
    // Uses INSERT OR REPLACE, so duplicates overwrite (no duplication)
    await this.#save.addUnlock({
      id: `tome:${ability}`,
      type: 'tome_page',
      data: { ability },
    });
  }

  async getUnlockedPages(): Promise<string[]> {
    const unlocks = await this.#save.getUnlocks();
    return unlocks.filter((u) => u.type === 'tome_page').map((u) => u.data.ability as string);
  }

  async isPageUnlocked(ability: string): Promise<boolean> {
    const pages = await this.getUnlockedPages();
    return pages.includes(ability);
  }
}
