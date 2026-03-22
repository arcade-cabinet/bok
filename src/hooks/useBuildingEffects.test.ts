import { describe, expect, it } from 'vitest';
import { computeBuildingEffects } from './useBuildingEffects';

describe('computeBuildingEffects', () => {
  describe('default (all level 0)', () => {
    it('returns base effects when no buildings upgraded', () => {
      const effects = computeBuildingEffects({});
      expect(effects.startingWeapon).toBeNull();
      expect(effects.maxIslandChoices).toBe(1);
      expect(effects.tomePowerMultiplier).toBe(1.0);
      expect(effects.shopTier).toBe(0);
      expect(effects.maxCraftingTier).toBe(0);
    });
  });

  describe('armory levels', () => {
    it('level 0: no weapon', () => {
      const effects = computeBuildingEffects({ armory: 0 });
      expect(effects.startingWeapon).toBeNull();
    });

    it('level 1: wooden sword', () => {
      const effects = computeBuildingEffects({ armory: 1 });
      expect(effects.startingWeapon).toBe('wooden-sword');
    });

    it('level 2: iron sword', () => {
      const effects = computeBuildingEffects({ armory: 2 });
      expect(effects.startingWeapon).toBe('iron-sword');
    });

    it('level 3: crystal blade', () => {
      const effects = computeBuildingEffects({ armory: 3 });
      expect(effects.startingWeapon).toBe('crystal-blade');
    });

    it('level 4: choice of rare (defaults to crystal blade)', () => {
      const effects = computeBuildingEffects({ armory: 4 });
      expect(effects.startingWeapon).toBe('crystal-blade');
    });

    it('level 5: choice of any (defaults to crystal blade)', () => {
      const effects = computeBuildingEffects({ armory: 5 });
      expect(effects.startingWeapon).toBe('crystal-blade');
    });
  });

  describe('docks levels', () => {
    it('level 0: 1 island choice', () => {
      const effects = computeBuildingEffects({ docks: 0 });
      expect(effects.maxIslandChoices).toBe(1);
    });

    it('level 1: 1 island choice', () => {
      const effects = computeBuildingEffects({ docks: 1 });
      expect(effects.maxIslandChoices).toBe(1);
    });

    it('level 2: 2 island choices', () => {
      const effects = computeBuildingEffects({ docks: 2 });
      expect(effects.maxIslandChoices).toBe(2);
    });

    it('level 3: 3 island choices', () => {
      const effects = computeBuildingEffects({ docks: 3 });
      expect(effects.maxIslandChoices).toBe(3);
    });

    it('level 4: 4 island choices', () => {
      const effects = computeBuildingEffects({ docks: 4 });
      expect(effects.maxIslandChoices).toBe(4);
    });

    it('level 5: 5 island choices', () => {
      const effects = computeBuildingEffects({ docks: 5 });
      expect(effects.maxIslandChoices).toBe(5);
    });
  });

  describe('library levels', () => {
    it('level 0: 1.0x multiplier', () => {
      const effects = computeBuildingEffects({ library: 0 });
      expect(effects.tomePowerMultiplier).toBe(1.0);
    });

    it('level 1: 1.2x multiplier', () => {
      const effects = computeBuildingEffects({ library: 1 });
      expect(effects.tomePowerMultiplier).toBe(1.2);
    });

    it('level 2: 1.4x multiplier', () => {
      const effects = computeBuildingEffects({ library: 2 });
      expect(effects.tomePowerMultiplier).toBe(1.4);
    });

    it('level 3: 1.6x multiplier', () => {
      const effects = computeBuildingEffects({ library: 3 });
      expect(effects.tomePowerMultiplier).toBe(1.6);
    });

    it('level 4: 1.8x multiplier', () => {
      const effects = computeBuildingEffects({ library: 4 });
      expect(effects.tomePowerMultiplier).toBe(1.8);
    });

    it('level 5: 2.0x multiplier', () => {
      const effects = computeBuildingEffects({ library: 5 });
      expect(effects.tomePowerMultiplier).toBe(2.0);
    });
  });

  describe('market levels', () => {
    it('level 0: no shops', () => {
      const effects = computeBuildingEffects({ market: 0 });
      expect(effects.shopTier).toBe(0);
    });

    it('level 1: still no shops', () => {
      const effects = computeBuildingEffects({ market: 1 });
      expect(effects.shopTier).toBe(0);
    });

    it('level 2: basic shops', () => {
      const effects = computeBuildingEffects({ market: 2 });
      expect(effects.shopTier).toBe(2);
    });

    it('level 3: full shops', () => {
      const effects = computeBuildingEffects({ market: 3 });
      expect(effects.shopTier).toBe(3);
    });
  });

  describe('forge levels', () => {
    it('level 0: no crafting', () => {
      const effects = computeBuildingEffects({ forge: 0 });
      expect(effects.maxCraftingTier).toBe(0);
    });

    it('level 1: basic recipes', () => {
      const effects = computeBuildingEffects({ forge: 1 });
      expect(effects.maxCraftingTier).toBe(1);
    });

    it('level 2: advanced recipes', () => {
      const effects = computeBuildingEffects({ forge: 2 });
      expect(effects.maxCraftingTier).toBe(2);
    });

    it('level 3: master recipes', () => {
      const effects = computeBuildingEffects({ forge: 3 });
      expect(effects.maxCraftingTier).toBe(3);
    });
  });

  describe('combined building levels', () => {
    it('computes all effects simultaneously', () => {
      const effects = computeBuildingEffects({
        armory: 2,
        docks: 3,
        library: 4,
        market: 2,
        forge: 1,
      });
      expect(effects.startingWeapon).toBe('iron-sword');
      expect(effects.maxIslandChoices).toBe(3);
      expect(effects.tomePowerMultiplier).toBe(1.8);
      expect(effects.shopTier).toBe(2);
      expect(effects.maxCraftingTier).toBe(1);
    });

    it('handles partial building levels', () => {
      const effects = computeBuildingEffects({ armory: 3, library: 2 });
      expect(effects.startingWeapon).toBe('crystal-blade');
      expect(effects.maxIslandChoices).toBe(1); // docks not upgraded
      expect(effects.tomePowerMultiplier).toBe(1.4);
      expect(effects.shopTier).toBe(0); // market not upgraded
      expect(effects.maxCraftingTier).toBe(0); // forge not upgraded
    });

    it('handles max levels for all buildings', () => {
      const effects = computeBuildingEffects({
        armory: 5,
        docks: 5,
        library: 5,
        market: 3,
        forge: 3,
      });
      expect(effects.startingWeapon).toBe('crystal-blade');
      expect(effects.maxIslandChoices).toBe(5);
      expect(effects.tomePowerMultiplier).toBe(2.0);
      expect(effects.shopTier).toBe(3);
      expect(effects.maxCraftingTier).toBe(3);
    });
  });

  describe('unknown levels fallback', () => {
    it('falls back to defaults for levels beyond defined range', () => {
      const effects = computeBuildingEffects({
        armory: 99,
        docks: 99,
        library: 99,
        market: 99,
        forge: 99,
      });
      // Lookup misses fall back to null/1/1.0/0/0
      expect(effects.startingWeapon).toBeNull();
      expect(effects.maxIslandChoices).toBe(1);
      expect(effects.tomePowerMultiplier).toBe(1.0);
      expect(effects.shopTier).toBe(0);
      expect(effects.maxCraftingTier).toBe(0);
    });
  });
});
