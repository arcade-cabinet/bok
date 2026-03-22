import { describe, expect, it } from 'vitest';
import { ALL_BIOME_IDS, BIOME_PROPS, generatePropPlacements } from './spawn-props';

/** Stub surface height: flat terrain at y=5. */
const flatSurface = (_x: number, _z: number) => 5;

describe('BIOME_PROPS', () => {
  it('has entries for every biome ID', () => {
    for (const biomeId of ALL_BIOME_IDS) {
      expect(BIOME_PROPS[biomeId]).toBeDefined();
      expect(Array.isArray(BIOME_PROPS[biomeId])).toBe(true);
    }
  });

  it('covers all 8 biomes', () => {
    expect(ALL_BIOME_IDS).toHaveLength(8);
    expect(Object.keys(BIOME_PROPS)).toHaveLength(8);
  });

  it('every prop config has a non-empty modelFile', () => {
    for (const [biomeId, configs] of Object.entries(BIOME_PROPS)) {
      for (const cfg of configs) {
        expect(cfg.modelFile, `${biomeId} has empty modelFile`).toBeTruthy();
      }
    }
  });

  it('every prop config has density in (0, 1]', () => {
    for (const [biomeId, configs] of Object.entries(BIOME_PROPS)) {
      for (const cfg of configs) {
        expect(cfg.density, `${biomeId}/${cfg.modelFile} density`).toBeGreaterThan(0);
        expect(cfg.density, `${biomeId}/${cfg.modelFile} density`).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('generatePropPlacements', () => {
  it('returns an array of placements', () => {
    const result = generatePropPlacements('test-seed', 'forest', 0, 0, 20, 20, flatSurface);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown biome', () => {
    const result = generatePropPlacements('test-seed', 'nonexistent', 0, 0, 20, 20, flatSurface);
    expect(result).toEqual([]);
  });

  it('placements use surface height from callback', () => {
    const heightAt10 = (_x: number, _z: number) => 10;
    const result = generatePropPlacements('test-seed', 'forest', 0, 0, 10, 10, heightAt10);
    for (const p of result) {
      expect(p.y).toBe(10);
    }
  });

  it('is deterministic — same seed produces same placements', () => {
    const a = generatePropPlacements('deterministic', 'forest', 0, 0, 16, 16, flatSurface);
    const b = generatePropPlacements('deterministic', 'forest', 0, 0, 16, 16, flatSurface);
    expect(a).toEqual(b);
  });

  it('different seeds produce different placements', () => {
    const a = generatePropPlacements('seed-A', 'forest', 0, 0, 30, 30, flatSurface);
    const b = generatePropPlacements('seed-B', 'forest', 0, 0, 30, 30, flatSurface);
    // Extremely unlikely to match — check at least one difference
    const same = a.length === b.length && a.every((p, i) => p.x === b[i].x && p.z === b[i].z);
    expect(same).toBe(false);
  });

  it('respects spacing parameter', () => {
    const tight = generatePropPlacements('test', 'forest', 0, 0, 20, 20, flatSurface, 1);
    const loose = generatePropPlacements('test', 'forest', 0, 0, 20, 20, flatSurface, 4);
    // Tighter spacing should generally produce more candidates (and thus more placements)
    expect(tight.length).toBeGreaterThanOrEqual(loose.length);
  });

  it('each placement has valid fields', () => {
    const result = generatePropPlacements('validate', 'volcanic', 0, 0, 20, 20, flatSurface);
    for (const p of result) {
      expect(p.modelFile).toBeTruthy();
      expect(typeof p.x).toBe('number');
      expect(typeof p.y).toBe('number');
      expect(typeof p.z).toBe('number');
      expect(p.rotationY).toBeGreaterThanOrEqual(0);
      expect(p.rotationY).toBeLessThan(Math.PI * 2);
      expect(p.scale).toBeGreaterThan(0);
    }
  });

  it('biomes with few props still produce placements', () => {
    // sky-ruins has only 2 props with low density — use a bigger area
    const result = generatePropPlacements('test', 'sky-ruins', 0, 0, 100, 100, flatSurface);
    expect(result.length).toBeGreaterThan(0);
  });
});
