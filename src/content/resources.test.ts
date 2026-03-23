import { describe, expect, it } from 'vitest';
import { getResourceForBlock, getResourcesForBiome, getUniversalResources, RESOURCES } from './resources';

describe('resources', () => {
  it('all resource IDs are unique', () => {
    const ids = RESOURCES.map((r) => r.id);
    expect(new Set(ids).size).toBe(RESOURCES.length);
  });

  it('getResourceForBlock(3) returns stone', () => {
    const resource = getResourceForBlock(3);
    expect(resource).not.toBeNull();
    expect(resource?.id).toBe('stone');
    expect(resource?.name).toBe('Stone');
  });

  it('getResourceForBlock(6) returns wood', () => {
    const resource = getResourceForBlock(6);
    expect(resource).not.toBeNull();
    expect(resource?.id).toBe('wood');
  });

  it('getResourceForBlock(30) returns obsidian', () => {
    const resource = getResourceForBlock(30);
    expect(resource).not.toBeNull();
    expect(resource?.id).toBe('obsidian');
  });

  it('getResourceForBlock(0) returns null (air)', () => {
    expect(getResourceForBlock(0)).toBeNull();
  });

  it('getResourceForBlock returns null for unmapped block IDs', () => {
    expect(getResourceForBlock(999)).toBeNull();
    expect(getResourceForBlock(-1)).toBeNull();
  });

  it('all biomes have at least 2 exclusive resources', () => {
    const biomes = ['forest', 'desert', 'tundra', 'volcanic', 'swamp', 'crystal-caves', 'sky-ruins', 'deep-ocean'];
    for (const biome of biomes) {
      const exclusive = getResourcesForBiome(biome);
      expect(exclusive.length, `biome "${biome}" should have >= 2 exclusive resources`).toBeGreaterThanOrEqual(2);
    }
  });

  it('each biome has exactly 3 exclusive resources', () => {
    const biomes = ['forest', 'desert', 'tundra', 'volcanic', 'swamp', 'crystal-caves', 'sky-ruins', 'deep-ocean'];
    for (const biome of biomes) {
      const exclusive = getResourcesForBiome(biome);
      expect(exclusive.length, `biome "${biome}" should have 3 exclusive resources`).toBe(3);
    }
  });

  it('universal resources have empty biomes array', () => {
    const universal = getUniversalResources();
    expect(universal.length).toBeGreaterThan(0);
    for (const resource of universal) {
      expect(resource.biomes).toHaveLength(0);
    }
  });

  it('no two resources share the same fromBlock ID', () => {
    const seen = new Map<number, string>();
    for (const resource of RESOURCES) {
      for (const blockId of resource.fromBlocks) {
        expect(
          seen.has(blockId),
          `Block ID ${blockId} claimed by both "${seen.get(blockId)}" and "${resource.id}"`,
        ).toBe(false);
        seen.set(blockId, resource.id);
      }
    }
  });

  it('all resources have non-empty name and icon', () => {
    for (const resource of RESOURCES) {
      expect(resource.name, `resource "${resource.id}" should have a name`).toBeTruthy();
      expect(resource.icon, `resource "${resource.id}" should have an icon`).toBeTruthy();
    }
  });

  it('getResourcesForBiome returns only resources for that biome', () => {
    const forestResources = getResourcesForBiome('forest');
    for (const r of forestResources) {
      expect(r.biomes).toContain('forest');
    }
  });

  it('sand drops from multiple block IDs (5 and 10)', () => {
    const sand5 = getResourceForBlock(5);
    const sand10 = getResourceForBlock(10);
    expect(sand5).not.toBeNull();
    expect(sand10).not.toBeNull();
    expect(sand5?.id).toBe('sand');
    expect(sand10?.id).toBe('sand');
  });
});
