import { describe, it, expect } from 'vitest';
import { TerrainBuilder } from './TerrainBuilder';
import type { BiomeConfig } from '../content/types';

const FOREST_BIOME: BiomeConfig = {
  id: 'forest',
  name: 'Test Forest',
  description: 'test',
  terrain: {
    noiseOctaves: 3,
    noiseFrequency: 0.03,
    noiseAmplitude: 8,
    waterLevel: 3,
    baseHeight: 5,
    blocks: { surface: 1, subsurface: 2, stone: 3, water: 4, accent: 5 },
  },
  enemies: [{ enemyId: 'slime', weight: 0.6, minDifficulty: 1 }],
  bossId: 'ancient-treant',
  music: 'music/test.ogg',
  ambience: 'sfx/test.ogg',
  skyColor: '#87CEEB',
  fogColor: '#2d5a27',
  fogDensity: 0.015,
};

describe('TerrainBuilder', () => {
  it('produces same heightmap from same seed', () => {
    const a = TerrainBuilder.generate(FOREST_BIOME, 'seed-42', 64);
    const b = TerrainBuilder.generate(FOREST_BIOME, 'seed-42', 64);
    expect(a.width).toBe(b.width);
    expect(a.depth).toBe(b.depth);
    expect(a.heightmap).toEqual(b.heightmap);
    expect(a.blocks).toEqual(b.blocks);
  });

  it('produces different heightmap from different seed', () => {
    const a = TerrainBuilder.generate(FOREST_BIOME, 'seed-A', 32);
    const b = TerrainBuilder.generate(FOREST_BIOME, 'seed-B', 32);
    // Extremely unlikely that two different seeds produce identical output
    expect(a.heightmap).not.toEqual(b.heightmap);
  });

  it('outputs correct dimensions', () => {
    const result = TerrainBuilder.generate(FOREST_BIOME, 'dim-test', 48);
    expect(result.width).toBe(48);
    expect(result.depth).toBe(48);
    expect(result.heightmap).toHaveLength(48);
    expect(result.heightmap[0]).toHaveLength(48);
  });

  it('heightmap values are non-negative integers', () => {
    const result = TerrainBuilder.generate(FOREST_BIOME, 'int-check', 32);
    for (const row of result.heightmap) {
      for (const h of row) {
        expect(h).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(h)).toBe(true);
      }
    }
  });

  it('block data dimensions match heightmap', () => {
    const size = 32;
    const result = TerrainBuilder.generate(FOREST_BIOME, 'blocks', size);
    expect(result.blocks).toHaveLength(size);
    for (const slice of result.blocks) {
      expect(slice).toHaveLength(size);
    }
  });
});
