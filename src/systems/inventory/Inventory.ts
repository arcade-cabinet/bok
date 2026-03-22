/** An item stack in an inventory. */
export interface ItemStack {
  itemId: string;
  amount: number;
}

/**
 * Map-based inventory system. Each holder (entity id or string key)
 * contains a set of item stacks. Stacks are merged by itemId.
 */
export class Inventory {
  readonly #data = new Map<string, Map<string, number>>();

  addItem(holder: string, itemId: string, amount: number): void {
    let bag = this.#data.get(holder);
    if (!bag) {
      bag = new Map();
      this.#data.set(holder, bag);
    }
    bag.set(itemId, (bag.get(itemId) ?? 0) + amount);
  }

  removeItem(holder: string, itemId: string, amount: number): boolean {
    const bag = this.#data.get(holder);
    if (!bag) return false;
    const current = bag.get(itemId) ?? 0;
    if (current < amount) return false;
    const remaining = current - amount;
    if (remaining === 0) {
      bag.delete(itemId);
    } else {
      bag.set(itemId, remaining);
    }
    return true;
  }

  getItems(holder: string): ItemStack[] {
    const bag = this.#data.get(holder);
    if (!bag) return [];
    return Array.from(bag.entries()).map(([itemId, amount]) => ({ itemId, amount }));
  }

  hasItem(holder: string, itemId: string, minAmount: number = 1): boolean {
    const bag = this.#data.get(holder);
    if (!bag) return false;
    return (bag.get(itemId) ?? 0) >= minAmount;
  }
}
