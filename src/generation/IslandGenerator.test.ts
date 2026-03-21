import { describe, expect, it } from 'vitest';
import type { BiomeConfig } from '../content/index';
import { IslandGenerator } from './IslandGenerator';

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

describe('IslandGenerator', () => {
  it('generates a valid blueprint with all required fields', () => {
    const blueprint = IslandGenerator.generate(FOREST_BIOME, 'island-seed', 1);
    expect(blueprint.biomeId).toBe('forest');
    expect(blueprint.seed).toBe('island-seed');
    expect(blueprint.difficulty).toBe(1);
    expect(blueprint.terrain).toBeDefined();
    expect(blueprint.terrain.heightmap.length).toBeGreaterThan(0);
  });

  it('includes spawn points', () => {
    const blueprint = IslandGenerator.generate(FOREST_BIOME, 'spawn-test', 1);
    expect(blueprint.playerSpawn).toBeDefined();
    expect(blueprint.playerSpawn.x).toBeGreaterThanOrEqual(0);
    expect(blueprint.playerSpawn.z).toBeGreaterThanOrEqual(0);
    expect(blueprint.enemySpawns.length).toBeGreaterThan(0);
  });

  it('includes boss arena location', () => {
    const blueprint = IslandGenerator.generate(FOREST_BIOME, 'boss-test', 1);
    expect(blueprint.bossArena).toBeDefined();
    expect(blueprint.bossArena.x).toBeGreaterThanOrEqual(0);
    expect(blueprint.bossArena.z).toBeGreaterThanOrEqual(0);
  });

  it('includes chest positions', () => {
    const blueprint = IslandGenerator.generate(FOREST_BIOME, 'chest-test', 1);
    expect(blueprint.chestPositions.length).toBeGreaterThan(0);
    for (const chest of blueprint.chestPositions) {
      expect(chest.position.x).toBeGreaterThanOrEqual(0);
      expect(chest.position.z).toBeGreaterThanOrEqual(0);
    }
  });

  it('is deterministic — same inputs produce same blueprint', () => {
    const a = IslandGenerator.generate(FOREST_BIOME, 'det-test', 2);
    const b = IslandGenerator.generate(FOREST_BIOME, 'det-test', 2);
    expect(a.terrain.heightmap).toEqual(b.terrain.heightmap);
    expect(a.playerSpawn).toEqual(b.playerSpawn);
    expect(a.enemySpawns).toEqual(b.enemySpawns);
    expect(a.chestPositions).toEqual(b.chestPositions);
    expect(a.bossArena).toEqual(b.bossArena);
  });

  it('higher difficulty produces more enemy spawns', () => {
    const low = IslandGenerator.generate(FOREST_BIOME, 'diff-test', 1);
    const high = IslandGenerator.generate(FOREST_BIOME, 'diff-test', 5);
    expect(high.enemySpawns.length).toBeGreaterThanOrEqual(low.enemySpawns.length);
  });
});
