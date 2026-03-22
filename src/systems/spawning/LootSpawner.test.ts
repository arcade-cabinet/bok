import { describe, expect, it } from 'vitest';
import type { ChestPlacement } from '../../generation/LootPlacer';
import { LootSpawner } from './LootSpawner';

describe('LootSpawner', () => {
  it('spawns chests matching input placements', () => {
    const chests: ChestPlacement[] = [
      { position: { x: 10, y: 5, z: 20 }, tier: 1 },
      { position: { x: 30, y: 8, z: 15 }, tier: 2 },
      { position: { x: 50, y: 12, z: 40 }, tier: 3 },
    ];

    const result = LootSpawner.spawn(chests);
    expect(result).toHaveLength(3);
  });

  it('preserves position from chest placement', () => {
    const chests: ChestPlacement[] = [{ position: { x: 10, y: 5, z: 20 }, tier: 1 }];

    const [chest] = LootSpawner.spawn(chests);
    expect(chest.position).toEqual({ x: 10, y: 5, z: 20 });
  });

  it('preserves tier from chest placement', () => {
    const chests: ChestPlacement[] = [{ position: { x: 0, y: 0, z: 0 }, tier: 3 }];

    const [chest] = LootSpawner.spawn(chests);
    expect(chest.tier).toBe(3);
  });

  it('returns empty array for empty input', () => {
    const result = LootSpawner.spawn([]);
    expect(result).toHaveLength(0);
  });

  it('maps each placement to exactly one spawned chest', () => {
    const chests: ChestPlacement[] = [
      { position: { x: 1, y: 1, z: 1 }, tier: 1 },
      { position: { x: 2, y: 2, z: 2 }, tier: 2 },
    ];

    const result = LootSpawner.spawn(chests);
    expect(result[0].position).toEqual({ x: 1, y: 1, z: 1 });
    expect(result[0].tier).toBe(1);
    expect(result[1].position).toEqual({ x: 2, y: 2, z: 2 });
    expect(result[1].tier).toBe(2);
  });
});
