import { describe, expect, it } from 'vitest';
import { deriveIslandSeed } from './islandSeed';

describe('deriveIslandSeed', () => {
  it('combines base seed with biome ID', () => {
    expect(deriveIslandSeed('abc', 'forest')).toBe('abc:forest');
  });

  it('produces different seeds for different biomes', () => {
    const forestSeed = deriveIslandSeed('player-seed', 'forest');
    const desertSeed = deriveIslandSeed('player-seed', 'desert');
    const tundraSeed = deriveIslandSeed('player-seed', 'tundra');

    expect(forestSeed).not.toBe(desertSeed);
    expect(forestSeed).not.toBe(tundraSeed);
    expect(desertSeed).not.toBe(tundraSeed);
  });

  it('produces different seeds for different base seeds', () => {
    const seed1 = deriveIslandSeed('seed-one', 'forest');
    const seed2 = deriveIslandSeed('seed-two', 'forest');

    expect(seed1).not.toBe(seed2);
  });

  it('is deterministic — same inputs always produce the same output', () => {
    const a = deriveIslandSeed('Brave Dark Fox', 'crystal-caves');
    const b = deriveIslandSeed('Brave Dark Fox', 'crystal-caves');

    expect(a).toBe(b);
  });

  it('handles empty biome ID', () => {
    const result = deriveIslandSeed('seed', '');
    expect(result).toBe('seed:');
  });

  it('handles seeds with special characters', () => {
    const result = deriveIslandSeed('seed:with:colons', 'forest');
    expect(result).toBe('seed:with:colons:forest');
  });
});
