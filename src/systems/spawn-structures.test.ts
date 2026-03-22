import { describe, expect, it } from 'vitest';
import { generateStructurePlacements, getShrineLandmarks } from './spawn-structures';

/** Stub surface height: flat terrain at y=5. */
const flatSurface = (_x: number, _z: number) => 5;

/** Stub surface height: underwater (should skip placement). */
const underwaterSurface = (_x: number, _z: number) => 2;

describe('generateStructurePlacements', () => {
  it('returns placements for a valid biome', () => {
    const result = generateStructurePlacements('test-seed', 'forest', -30, -30, 30, 30, flatSurface, 4);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown biome', () => {
    const result = generateStructurePlacements('test-seed', 'nonexistent-biome', -30, -30, 30, 30, flatSurface, 4);
    expect(result).toEqual([]);
  });

  it('filters templates by biome', () => {
    // 'desert' should only get templates that list 'desert' in their biomes
    const result = generateStructurePlacements('biome-filter', 'desert', -30, -30, 30, 30, flatSurface, 10);
    for (const placement of result) {
      expect(placement.template.biomes).toContain('desert');
    }
  });

  it('respects spacing constraint — no two structures within 15 units', () => {
    const result = generateStructurePlacements('spacing-test', 'forest', -50, -50, 50, 50, flatSurface, 20);
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const dx = Math.abs(result[i].worldX - result[j].worldX);
        const dz = Math.abs(result[i].worldZ - result[j].worldZ);
        // At least one axis must be >= 15
        expect(dx >= 15 || dz >= 15).toBe(true);
      }
    }
  });

  it('skips water positions (y <= 3)', () => {
    const result = generateStructurePlacements('water-test', 'forest', -30, -30, 30, 30, underwaterSurface, 10);
    expect(result).toEqual([]);
  });

  it('is deterministic — same seed produces same placements', () => {
    const a = generateStructurePlacements('deterministic', 'forest', -30, -30, 30, 30, flatSurface, 4);
    const b = generateStructurePlacements('deterministic', 'forest', -30, -30, 30, 30, flatSurface, 4);
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].worldX).toBe(b[i].worldX);
      expect(a[i].worldZ).toBe(b[i].worldZ);
      expect(a[i].template.id).toBe(b[i].template.id);
    }
  });

  it('different seeds produce different placements', () => {
    const a = generateStructurePlacements('seed-A', 'forest', -30, -30, 30, 30, flatSurface, 4);
    const b = generateStructurePlacements('seed-B', 'forest', -30, -30, 30, 30, flatSurface, 4);
    // At least one placement should differ (extremely unlikely for identical PRNG output)
    const identical = a.length === b.length && a.every((p, i) => p.worldX === b[i].worldX && p.worldZ === b[i].worldZ);
    expect(identical).toBe(false);
  });

  it('each placement has a valid template with pieces', () => {
    const result = generateStructurePlacements('validate', 'forest', -30, -30, 30, 30, flatSurface, 6);
    for (const p of result) {
      expect(p.template).toBeDefined();
      expect(p.template.id).toBeTruthy();
      expect(p.template.pieces.length).toBeGreaterThan(0);
      expect(typeof p.worldX).toBe('number');
      expect(typeof p.worldZ).toBe('number');
    }
  });

  it('respects count parameter', () => {
    // With count=1, at most 1 structure
    const result = generateStructurePlacements('count-test', 'forest', -30, -30, 30, 30, flatSurface, 1);
    expect(result.length).toBeLessThanOrEqual(1);
  });
});

describe('getShrineLandmarks', () => {
  it('extracts shrine positions from placements', () => {
    const placements = generateStructurePlacements('shrine-test', 'forest', -50, -50, 50, 50, flatSurface, 20);
    const shrines = getShrineLandmarks(placements);
    // Every returned landmark must correspond to a shrine template
    for (const shrine of shrines) {
      const match = placements.find(
        (p) => p.template.id === 'shrine' && p.worldX === shrine.x && p.worldZ === shrine.z,
      );
      expect(match).toBeDefined();
    }
  });

  it('returns empty array when no shrines are placed', () => {
    // deep-ocean has templates but shrine may or may not appear — use a biome that guarantees no shrines
    // Actually shrine is in all biomes, so we just test with an empty placements array
    const shrines = getShrineLandmarks([]);
    expect(shrines).toEqual([]);
  });

  it('only includes shrine templates, not other structures', () => {
    const placements = generateStructurePlacements('shrine-filter', 'forest', -50, -50, 50, 50, flatSurface, 20);
    const shrines = getShrineLandmarks(placements);
    const nonShrineCount = placements.filter((p) => p.template.id !== 'shrine').length;
    // Shrines count + non-shrine count should equal total
    expect(shrines.length + nonShrineCount).toBe(placements.length);
  });
});
