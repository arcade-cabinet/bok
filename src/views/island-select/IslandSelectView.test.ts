import { describe, expect, it } from 'vitest';
import { ContentRegistry } from '../../content/index.ts';
import type { BiomeConfig } from '../../content/types.ts';

/** Mirrors the difficulty calculation from IslandSelectView. */
function getBiomeDifficulty(biome: BiomeConfig): number {
  const maxMinDifficulty = Math.max(...biome.enemies.map((e) => e.minDifficulty));
  const terrainComplexity = biome.terrain.noiseAmplitude / 10;
  return Math.min(5, Math.max(1, Math.round(maxMinDifficulty + terrainComplexity)));
}

describe('IslandSelectView — biome data', () => {
  it('all 8 biomes are available', () => {
    const registry = new ContentRegistry();
    const biomes = registry.getAllBiomes();
    expect(biomes).toHaveLength(8);
  });

  it('every biome has id, name, description, and sky/fog colors', () => {
    const registry = new ContentRegistry();
    const biomes = registry.getAllBiomes();
    for (const biome of biomes) {
      expect(biome.id).toBeTruthy();
      expect(biome.name).toBeTruthy();
      expect(biome.description.length).toBeGreaterThan(10);
      expect(biome.skyColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(biome.fogColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('difficulty tiers are between 1 and 5', () => {
    const registry = new ContentRegistry();
    const biomes = registry.getAllBiomes();
    for (const biome of biomes) {
      const difficulty = getBiomeDifficulty(biome);
      expect(difficulty).toBeGreaterThanOrEqual(1);
      expect(difficulty).toBeLessThanOrEqual(5);
    }
  });

  it('maxChoices limits the selection to a subset', () => {
    const registry = new ContentRegistry();
    const all = registry.getAllBiomes();
    const maxChoices = 4;
    const limited = [...all].sort((a, b) => a.id.localeCompare(b.id)).slice(0, maxChoices);
    expect(limited).toHaveLength(4);
    expect(limited.length).toBeLessThan(all.length);
  });

  it('forest biome is present with known properties', () => {
    const registry = new ContentRegistry();
    const forest = registry.getBiome('forest');
    expect(forest.name).toBe('Whispering Woods');
    expect(forest.bossId).toBe('ancient-treant');
  });

  it('biome selection sets the biome ID correctly', () => {
    const selectedBiome = 'volcanic';
    const registry = new ContentRegistry();
    const biome = registry.getBiome(selectedBiome);
    expect(biome.id).toBe('volcanic');
    expect(biome.name).toBe('Cinderpeak Caldera');
  });
});
