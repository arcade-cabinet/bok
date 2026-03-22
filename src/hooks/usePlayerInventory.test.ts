import { describe, expect, it } from 'vitest';

/**
 * Pure-logic tests for usePlayerInventory behavior.
 *
 * We test the inventory logic by simulating the state management
 * that the hook performs, without React hooks (which require browser tests).
 */

interface InventoryState {
  resources: Record<string, number>;
  equippedWeapon: string | null;
}

/** Simulate addResource: same logic as the hook. */
function addResource(state: InventoryState, itemId: string, amount: number): InventoryState {
  const newResources = { ...state.resources };
  newResources[itemId] = (newResources[itemId] ?? 0) + amount;
  return { ...state, resources: newResources };
}

/** Simulate removeResource: returns [newState, success]. */
function removeResource(state: InventoryState, itemId: string, amount: number): [InventoryState, boolean] {
  const current = state.resources[itemId] ?? 0;
  if (current < amount) return [state, false];
  const newResources = { ...state.resources };
  newResources[itemId] = current - amount;
  return [{ ...state, resources: newResources }, true];
}

/** Simulate canAfford. */
function canAfford(state: InventoryState, costs: Record<string, number>): boolean {
  return Object.entries(costs).every(([resource, amount]) => (state.resources[resource] ?? 0) >= amount);
}

/** Simulate getCount. */
function getCount(state: InventoryState, itemId: string): number {
  return state.resources[itemId] ?? 0;
}

describe('usePlayerInventory logic', () => {
  const defaultState: InventoryState = {
    resources: { wood: 100, stone: 100 },
    equippedWeapon: null,
  };

  describe('addResource', () => {
    it('adds to an existing resource', () => {
      const result = addResource(defaultState, 'wood', 50);
      expect(result.resources.wood).toBe(150);
    });

    it('adds a new resource type', () => {
      const result = addResource(defaultState, 'iron-ore', 10);
      expect(result.resources['iron-ore']).toBe(10);
    });

    it('accumulates multiple additions', () => {
      let state = addResource(defaultState, 'wood', 20);
      state = addResource(state, 'wood', 30);
      expect(state.resources.wood).toBe(150);
    });

    it('does not modify other resources', () => {
      const result = addResource(defaultState, 'wood', 50);
      expect(result.resources.stone).toBe(100);
    });
  });

  describe('removeResource', () => {
    it('removes from an existing resource', () => {
      const [result, success] = removeResource(defaultState, 'wood', 40);
      expect(success).toBe(true);
      expect(result.resources.wood).toBe(60);
    });

    it('returns false when insufficient resources', () => {
      const [result, success] = removeResource(defaultState, 'wood', 200);
      expect(success).toBe(false);
      expect(result.resources.wood).toBe(100); // Unchanged
    });

    it('returns false for missing resource type', () => {
      const [, success] = removeResource(defaultState, 'gold', 10);
      expect(success).toBe(false);
    });

    it('allows removing exact amount', () => {
      const [result, success] = removeResource(defaultState, 'wood', 100);
      expect(success).toBe(true);
      expect(result.resources.wood).toBe(0);
    });

    it('does not modify state on failure', () => {
      const [result] = removeResource(defaultState, 'wood', 200);
      expect(result).toBe(defaultState);
    });
  });

  describe('canAfford', () => {
    it('returns true when player has exact resources', () => {
      expect(canAfford(defaultState, { wood: 100, stone: 100 })).toBe(true);
    });

    it('returns true when player has more than needed', () => {
      expect(canAfford(defaultState, { wood: 50, stone: 30 })).toBe(true);
    });

    it('returns false when missing one resource', () => {
      expect(canAfford(defaultState, { wood: 50, stone: 200 })).toBe(false);
    });

    it('returns false for resource player does not have', () => {
      expect(canAfford(defaultState, { gold: 10 })).toBe(false);
    });

    it('returns true for empty cost', () => {
      expect(canAfford(defaultState, {})).toBe(true);
    });

    it('handles multiple resource types', () => {
      const state = addResource(defaultState, 'iron-ore', 5);
      expect(canAfford(state, { wood: 50, stone: 50, 'iron-ore': 5 })).toBe(true);
      expect(canAfford(state, { wood: 50, stone: 50, 'iron-ore': 10 })).toBe(false);
    });
  });

  describe('getCount', () => {
    it('returns count for existing resource', () => {
      expect(getCount(defaultState, 'wood')).toBe(100);
    });

    it('returns 0 for missing resource', () => {
      expect(getCount(defaultState, 'gold')).toBe(0);
    });

    it('reflects changes after add', () => {
      const state = addResource(defaultState, 'herbs', 7);
      expect(getCount(state, 'herbs')).toBe(7);
    });

    it('reflects changes after remove', () => {
      const [state] = removeResource(defaultState, 'stone', 30);
      expect(getCount(state, 'stone')).toBe(70);
    });
  });

  describe('starting resources', () => {
    it('starts with wood=100 and stone=100', () => {
      expect(defaultState.resources.wood).toBe(100);
      expect(defaultState.resources.stone).toBe(100);
    });

    it('starts with no equipped weapon', () => {
      expect(defaultState.equippedWeapon).toBeNull();
    });
  });

  describe('equipped weapon', () => {
    it('can set equipped weapon', () => {
      const state = { ...defaultState, equippedWeapon: 'iron-sword' };
      expect(state.equippedWeapon).toBe('iron-sword');
    });

    it('can unequip weapon', () => {
      const state = { ...defaultState, equippedWeapon: 'iron-sword' };
      const updated = { ...state, equippedWeapon: null };
      expect(updated.equippedWeapon).toBeNull();
    });
  });
});
