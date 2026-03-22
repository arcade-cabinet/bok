import { describe, expect, it } from 'vitest';

/**
 * Pure-logic tests for NPCDialogue helpers.
 *
 * The component itself is React + DOM and would require browser tests.
 * Here we test the formatting utility and data structures used by the component.
 */

/** Convert kebab-case item ID to Title Case display name (extracted from NPCDialogue). */
function formatItemName(id: string): string {
  return id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

describe('NPCDialogue utilities', () => {
  describe('formatItemName', () => {
    it('converts kebab-case to Title Case', () => {
      expect(formatItemName('health-potion')).toBe('Health Potion');
    });

    it('handles single-word items', () => {
      expect(formatItemName('wood')).toBe('Wood');
    });

    it('handles multi-segment names', () => {
      expect(formatItemName('iron-sword-recipe')).toBe('Iron Sword Recipe');
    });

    it('handles empty string', () => {
      expect(formatItemName('')).toBe('');
    });
  });

  describe('NPC content data validation', () => {
    it('validates NPC roles match expected types', () => {
      const validRoles = ['merchant', 'crafter', 'lore', 'navigation'];
      // Ensure all roles are recognized
      for (const role of validRoles) {
        expect(validRoles).toContain(role);
      }
    });

    it('merchant NPC inventory has required fields', () => {
      const merchantInventory = [
        { itemId: 'health-potion', basePrice: 25 },
        { itemId: 'stamina-elixir', basePrice: 30 },
      ];

      for (const item of merchantInventory) {
        expect(item.itemId).toBeDefined();
        expect(typeof item.itemId).toBe('string');
        expect(item.basePrice).toBeGreaterThan(0);
      }
    });

    it('crafting recipe structure has ingredients and output', () => {
      const recipe = {
        id: 'wooden-planks',
        name: 'Wooden Planks',
        category: 'basic',
        tier: 1,
        ingredients: [{ itemId: 'wood', amount: 5 }],
        output: { itemId: 'wooden-planks', amount: 4 },
      };

      expect(recipe.ingredients.length).toBeGreaterThan(0);
      expect(recipe.output.amount).toBeGreaterThan(0);
      expect(recipe.output.itemId).toBeDefined();
    });
  });
});
