import { describe, expect, it, vi } from 'vitest';

import type { LootTableConfig } from '../content/types';
import { type ChestState, checkChestInteraction, rollChestLoot, spawnChests } from './lootSetup';

// Minimal THREE.js stubs for tests (node environment, no DOM)
function makeScene() {
  const children: unknown[] = [];
  return {
    add: vi.fn((obj: unknown) => children.push(obj)),
    remove: vi.fn((obj: unknown) => {
      const idx = children.indexOf(obj);
      if (idx >= 0) children.splice(idx, 1);
    }),
    children,
  };
}

function makeSurfaceY(defaultHeight = 5): (x: number, z: number) => number {
  return (_x: number, _z: number) => defaultHeight;
}

function makeWaterSurfaceY(): (x: number, z: number) => number {
  // Returns water level (<=2) for everything
  return (_x: number, _z: number) => 1;
}

const SAMPLE_LOOT_TABLES: LootTableConfig = {
  chestTiers: [
    { id: 'wooden', name: 'Wooden Chest', pools: ['common'] },
    { id: 'iron', name: 'Iron Chest', pools: ['common', 'uncommon'] },
    { id: 'crystal', name: 'Crystal Chest', pools: ['uncommon', 'rare', 'legendary'] },
  ],
  pools: [
    {
      id: 'common',
      weight: 0.6,
      items: [
        { itemId: 'wood', weight: 0.5, minAmount: 3, maxAmount: 8 },
        { itemId: 'stone', weight: 0.5, minAmount: 3, maxAmount: 8 },
      ],
    },
    {
      id: 'uncommon',
      weight: 0.25,
      items: [{ itemId: 'iron-ore', weight: 1.0, minAmount: 1, maxAmount: 4 }],
    },
    {
      id: 'rare',
      weight: 0.1,
      items: [{ itemId: 'magma-crystal', weight: 1.0, minAmount: 1, maxAmount: 2 }],
    },
    {
      id: 'legendary',
      weight: 0.05,
      items: [{ itemId: 'dragon-scale', weight: 1.0, minAmount: 1, maxAmount: 1 }],
    },
  ],
  biomePools: [],
};

