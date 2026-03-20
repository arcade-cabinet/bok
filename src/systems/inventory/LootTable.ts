/** Configuration for a single drop entry. */
export interface DropConfig {
  itemId: string;
  chance: number;
  minAmount: number;
  maxAmount: number;
}

/** Result of a loot roll. */
export interface DropResult {
  itemId: string;
  amount: number;
}

/**
 * Resolves weighted random drops from enemy/chest drop configs.
 * Each drop is rolled independently against its chance.
 */
export class LootTable {
  /**
   * @param drops - Array of drop configurations.
   * @param prng - Random number generator returning [0, 1). Defaults to Math.random.
   */
  static rollDrops(
    drops: DropConfig[],
    prng: () => number = Math.random,
  ): DropResult[] {
    const results: DropResult[] = [];

    for (const drop of drops) {
      if (prng() < drop.chance) {
        const range = drop.maxAmount - drop.minAmount + 1;
        const amount = drop.minAmount + Math.floor(prng() * range);
        results.push({ itemId: drop.itemId, amount });
      }
    }

    return results;
  }
}
