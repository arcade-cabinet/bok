import { describe, it, expect } from 'vitest';
import { Inventory } from './Inventory.ts';
import { LootTable, type DropConfig } from './LootTable.ts';
import { CraftingSystem, type Recipe } from './CraftingSystem.ts';

describe('Inventory', () => {
  it('addItem and getItems', () => {
    const inv = new Inventory();
    inv.addItem('player', 'wood', 5);
    inv.addItem('player', 'stone', 3);
    const items = inv.getItems('player');
    expect(items).toHaveLength(2);
    expect(items.find((i) => i.itemId === 'wood')?.amount).toBe(5);
    expect(items.find((i) => i.itemId === 'stone')?.amount).toBe(3);
  });

  it('addItem stacks amounts for same item', () => {
    const inv = new Inventory();
    inv.addItem('player', 'wood', 3);
    inv.addItem('player', 'wood', 7);
    const items = inv.getItems('player');
    expect(items).toHaveLength(1);
    expect(items[0].amount).toBe(10);
  });

  it('removeItem decrements amount', () => {
    const inv = new Inventory();
    inv.addItem('player', 'wood', 10);
    const removed = inv.removeItem('player', 'wood', 4);
    expect(removed).toBe(true);
    expect(inv.getItems('player')[0].amount).toBe(6);
  });

  it('removeItem removes entry when amount reaches zero', () => {
    const inv = new Inventory();
    inv.addItem('player', 'wood', 5);
    inv.removeItem('player', 'wood', 5);
    expect(inv.getItems('player')).toHaveLength(0);
  });

  it('removeItem returns false when insufficient', () => {
    const inv = new Inventory();
    inv.addItem('player', 'wood', 3);
    const removed = inv.removeItem('player', 'wood', 5);
    expect(removed).toBe(false);
    // Amount unchanged
    expect(inv.getItems('player')[0].amount).toBe(3);
  });

  it('hasItem checks presence and minimum amount', () => {
    const inv = new Inventory();
    inv.addItem('player', 'wood', 5);
    expect(inv.hasItem('player', 'wood')).toBe(true);
    expect(inv.hasItem('player', 'wood', 5)).toBe(true);
    expect(inv.hasItem('player', 'wood', 6)).toBe(false);
    expect(inv.hasItem('player', 'stone')).toBe(false);
  });

  it('getItems returns empty for unknown holder', () => {
    const inv = new Inventory();
    expect(inv.getItems('nobody')).toEqual([]);
  });

  it('supports multiple holders', () => {
    const inv = new Inventory();
    inv.addItem('player', 'wood', 5);
    inv.addItem('chest-1', 'gold', 10);
    expect(inv.getItems('player')).toHaveLength(1);
    expect(inv.getItems('chest-1')).toHaveLength(1);
  });
});

describe('LootTable', () => {
  it('rollDrops returns items within configured amounts', () => {
    const drops: DropConfig[] = [
      { itemId: 'gold', chance: 1.0, minAmount: 1, maxAmount: 3 },
    ];
    const result = LootTable.rollDrops(drops, () => 0.5);
    expect(result).toHaveLength(1);
    expect(result[0].itemId).toBe('gold');
    expect(result[0].amount).toBeGreaterThanOrEqual(1);
    expect(result[0].amount).toBeLessThanOrEqual(3);
  });

  it('rollDrops respects chance — zero chance yields no drops', () => {
    const drops: DropConfig[] = [
      { itemId: 'gold', chance: 0, minAmount: 1, maxAmount: 1 },
    ];
    const result = LootTable.rollDrops(drops, () => 0.5);
    expect(result).toHaveLength(0);
  });

  it('rollDrops distribution approximates weights over 1000 rolls', () => {
    const drops: DropConfig[] = [
      { itemId: 'common', chance: 0.8, minAmount: 1, maxAmount: 1 },
      { itemId: 'rare', chance: 0.2, minAmount: 1, maxAmount: 1 },
    ];

    let commonCount = 0;
    let rareCount = 0;
    // Simple LCG for deterministic but well-distributed values
    let state = 42;
    const prng = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    };

    for (let i = 0; i < 1000; i++) {
      const result = LootTable.rollDrops(drops, prng);
      for (const drop of result) {
        if (drop.itemId === 'common') commonCount++;
        if (drop.itemId === 'rare') rareCount++;
      }
    }

    // Common should appear roughly 80% of the time (±15%)
    expect(commonCount).toBeGreaterThan(600);
    expect(commonCount).toBeLessThan(950);
    // Rare should appear roughly 20% (±15%)
    expect(rareCount).toBeGreaterThan(50);
    expect(rareCount).toBeLessThan(400);
  });
});

describe('CraftingSystem', () => {
  it('canCraft returns true when ingredients sufficient', () => {
    const inv = new Inventory();
    inv.addItem('player', 'wood', 5);
    inv.addItem('player', 'stone', 3);
    const recipe: Recipe = {
      id: 'wooden-sword',
      ingredients: [
        { itemId: 'wood', amount: 3 },
        { itemId: 'stone', amount: 1 },
      ],
      output: { itemId: 'wooden-sword', amount: 1 },
    };
    expect(CraftingSystem.canCraft(recipe, inv, 'player')).toBe(true);
  });

  it('canCraft returns false when ingredients insufficient', () => {
    const inv = new Inventory();
    inv.addItem('player', 'wood', 1);
    const recipe: Recipe = {
      id: 'wooden-sword',
      ingredients: [{ itemId: 'wood', amount: 3 }],
      output: { itemId: 'wooden-sword', amount: 1 },
    };
    expect(CraftingSystem.canCraft(recipe, inv, 'player')).toBe(false);
  });

  it('craft consumes ingredients and produces output', () => {
    const inv = new Inventory();
    inv.addItem('player', 'wood', 5);
    inv.addItem('player', 'stone', 3);
    const recipe: Recipe = {
      id: 'wooden-sword',
      ingredients: [
        { itemId: 'wood', amount: 3 },
        { itemId: 'stone', amount: 1 },
      ],
      output: { itemId: 'wooden-sword', amount: 1 },
    };
    const result = CraftingSystem.craft(recipe, inv, 'player');
    expect(result).toBe(true);
    expect(inv.hasItem('player', 'wood', 2)).toBe(true);
    expect(inv.hasItem('player', 'stone', 2)).toBe(true);
    expect(inv.hasItem('player', 'wooden-sword')).toBe(true);
  });

  it('craft returns false and does not modify inventory if insufficient', () => {
    const inv = new Inventory();
    inv.addItem('player', 'wood', 1);
    const recipe: Recipe = {
      id: 'wooden-sword',
      ingredients: [{ itemId: 'wood', amount: 3 }],
      output: { itemId: 'wooden-sword', amount: 1 },
    };
    const result = CraftingSystem.craft(recipe, inv, 'player');
    expect(result).toBe(false);
    expect(inv.hasItem('player', 'wood', 1)).toBe(true);
  });
});
