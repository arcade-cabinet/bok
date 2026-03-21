import { describe, expect, it } from 'vitest';
import { ContentRegistry } from './index';

describe('ContentRegistry', () => {
  it('loads and validates a biome config', () => {
    const registry = new ContentRegistry();
    const biome = registry.getBiome('forest');
    expect(biome.id).toBe('forest');
    expect(biome.terrain.noiseOctaves).toBe(3);
    expect(biome.enemies.length).toBeGreaterThan(0);
  });

  it('loads and validates an enemy config', () => {
    const registry = new ContentRegistry();
    const enemy = registry.getEnemy('slime');
    expect(enemy.id).toBe('slime');
    expect(enemy.health).toBeGreaterThan(0);
  });

  it('loads and validates a weapon config', () => {
    const registry = new ContentRegistry();
    const weapon = registry.getWeapon('wooden-sword');
    expect(weapon.id).toBe('wooden-sword');
    expect(weapon.baseDamage).toBeGreaterThan(0);
    expect(weapon.combo).toHaveLength(3);
  });

  it('throws on unknown content ID', () => {
    const registry = new ContentRegistry();
    expect(() => registry.getBiome('nonexistent')).toThrow();
  });
});