describe('lootSetup', () => {
  describe('spawnChests', () => {
    it('returns correct number of chests', () => {
      const scene = makeScene();
      const result = spawnChests(scene as never, makeSurfaceY(), 48, 'test-seed', 5);
      expect(result.chests.length).toBe(5);
      expect(scene.add).toHaveBeenCalledTimes(5);
    });

    it('all chests start unopened', () => {
      const scene = makeScene();
      const result = spawnChests(scene as never, makeSurfaceY(), 48, 'test-seed', 4);
      for (const chest of result.chests) {
        expect(chest.opened).toBe(false);
      }
    });

    it('chests have valid positions above water level', () => {
      const scene = makeScene();
      const result = spawnChests(scene as never, makeSurfaceY(6), 48, 'test-seed', 5);
      for (const chest of result.chests) {
        expect(chest.position.y).toBeGreaterThan(2);
      }
    });

    it('places no chests when terrain is all water', () => {
      const scene = makeScene();
      const result = spawnChests(scene as never, makeWaterSurfaceY(), 48, 'test-seed', 5);
      expect(result.chests.length).toBe(0);
    });

    it('chests have valid tier values', () => {
      const scene = makeScene();
      const result = spawnChests(scene as never, makeSurfaceY(), 48, 'test-seed', 7);
      const validTiers = new Set(['wooden', 'iron', 'crystal']);
      for (const chest of result.chests) {
        expect(validTiers.has(chest.tier)).toBe(true);
      }
    });

    it('chest tiers vary based on distance from center', () => {
      const scene = makeScene();
      // Use a large island and many chests to increase chance of varied tiers
      const result = spawnChests(scene as never, makeSurfaceY(), 96, 'varied-seed', 15);
      const tiers = new Set(result.chests.map((c) => c.tier));
      // With 15 chests on a 96-size island, we should see multiple tiers
      expect(tiers.size).toBeGreaterThanOrEqual(2);
    });

    it('chests have unique IDs', () => {
      const scene = makeScene();
      const result = spawnChests(scene as never, makeSurfaceY(), 48, 'test-seed', 5);
      const ids = result.chests.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('cleanup removes all chest meshes from scene', () => {
      const scene = makeScene();
      const result = spawnChests(scene as never, makeSurfaceY(), 48, 'test-seed', 4);
      result.cleanup();
      expect(scene.remove).toHaveBeenCalledTimes(4);
    });

    it('produces deterministic results for same seed', () => {
      const scene1 = makeScene();
      const scene2 = makeScene();
      const result1 = spawnChests(scene1 as never, makeSurfaceY(), 48, 'deterministic-seed', 5);
      const result2 = spawnChests(scene2 as never, makeSurfaceY(), 48, 'deterministic-seed', 5);

      expect(result1.chests.length).toBe(result2.chests.length);
      for (let i = 0; i < result1.chests.length; i++) {
        expect(result1.chests[i].position.x).toBe(result2.chests[i].position.x);
        expect(result1.chests[i].position.z).toBe(result2.chests[i].position.z);
        expect(result1.chests[i].tier).toBe(result2.chests[i].tier);
      }
    });
  });

  describe('rollChestLoot', () => {
    it('returns items for wooden chest from common pool', () => {
      const items = rollChestLoot('wooden', 'loot-test', SAMPLE_LOOT_TABLES);
      expect(items.length).toBe(1); // Wooden has 1 pool: common
      expect(['wood', 'stone']).toContain(items[0].itemId);
      expect(items[0].amount).toBeGreaterThanOrEqual(3);
      expect(items[0].amount).toBeLessThanOrEqual(8);
    });

    it('returns items for iron chest from common and uncommon pools', () => {
      const items = rollChestLoot('iron', 'iron-test', SAMPLE_LOOT_TABLES);
      expect(items.length).toBe(2); // Iron has 2 pools: common + uncommon
    });

    it('returns items for crystal chest from three pools', () => {
      const items = rollChestLoot('crystal', 'crystal-test', SAMPLE_LOOT_TABLES);
      expect(items.length).toBe(3); // Crystal has 3 pools: uncommon + rare + legendary
    });

    it('returns empty array for unknown tier', () => {
      const items = rollChestLoot('mythic' as 'wooden', 'unknown-test', SAMPLE_LOOT_TABLES);
      expect(items.length).toBe(0);
    });

    it('produces deterministic results for same seed', () => {
      const items1 = rollChestLoot('wooden', 'same-seed', SAMPLE_LOOT_TABLES);
      const items2 = rollChestLoot('wooden', 'same-seed', SAMPLE_LOOT_TABLES);
      expect(items1).toEqual(items2);
    });

    it('item amounts are within configured min/max bounds', () => {
      // Run multiple rolls to check bounds
      for (let i = 0; i < 20; i++) {
        const items = rollChestLoot('wooden', `bounds-${i}`, SAMPLE_LOOT_TABLES);
        for (const item of items) {
          expect(item.amount).toBeGreaterThanOrEqual(1);
          expect(item.amount).toBeLessThanOrEqual(8);
        }
      }
    });
  });

  describe('checkChestInteraction', () => {
    function makeChest(x: number, z: number, tier: 'wooden' | 'iron' | 'crystal' = 'wooden'): ChestState {
      return {
        mesh: {
          children: [{ rotation: { x: 0 } }],
        } as never,
        position: {
          x,
          y: 5,
          z,
          distanceTo: (other: { x: number; y: number; z: number }) => {
            const dx = x - other.x;
            const dy = 5 - other.y;
            const dz = z - other.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
          },
        } as never,
        opened: false,
        tier,
        id: `chest-${x}-${z}`,
      };
    }

    function makePlayerPos(x: number, y: number, z: number) {
      return {
        x,
        y,
        z,
        distanceTo: (other: { x: number; y: number; z: number }) => {
          const dx = x - other.x;
          const dy = y - other.y;
          const dz = z - other.z;
          return Math.sqrt(dx * dx + dy * dy + dz * dz);
        },
      } as never;
    }

    it('returns null when player is far from chests', () => {
      const chests = [makeChest(20, 20)];
      const playerPos = makePlayerPos(0, 5, 0);
      const result = checkChestInteraction(playerPos, chests, SAMPLE_LOOT_TABLES, 'test');
      expect(result).toBeNull();
    });

    it('opens chest when player is within range', () => {
      const chests = [makeChest(10, 10)];
      const playerPos = makePlayerPos(10, 5, 10);
      const result = checkChestInteraction(playerPos, chests, SAMPLE_LOOT_TABLES, 'test');
      expect(result).not.toBeNull();
      expect(result?.chest.opened).toBe(true);
      expect(result?.items.length).toBeGreaterThan(0);
    });

    it('skips already opened chests', () => {
      const chest = makeChest(10, 10);
      chest.opened = true;
      const playerPos = makePlayerPos(10, 5, 10);
      const result = checkChestInteraction(playerPos, [chest], SAMPLE_LOOT_TABLES, 'test');
      expect(result).toBeNull();
    });

    it('only opens one chest per call (closest)', () => {
      const chests = [makeChest(10, 10), makeChest(10.5, 10)];
      const playerPos = makePlayerPos(10, 5, 10);
      const result = checkChestInteraction(playerPos, chests, SAMPLE_LOOT_TABLES, 'test');
      expect(result).not.toBeNull();
      // Only the first chest in the array that's in range gets opened
      const openedCount = chests.filter((c) => c.opened).length;
      expect(openedCount).toBe(1);
    });
  });
});
